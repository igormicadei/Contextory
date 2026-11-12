"""Bounded static Python call/control-flow extraction. Input contains source text only.

Runs under python -I: no workspace imports, execution, dependencies or network.
Dynamic dispatch is a boundary, not an invented edge.
"""
import ast
import json
import sys
import time
import uuid

if sys.version_info < (3, 10):
    json.dump({"error": {"code": "PYTHON_REQUIRED", "message": "Python 3.10+ is required; configure contextory.pythonExecutable."}}, sys.stdout)
    sys.exit(0)


class Analysis:
    def __init__(self, payload):
        self.started = time.monotonic()
        self.input = payload["input"]
        self.files = payload["files"]
        self.limits = payload["limits"]
        self.modules = {}
        self.functions = {}
        self.classes = set()
        self.trees = {}
        self.aliases = {}
        self.queue = []
        self.expanded = set()
        self.fn_nodes = {}
        self.graph = dict(id=str(uuid.uuid4()), snapshotId=payload["snapshotId"],
                          root=self.input["root"], view=self.input.get("view", "calls"),
                          engine="python-ast-" + sys.version.split()[0], nodes=[], edges=[],
                          frontier=[], gaps=payload.get("gaps", []), limits=self.limits,
                          partial=bool(payload.get("gaps")), unsaved=bool(self.input.get("overlays")), durationMs=0)
        self.edge_keys = set()
        for path in self.files:
            module = path[:-3].replace("/", ".")
            if module.endswith(".__init__"):
                module = module[:-9]
            self.modules[module] = path
            # Common src/ layout, resolved only when unambiguous.
            if module.startswith("src."):
                self.modules.setdefault(module[4:], path)
        for path, text in self.files.items():
            if not self.budget():
                break
            try:
                tree = ast.parse(text, filename=path)
            except SyntaxError as error:
                if path == self.input["root"]["path"]:
                    raise ValueError(f"Python syntax error at line {error.lineno}: {error.msg}")
                self.gap(f"Syntax error in {path}; its callers/targets are unavailable.")
                continue
            self.trees[path] = tree
            self.collect(path, tree.body, "", None)
        for key, fn in self.functions.items():
            self.aliases[key] = self.bindings(fn["path"], fn["node"].body)
        for path, tree in self.trees.items():
            self.aliases[path + ":"] = self.bindings(path, tree.body)

    def gap(self, message):
        if message not in self.graph["gaps"]:
            self.graph["gaps"].append(message)
        self.graph["partial"] = True

    def budget(self):
        if (time.monotonic() - self.started) * 1000 > self.limits["timeoutMs"]:
            self.gap("Python analysis reached its time limit; graph is partial.")
            return False
        return True

    def collect(self, path, body, scope, cls):
        for node in body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                qual = scope + node.name
                key = path + ":" + qual
                self.functions[key] = dict(path=path, qual=qual, node=node, cls=cls, scope=scope)
                self.collect(path, node.body, qual + ".", cls)
            elif isinstance(node, ast.ClassDef):
                qual = scope + node.name
                self.classes.add(path + ":" + qual)
                self.collect(path, node.body, qual + ".", qual)
            else:
                for field in ("body", "orelse", "finalbody"):
                    nested = getattr(node, field, None)
                    if isinstance(nested, list):
                        self.collect(path, nested, scope, cls)
                for handler in getattr(node, "handlers", []):
                    self.collect(path, handler.body, scope, cls)

    def import_target(self, path, module, level=0):
        if level:
            parts = path[:-3].split("/")[:-1]
            parts = parts[:max(0, len(parts) - level + 1)]
            module = ".".join(parts + ([module] if module else []))
        return self.modules.get(module)

    def bindings(self, path, body):
        bindings = {}
        def put(name, value):
            bindings[name] = value if name not in bindings or bindings[name] == value else None
        def scan(nodes):
            for node in nodes:
                if isinstance(node, ast.Import):
                    for a in node.names:
                        put(a.asname or a.name.split(".")[0], ("module", a.name if a.asname else a.name.split(".")[0]))
                elif isinstance(node, ast.ImportFrom):
                    target = self.import_target(path, node.module or "", node.level)
                    for a in node.names:
                        if a.name == "*":
                            continue
                        put(a.asname or a.name, ("symbol", target + ":" + a.name) if target else None)
                elif isinstance(node, (ast.Assign, ast.AnnAssign)):
                    value = node.value
                    targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                    for target in targets:
                        if isinstance(target, ast.Name):
                            put(target.id, ("instance" if isinstance(value, ast.Call) else "alias", ast.unparse(value.func if isinstance(value, ast.Call) else value)) if value else None)
                elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                    continue
                else:
                    for field in ("body", "orelse", "finalbody"):
                        nested = getattr(node, field, None)
                        if isinstance(nested, list):
                            scan(nested)
                    for handler in getattr(node, "handlers", []):
                        scan(handler.body)
        scan(body)
        return bindings

    def resolve(self, fn, name, seen=None):
        seen = set() if seen is None else seen
        if name in seen:
            return None
        seen.add(name)
        path, qual = fn["path"], fn["qual"]
        parts = name.split(".")
        if parts[0] in ("self", "cls") and fn["cls"]:
            return path + ":" + fn["cls"] + "." + ".".join(parts[1:])
        parameters = fn["node"].args
        if parts[0] in [a.arg for a in parameters.posonlyargs + parameters.args + parameters.kwonlyargs] or any(a and a.arg == parts[0] for a in [parameters.vararg, parameters.kwarg]):
            return None
        scopes = [qual] + [".".join(qual.split(".")[:i]) for i in range(len(qual.split(".")) - 1, -1, -1)]
        for scope in scopes:
            local = self.aliases.get(path + ":" + scope, {})
            if parts[0] in local:
                binding = local[parts[0]]
                if not binding:
                    return None
                kind, value = binding
                suffix = ".".join(parts[1:])
                if kind == "module":
                    full = value + ("." + suffix if suffix else "")
                    for i in range(len(full.split(".")), 0, -1):
                        prefix = ".".join(full.split(".")[:i])
                        if prefix in self.modules:
                            return self.modules[prefix] + ":" + ".".join(full.split(".")[i:])
                if kind == "symbol":
                    return value + ("." + suffix if suffix else "")
                target = self.resolve(fn, value, seen)
                return target + ("." + suffix if suffix else "") if target else None
            prefix = scope + "." if scope else ""
            key = path + ":" + prefix + name
            if key in self.functions or key in self.classes:
                return key
        return None

    def ref(self, fn, node):
        return dict(path=fn["path"], line=getattr(node, "lineno", 1) - 1,
                    character=getattr(node, "col_offset", 0), symbol=fn["qual"])

    def node(self, kind, label, fn, source, depth):
        if not self.budget() or len(self.graph["nodes"]) >= self.limits["nodes"]:
            self.gap("Node or time limit reached; trace from a frontier to continue.")
            return None
        ident = "py-" + str(len(self.graph["nodes"]))
        self.graph["nodes"].append(dict(id=ident, kind=kind, label=label[:300], source=self.ref(fn, source), depth=depth))
        return ident

    def edge(self, source, target, kind="next", label=None):
        if not source or not target:
            return
        key = (source, target, kind, label)
        if key in self.edge_keys:
            return
        if len(self.graph["edges"]) >= self.limits["edges"]:
            self.gap("Edge limit reached.")
            return
        self.edge_keys.add(key)
        edge = dict(id="pe-" + str(len(self.graph["edges"])), **{"from": source, "to": target}, kind=kind)
        if label:
            edge["label"] = label
        self.graph["edges"].append(edge)

    def frontier(self, node, reason, target=None):
        self.graph["partial"] = True
        if node and not any(f["nodeId"] == node and f["reason"] == reason for f in self.graph["frontier"]):
            item = dict(nodeId=node, reason=reason, handle=node)
            if target:
                item["target"] = target
            self.graph["frontier"].append(item)

    def function(self, key, depth, ancestors):
        if key in self.fn_nodes:
            return self.fn_nodes[key]
        fn = self.functions[key]
        node = self.node("function", fn["qual"], fn, fn["node"], depth)
        if node:
            self.fn_nodes[key] = node
            self.queue.append((key, depth, ancestors))
        return node

    def calls(self, expr):
        if isinstance(expr, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)):
            return []
        result = []
        for child in ast.iter_child_nodes(expr):
            result.extend(self.calls(child))
        if isinstance(expr, ast.Call):
            result.append(expr)
        return result

    def call(self, fn, call, depth, ancestors, previous=None, targets=None):
        name = ast.unparse(call.func)
        node = self.node("call", ast.unparse(call), fn, call, depth)
        self.edge(previous, node)
        if targets:
            self.edge(node, targets["throw"], "exception", "may raise")
        key = self.resolve(fn, name)
        if key in self.classes:
            key = key + ".__init__"
        if key in self.functions:
            if depth >= self.limits["callDepth"]:
                fn_target = self.functions[key]
                self.frontier(node, "Call depth limit; trace from this call to continue.", dict(path=fn_target["path"], symbol=fn_target["qual"], start="function"))
            else:
                target = self.function(key, depth + 1, ancestors + [key])
                self.edge(node, target, "calls", "recursion" if key in ancestors else "calls")
                if key in ancestors:
                    self.frontier(node, "Recursive call; cycle is linked without unfolding.")
        else:
            self.frontier(node, f"Unresolved or external target: {name}. Dynamic dispatch is not inferred.")
        return node

    def expr(self, fn, expr, previous, depth, ancestors, targets):
        for call in self.calls(expr):
            previous = self.call(fn, call, depth, ancestors, previous, targets) or previous
        if any(isinstance(n, (ast.BoolOp, ast.IfExp, ast.comprehension, ast.GeneratorExp, ast.Yield, ast.YieldFrom)) for n in ast.walk(expr)):
            self.gap("Short-circuit expressions, comprehensions and generator suspension are shown as possible calls, without expression-level path ordering.")
        return previous

    def sequence(self, fn, body, previous, depth, ancestors, targets):
        for stmt in body:
            if not previous or not self.budget():
                break
            if isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                continue
            if isinstance(stmt, ast.If):
                previous = self.expr(fn, stmt.test, previous, depth, ancestors, targets)
                branch = self.node("branch", "if " + ast.unparse(stmt.test), fn, stmt, depth)
                self.edge(previous, branch)
                join = self.node("statement", "after if", fn, stmt, depth)
                for label, body in (("true", stmt.body), ("false", stmt.orelse)):
                    entry = self.node("statement", label, fn, stmt, depth)
                    self.edge(branch, entry, "branch", label)
                    self.edge(self.sequence(fn, body, entry, depth, ancestors, targets), join)
                previous = join
            elif isinstance(stmt, (ast.For, ast.AsyncFor, ast.While)):
                test = stmt.test if isinstance(stmt, ast.While) else stmt.iter
                if not isinstance(stmt, ast.While):
                    previous = self.expr(fn, test, previous, depth, ancestors, targets)
                loop = self.node("loop", ast.unparse(stmt).split("\n")[0], fn, stmt, depth)
                self.edge(previous, loop)
                test_end = self.expr(fn, test, loop, depth, ancestors, targets) if isinstance(stmt, ast.While) else loop
                after = self.node("statement", "after loop", fn, stmt, depth)
                entry = self.node("statement", "loop body", fn, stmt, depth)
                self.edge(test_end, entry, "branch", "next / true")
                tail = self.sequence(fn, stmt.body, entry, depth, ancestors, {**targets, "break": after, "continue": loop})
                self.edge(tail, loop, "loop", "repeat")
                exhausted = self.node("statement", "loop exhausted", fn, stmt, depth)
                self.edge(test_end, exhausted, "branch", "done / false")
                self.edge(self.sequence(fn, stmt.orelse, exhausted, depth, ancestors, targets), after)
                previous = after
            elif isinstance(stmt, (ast.Try, getattr(ast, "TryStar", ast.Try))):
                begin = self.node("branch", "try", fn, stmt, depth)
                self.edge(previous, begin)
                after = self.node("statement", "after try", fn, stmt, depth)
                def final_route(destination, label):
                    if not stmt.finalbody:
                        return destination
                    entry = self.node("statement", "finally (" + label + ")", fn, stmt.finalbody[0], depth)
                    tail = self.sequence(fn, stmt.finalbody, entry, depth, ancestors, targets)
                    self.edge(tail, destination, "finally", label)
                    return entry
                inner = {k: final_route(v, k) for k, v in targets.items()}
                normal = final_route(after, "normal")
                dispatch = self.node("branch", "exception handlers", fn, stmt, depth) if stmt.handlers else inner["throw"]
                body_end = self.sequence(fn, stmt.body, begin, depth, ancestors, {**inner, "throw": dispatch})
                else_end = self.sequence(fn, stmt.orelse, body_end, depth, ancestors, inner)
                self.edge(else_end, normal)
                for handler in stmt.handlers:
                    entry = self.node("statement", "except " + (ast.unparse(handler.type) if handler.type else "all"), fn, handler, depth)
                    self.edge(dispatch, entry, "exception", "possible match")
                    self.edge(self.sequence(fn, handler.body, entry, depth, ancestors, inner), normal)
                if stmt.handlers and all(h.type for h in stmt.handlers):
                    self.edge(dispatch, inner["throw"], "exception", "unmatched")
                self.gap("Exception handler type matching is conservative; implicit exceptions outside explicit calls/raises may be omitted.")
                previous = after
            elif isinstance(stmt, ast.Match):
                previous = self.expr(fn, stmt.subject, previous, depth, ancestors, targets)
                branch = self.node("branch", "match " + ast.unparse(stmt.subject), fn, stmt, depth)
                self.edge(previous, branch)
                after = self.node("statement", "after match", fn, stmt, depth)
                for case in stmt.cases:
                    entry = self.node("branch", "case " + ast.unparse(case.pattern), fn, case.pattern, depth)
                    self.edge(branch, entry, "branch", "possible match")
                    if case.guard:
                        entry = self.expr(fn, case.guard, entry, depth, ancestors, targets)
                    self.edge(self.sequence(fn, case.body, entry, depth, ancestors, targets), after)
                self.edge(branch, after, "branch", "no match")
                previous = after
            elif isinstance(stmt, (ast.With, ast.AsyncWith)):
                for item in stmt.items:
                    previous = self.expr(fn, item.context_expr, previous, depth, ancestors, targets)
                previous = self.sequence(fn, stmt.body, previous, depth, ancestors, targets)
                self.gap("Context-manager enter/exit dispatch and exception suppression are dynamic boundaries.")
            else:
                previous = self.expr(fn, stmt, previous, depth, ancestors, targets)
                terminal = isinstance(stmt, (ast.Return, ast.Raise, ast.Break, ast.Continue))
                kind = "return" if isinstance(stmt, ast.Return) else "throw" if isinstance(stmt, ast.Raise) else "statement"
                node = self.node(kind, ast.unparse(stmt), fn, stmt, depth)
                self.edge(previous, node)
                if terminal:
                    target = "return" if isinstance(stmt, ast.Return) else "throw" if isinstance(stmt, ast.Raise) else "break" if isinstance(stmt, ast.Break) else "continue"
                    self.edge(node, targets.get(target), target)
                    previous = None
                else:
                    previous = node
        return previous

    def trace(self):
        root = self.input["root"]
        candidates = [(k, f) for k, f in self.functions.items() if f["path"] == root["path"]]
        if root.get("symbol"):
            candidates = [(k, f) for k, f in candidates if f["qual"] == root["symbol"] or f["node"].name == root["symbol"]]
        else:
            row = root.get("position", {}).get("line", 0) + 1
            candidates = [(k, f) for k, f in candidates if f["node"].lineno <= row <= f["node"].end_lineno]
        if not candidates:
            raise ValueError("Place the cursor inside a Python function/method, or provide its symbol name.")
        key, _ = min(candidates, key=lambda pair: pair[1]["node"].end_lineno - pair[1]["node"].lineno)
        self.function(key, 0, [key])
        if self.input.get("direction") == "incoming":
            self.incoming(key)
        else:
            while self.queue and self.budget():
                current, depth, ancestors = self.queue.pop(0)
                if current in self.expanded:
                    continue
                self.expanded.add(current)
                fn = self.functions[current]
                if fn["node"].decorator_list:
                    self.gap("Decorators may replace callable behavior; the diagram shows the declared function body.")
                if self.graph["view"] == "calls":
                    for call in self.calls_in_body(fn["node"].body):
                        self.call(fn, call, depth, ancestors, self.fn_nodes[current])
                else:
                    exit_node = self.node("exit", "return / function exit", fn, fn["node"], depth)
                    throw_node = self.node("exit", "uncaught exception", fn, fn["node"], depth)
                    body = fn["node"].body
                    if current == key and root.get("start") == "cursor" and root.get("position"):
                        row = root["position"]["line"] + 1
                        body = [s for s in body if getattr(s, "end_lineno", s.lineno) >= row]
                    tail = self.sequence(fn, body, self.fn_nodes[current], depth, ancestors, {"return": exit_node, "throw": throw_node})
                    self.edge(tail, exit_node, "return", "fallthrough")
        self.graph["durationMs"] = round((time.monotonic() - self.started) * 1000)
        return self.graph

    def calls_in_body(self, body):
        result = []
        for stmt in body:
            result.extend(self.calls(stmt))
        return result

    def incoming(self, root_key):
        callers = {}
        for key, fn in self.functions.items():
            if not self.budget():
                break
            for call in self.calls_in_body(fn["node"].body):
                target = self.resolve(fn, ast.unparse(call.func))
                if target in self.functions:
                    callers.setdefault(target, set()).add(key)
        pending = [(root_key, 0)]
        seen = set()
        while pending and self.budget():
            key, depth = pending.pop(0)
            if key in seen:
                continue
            seen.add(key)
            parents = sorted(callers.get(key, []))
            if depth >= self.limits["callDepth"]:
                if parents:
                    self.frontier(self.fn_nodes[key], "Incoming call depth limit.")
                continue
            for parent in parents[:self.limits["targetsPerCall"]]:
                node = self.function(parent, depth + 1, [])
                self.edge(node, self.fn_nodes[key], "calls", "caller")
                pending.append((parent, depth + 1))
            if len(parents) > self.limits["targetsPerCall"]:
                self.frontier(self.fn_nodes[key], "Incoming caller fanout limit.")
        self.gap("Incoming analysis covers parsed workspace functions only; external callers, module-level calls and dynamic dispatch may be absent.")


try:
    payload = json.load(sys.stdin)
    result = Analysis(payload).trace()
except ValueError as error:
    result = {"error": {"code": "NO_SYMBOL_OR_SYNTAX", "message": str(error)}}
except Exception as error:
    result = {"error": {"code": "PYTHON_ANALYSIS_FAILED", "message": str(error)}}
json.dump(result, sys.stdout, ensure_ascii=True)
