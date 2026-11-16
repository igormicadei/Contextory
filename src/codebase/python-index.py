"""Source-only Python graph facts. Invoked with -I; never imports workspace code."""
import ast
import hashlib
import json
import re
import sys


def ident(*parts):
    return "code:" + hashlib.sha256(json.dumps(list(parts), ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()[:32]


def extract(files):
    nodes, edges, gaps, trees, symbols, bindings, contexts = [], [], [], {}, {}, {}, {}
    modules = {}
    for path in files:
        module = path[:-3].replace("/", ".")
        if module.endswith(".__init__"):
            module = module[:-9]
        modules.setdefault(module, []).append(path)
        if module.startswith("src."):
            modules.setdefault(module[4:], []).append(path)

    def module_path(path, module, level=0):
        if level:
            parts = path[:-3].split("/")[:-1]
            module = ".".join(parts[:max(0, len(parts) - level + 1)] + ([module] if module else []))
        choices = modules.get(module, [])
        return choices[0] if len(choices) == 1 else None

    def edge(source, target, kind, path, line, category="resolved", detail=""):
        edges.append(dict(id=ident(source, target, kind, path, str(line)), source=source, target=target, kind=kind,
                          path=path, line=line, category=category, extractor="contextory-python-ast-1", detail=detail))

    def collect(path, tree, scope="", owner=None, cls=None):
        owner = owner or ident("file", path)
        bindings.setdefault((path, scope), {})
        for node in ast.iter_child_nodes(tree):
            contexts[node] = (scope, owner, cls)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                qual = (scope + "." if scope else "") + node.name
                kind = "class" if isinstance(node, ast.ClassDef) else "method" if cls and scope == cls else "function"
                nid = ident(path, kind, qual)
                # Repeated declarations are ambiguous; never silently collapse them.
                if (path, qual) in symbols:
                    gaps.append(path + ": duplicate declaration " + qual)
                    symbols[(path, qual)] = None
                    nid = ident(path, kind, qual, str(node.lineno))
                else:
                    symbols[(path, qual)] = nid
                source = ast.get_source_segment(files[path], node) or ""
                nodes.append(dict(id=nid, kind=kind, label=node.name, qualifiedName=qual, path=path, line=node.lineno - 1,
                                  endLine=getattr(node, "end_lineno", node.lineno) - 1, character=node.col_offset,
                                  language="python", signature=("class " + node.name if kind == "class" else "def " + node.name + "(" + ast.unparse(node.args) + ")")[:300],
                                  text=((ast.get_docstring(node) or "") + "\n" + source)[:2400],
                                  test=bool(re.search(r"(^|/)(tests?|__tests__|specs?)(/|$)|(^|/)test_[^/]+\.py$|_test\.py$", path)), origin="native"))
                edge(owner, nid, "contains", path, node.lineno - 1, "extracted")
                contexts[node] = (qual, nid, qual if kind == "class" else cls)
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    bindings.setdefault((path, qual), {})
                    for arg in list(node.args.posonlyargs) + list(node.args.args) + list(node.args.kwonlyargs) + ([node.args.vararg] if node.args.vararg else []) + ([node.args.kwarg] if node.args.kwarg else []):
                        bindings[(path, qual)][arg.arg] = (None, "")
                collect(path, node, qual, nid, qual if kind == "class" else cls)
            else:
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        target = module_path(path, alias.name)
                        bindings[(path, scope)][alias.asname or alias.name.split(".")[0]] = (target, "")
                        if target:
                            edge(ident("file", path), ident("file", target), "imports", path, node.lineno - 1)
                elif isinstance(node, ast.ImportFrom):
                    target = module_path(path, node.module or "", node.level)
                    for alias in node.names:
                        bindings[(path, scope)][alias.asname or alias.name] = (target, alias.name)
                    if target:
                        edge(ident("file", path), ident("file", target), "imports", path, node.lineno - 1)
                elif isinstance(node, (ast.Assign, ast.AnnAssign)):
                    targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                    for target in targets:
                        if isinstance(target, ast.Name):
                            bindings[(path, scope)][target.id] = ("instance", ast.unparse(node.value.func)) if isinstance(node.value, ast.Call) else (None, "")
                collect(path, node, scope, owner, cls)

    for path, text in files.items():
        try:
            trees[path] = ast.parse(text, path)
            collect(path, trees[path])
        except (SyntaxError, RecursionError) as error:
            gaps.append(path + ": " + str(error)[:180])

    def resolve(path, scope, cls, name, seen=None):
        seen = set() if seen is None else seen
        key = (path, scope, name)
        if key in seen:
            return None
        seen.add(key)
        if cls and name.startswith(("self.", "cls.")):
            return symbols.get((path, cls + "." + name.split(".", 1)[1]))
        first, _, rest = name.partition(".")
        scopes = [".".join(scope.split(".")[:i]) for i in range(len(scope.split(".")), -1, -1)]
        for current in scopes:
            qual = (current + "." if current else "") + name
            if (path, qual) in symbols:
                return symbols[(path, qual)]
            binding = bindings.get((path, current), {}).get(first)
            if binding:
                target, imported = binding
                if target == "instance":
                    return resolve(path, scope, cls, imported + ("." + rest if rest else ""), seen)
                if target:
                    return symbols.get((target, ".".join(x for x in (imported, rest) if x)))
                return None
        return None

    unresolved_calls = 0
    for path, tree in trees.items():
        for node in ast.walk(tree):
            scope, owner, cls = contexts.get(node, ("", ident("file", path), None))
            if isinstance(node, ast.Call):
                target = resolve(path, scope, cls, ast.unparse(node.func))
                if target:
                    edge(owner, target, "calls", path, node.lineno - 1)
                    if re.search(r"(^|/)(tests?/|test_)", path):
                        edge(owner, target, "tests", path, node.lineno - 1, detail="Referenced by test code; not execution coverage.")
                else:
                    unresolved_calls += 1
            elif isinstance(node, ast.ClassDef):
                for base in node.bases:
                    target = resolve(path, scope.rpartition(".")[0], cls, ast.unparse(base))
                    if target:
                        edge(owner, target, "extends", path, node.lineno - 1)
            elif isinstance(node, (ast.Name, ast.Attribute)) and isinstance(node.ctx, ast.Load):
                target = resolve(path, scope, cls, ast.unparse(node))
                if target and owner != target:
                    edge(owner, target, "references", path, node.lineno - 1)
    if unresolved_calls:
        gaps.append(str(unresolved_calls) + " Python call target(s) are external or dynamic and were not resolved.")
    return dict(nodes=nodes, edges=list({e["id"]: e for e in edges}.values()), gaps=list(dict.fromkeys(gaps))[:100])


try:
    json.dump(extract(json.load(sys.stdin)["files"]), sys.stdout, ensure_ascii=False)
except Exception as error:
    json.dump(dict(error=str(error)[:300]), sys.stdout)
    sys.exit(1)
