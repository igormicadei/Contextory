import ts from "typescript";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import {
  flowDefaults,
  ContextoryError,
  type FlowGraph,
  type FlowInput,
  type FlowNode,
  type SourceRef,
} from "../contracts/model";
type Fn = ts.FunctionLikeDeclaration & { body: ts.ConciseBody };
type Targets = {
  returnTo: string;
  throwTo: string;
  breakTo?: string;
  continueTo?: string;
};
const callable = (node: ts.Node): node is Fn =>
  ts.isFunctionLike(node) && "body" in node && !!node.body;
export class SourceEngine {
  private cache = new Map<string, { text: string; source: ts.SourceFile }>();
  private oldProgram?: ts.Program;
  constructor(private root: string) {
    this.root = realpathSync(root);
  }
  trace(input: FlowInput): FlowGraph {
    const began = Date.now();
    const limits = { ...flowDefaults, ...input.limits };
    const safe = (path: string) => {
      const rel = relative(this.root, resolve(path));
      return (
        !rel.startsWith("..") &&
        !isAbsolute(rel) &&
        !/(^|[\\/])(?:node_modules|\.git|\.contextory-local)([\\/]|$)/.test(rel)
      );
    };
    const file = resolve(this.root, input.root.path);
    if (!safe(file) || !existsSync(file) || !safe(realpathSync(file)))
      throw new ContextoryError(
        "INVALID_PATH",
        "Choose a source file inside this workspace.",
      );
    if (!/\.[cm]?[jt]sx?$/.test(file))
      throw new ContextoryError(
        "UNSUPPORTED_LANGUAGE",
        "Use Calls mode with an installed editor call-hierarchy provider for this language. Static flow is available for Python and TypeScript/JavaScript.",
      );
    const graph: FlowGraph = {
      id: randomUUID(),
      snapshotId: "",
      root: input.root,
      view: input.view ?? "calls",
      engine: `typescript-${ts.version}`,
      nodes: [],
      edges: [],
      frontier: [],
      gaps: [],
      limits,
      partial: false,
      unsaved: !!input.overlays && Object.keys(input.overlays).length > 0,
      durationMs: 0,
    };
    let options: ts.CompilerOptions = {
      allowJs: true,
      checkJs: false,
      noLib: true,
      noEmit: true,
      skipLibCheck: true,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ESNext,
      jsx: ts.JsxEmit.Preserve,
    };
    const configPath = resolve(this.root, "tsconfig.json");
    if (existsSync(configPath)) {
      const config = ts.readConfigFile(configPath, (path) =>
        readFileSync(path, "utf8"),
      );
      if (config.config) {
        options = {
          ...ts.convertCompilerOptionsFromJson(
            config.config.compilerOptions ?? {},
            this.root,
          ).options,
          ...options,
        };
        if (config.config.extends)
          graph.gaps.push(
            "Extended tsconfig options are not expanded by the bounded source extractor.",
          );
      }
    }
    const host = ts.createCompilerHost(options);
    const read = (path: string) => {
      if (!safe(path) || !/\.[cm]?[jt]sx?$/.test(path)) return undefined;
      const overlay =
        input.overlays?.[relative(this.root, path).replaceAll("\\", "/")];
      if (overlay !== undefined) return overlay;
      try {
        if (!safe(realpathSync(path))) return undefined;
        return readFileSync(path, "utf8");
      } catch {
        return undefined;
      }
    };
    host.readFile = read;
    host.fileExists = (path) => safe(path) && existsSync(path);
    host.getSourceFile = (path, languageVersion) => {
      const text = read(path);
      if (text === undefined || text.length > 2 * 1024 * 1024) return undefined;
      const old = this.cache.get(path);
      if (old?.text === text) return old.source;
      const source = ts.createSourceFile(path, text, languageVersion, true);
      this.cache.set(path, { text, source });
      return source;
    };
    const program = ts.createProgram({
      rootNames: [file],
      options,
      host,
      oldProgram: this.oldProgram,
    });
    this.oldProgram = program;
    const sf = program.getSourceFile(file);
    if (!sf)
      throw new ContextoryError(
        "UNREADABLE_SOURCE",
        "Source is missing or exceeds the 2 MiB analysis limit.",
      );
    const fingerprint = createHash("sha256").update(JSON.stringify(options));
    for (const source of [...program.getSourceFiles()].sort((a, b) =>
      a.fileName.localeCompare(b.fileName),
    ))
      fingerprint.update(source.fileName).update(source.text);
    graph.snapshotId = fingerprint.digest("hex");
    const checker = program.getTypeChecker();
    const fnName = (fn: Fn): string =>
      fn.name?.getText() ??
      (ts.isVariableDeclaration(fn.parent)
        ? fn.parent.name.getText()
        : ts.isPropertyAssignment(fn.parent)
          ? fn.parent.name.getText()
          : "(anonymous)");
    const line = Math.min(
      input.root.position?.line ?? 0,
      sf.getLineStarts().length - 1,
    );
    const lineStart = sf.getLineStarts()[line];
    const lineEnd = sf.getLineStarts()[line + 1] ?? sf.text.length;
    const offset =
      lineStart +
      Math.min(
        input.root.position?.character ?? 0,
        Math.max(0, lineEnd - lineStart - (lineEnd < sf.text.length ? 1 : 0)),
      );
    let rootFn: Fn | undefined;
    const find = (node: ts.Node) => {
      if (
        callable(node) &&
        (input.root.symbol
          ? fnName(node) === input.root.symbol
          : node.getStart(sf) <= offset && node.getEnd() >= offset)
      )
        rootFn = node;
      ts.forEachChild(node, (child) => {
        if (
          input.root.symbol ||
          (child.getFullStart() <= offset && child.getEnd() >= offset)
        )
          find(child);
      });
    };
    find(sf);
    if (!rootFn)
      throw new ContextoryError(
        "NO_SYMBOL",
        "Place the cursor inside a function/method, or provide its symbol name.",
      );
    if (input.direction === "incoming")
      throw new ContextoryError(
        "EDITOR_PROVIDER_REQUIRED",
        "Incoming calls use the editor call-hierarchy provider. Open the workspace in the extension.",
      );
    const ref = (node: ts.Node): SourceRef => {
      const source = node.getSourceFile();
      const p = source.getLineAndCharacterOfPosition(node.getStart(source));
      return {
        path: relative(this.root, source.fileName).replaceAll("\\", "/"),
        line: p.line,
        character: p.character,
      };
    };
    const functions = new Map<
      string,
      { fn: Fn; node: string; depth: number; ancestors: string[] }
    >();
    const queue: {
      fn: Fn;
      node: string;
      depth: number;
      ancestors: string[];
    }[] = [];
    let counter = 0;
    const bounded = () => Date.now() - began < limits.timeoutMs;
    const frontier = (nodeId: string, reason: string) => {
      if (
        !graph.frontier.some((f) => f.nodeId === nodeId && f.reason === reason)
      )
        graph.frontier.push({ nodeId, reason, handle: nodeId });
      if (["time", "nodes", "edges", "fanout"].includes(reason))
        graph.partial = true;
    };
    const node = (
      kind: FlowNode["kind"],
      label: string,
      ast: ts.Node,
      depth: number,
    ): string => {
      if (!bounded() || graph.nodes.length >= limits.nodes) {
        if (graph.nodes[0])
          frontier(graph.nodes[0].id, bounded() ? "nodes" : "time");
        return "";
      }
      const id = `n${++counter}`;
      graph.nodes.push({
        id,
        kind,
        label: label.replace(/\s+/g, " ").slice(0, 180),
        source: ref(ast),
        depth,
      });
      return id;
    };
    const edge = (
      from: string,
      to: string,
      kind: string,
      label?: string,
      ast?: ts.Node,
    ) => {
      if (!from || !to) return;
      if (graph.edges.length >= limits.edges) {
        frontier(from, "edges");
        return;
      }
      graph.edges.push({
        id: `e${graph.edges.length + 1}`,
        from,
        to,
        kind,
        label,
        source: ast ? ref(ast) : undefined,
      });
    };
    const key = (fn: Fn) => `${fn.getSourceFile().fileName}:${fn.pos}`;
    const register = (fn: Fn, depth: number, ancestors: string[]) => {
      const id = key(fn);
      const found = functions.get(id);
      if (found) return found.node;
      const entry = node("function", fnName(fn), fn, depth);
      if (!entry) return "";
      const item = { fn, node: entry, depth, ancestors };
      functions.set(id, item);
      queue.push(item);
      return entry;
    };
    register(rootFn, 0, []);
    while (queue.length && bounded()) {
      const current = queue.shift()!;
      const { fn, depth } = current;
      const target = (
        call: ts.CallExpression | ts.NewExpression,
        from: string,
      ) => {
        const signature = checker.getResolvedSignature(call);
        let declaration = signature?.declaration;
        if (!declaration || !callable(declaration)) {
          let symbol = checker.getSymbolAtLocation(call.expression);
          if (symbol?.flags && symbol.flags & ts.SymbolFlags.Alias)
            symbol = checker.getAliasedSymbol(symbol);
          const decl = symbol?.valueDeclaration;
          if (
            decl &&
            ts.isVariableDeclaration(decl) &&
            decl.initializer &&
            callable(decl.initializer)
          )
            declaration = decl.initializer;
          else if (decl && callable(decl)) declaration = decl;
        }
        if (
          !declaration ||
          !callable(declaration) ||
          !safe(declaration.getSourceFile().fileName)
        ) {
          frontier(from, "unresolved/external");
          return;
        }
        if (depth >= limits.callDepth) {
          frontier(from, "depth");
          return;
        }
        const next = register(declaration, depth + 1, [
          ...current.ancestors,
          key(fn),
        ]);
        edge(
          from,
          next,
          "calls",
          key(declaration) === key(fn) ||
            current.ancestors.includes(key(declaration))
            ? "recursion"
            : "call",
          call,
        );
      };
      if (graph.view === "calls") {
        const visit = (ast: ts.Node) => {
          if (ast !== fn.body && callable(ast)) return;
          if (!bounded()) {
            frontier(current.node, "time");
            return;
          }
          if (ts.isCallExpression(ast) || ts.isNewExpression(ast))
            target(ast, current.node);
          ts.forEachChild(ast, visit);
        };
        visit(fn.body);
        continue;
      }
      const exit = node("exit", "function exit", fn, depth);
      const thrown = node("throw", "uncaught exception", fn, depth);
      const expr = (
        ast: ts.Node | undefined,
        after: string,
        ctx: Targets,
      ): string => {
        if (!ast || !bounded() || callable(ast)) return after;
        if (
          ts.isConditionalExpression(ast) ||
          (ts.isBinaryExpression(ast) &&
            [
              ts.SyntaxKind.AmpersandAmpersandToken,
              ts.SyntaxKind.BarBarToken,
              ts.SyntaxKind.QuestionQuestionToken,
            ].includes(ast.operatorToken.kind))
        ) {
          const conditional = ts.isConditionalExpression(ast);
          const test = conditional ? ast.condition : ast.left;
          const branch = node("branch", test.getText(), test, depth);
          if (conditional) {
            edge(branch, expr(ast.whenTrue, after, ctx), "branch", "true");
            edge(branch, expr(ast.whenFalse, after, ctx), "branch", "false");
          } else {
            const and =
              ast.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken;
            const nullish =
              ast.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken;
            edge(
              branch,
              expr(ast.right, after, ctx),
              "branch",
              nullish ? "nullish" : and ? "truthy" : "falsy",
            );
            edge(
              branch,
              after,
              "branch",
              nullish ? "not nullish" : and ? "falsy" : "truthy",
            );
          }
          return expr(test, branch, ctx);
        }
        if (ts.isCallExpression(ast) || ts.isNewExpression(ast)) {
          const call = node("call", ast.getText(), ast, depth);
          target(ast, call);
          edge(call, after, "continuation", "on return");
          if (ctx.throwTo && ctx.throwTo !== thrown)
            edge(call, ctx.throwTo, "exception", "may throw");
          let entry = call;
          for (const arg of [...(ast.arguments ?? [])].reverse())
            entry = expr(arg, entry, ctx);
          return expr(ast.expression, entry, ctx);
        }
        if (ts.isAwaitExpression(ast)) {
          const wait = node("statement", "await / resume", ast, depth);
          edge(wait, after, "resume");
          edge(wait, ctx.throwTo, "exception", "may reject");
          return expr(ast.expression, wait, ctx);
        }
        const children: ts.Node[] = [];
        ts.forEachChild(ast, (child) => {
          if (
            ts.isExpression(child) ||
            ts.isVariableDeclaration(child) ||
            ts.isVariableDeclarationList(child)
          )
            children.push(child);
        });
        let entry = after;
        for (const child of children.reverse()) entry = expr(child, entry, ctx);
        return entry;
      };
      const sequence = (
        statements: readonly ts.Statement[],
        after: string,
        ctx: Targets,
      ): string => {
        let entry = after;
        for (const statement of [...statements].reverse())
          entry = statementFlow(statement, entry, ctx);
        return entry;
      };
      const statementFlow = (
        ast: ts.Statement,
        after: string,
        ctx: Targets,
      ): string => {
        if (!bounded()) {
          frontier(current.node, "time");
          return after;
        }
        if (ts.isBlock(ast)) return sequence(ast.statements, after, ctx);
        if (
          ts.isFunctionDeclaration(ast) ||
          ts.isClassDeclaration(ast) ||
          ts.isInterfaceDeclaration(ast) ||
          ts.isTypeAliasDeclaration(ast) ||
          ts.isEmptyStatement(ast)
        )
          return after;
        if (ts.isIfStatement(ast)) {
          const branch = node(
            "branch",
            ast.expression.getText(),
            ast.expression,
            depth,
          );
          edge(
            branch,
            statementFlow(ast.thenStatement, after, ctx),
            "branch",
            "true",
          );
          edge(
            branch,
            ast.elseStatement
              ? statementFlow(ast.elseStatement, after, ctx)
              : after,
            "branch",
            "false",
          );
          return expr(ast.expression, branch, ctx);
        }
        if (ts.isReturnStatement(ast) || ts.isThrowStatement(ast)) {
          const terminal = node(
            ts.isReturnStatement(ast) ? "return" : "throw",
            ast.getText(),
            ast,
            depth,
          );
          edge(
            terminal,
            ts.isReturnStatement(ast) ? ctx.returnTo : ctx.throwTo,
            ts.isReturnStatement(ast) ? "return" : "throw",
          );
          return expr(ast.expression, terminal, ctx);
        }
        if (ts.isBreakStatement(ast) || ts.isContinueStatement(ast)) {
          if (ast.label)
            graph.gaps.push("Labeled break/continue needs manual inspection.");
          const item = node("statement", ast.getText(), ast, depth);
          edge(
            item,
            ts.isBreakStatement(ast)
              ? (ctx.breakTo ?? after)
              : (ctx.continueTo ?? after),
            "jump",
          );
          return item;
        }
        if (
          ts.isWhileStatement(ast) ||
          ts.isDoStatement(ast) ||
          ts.isForStatement(ast) ||
          ts.isForOfStatement(ast) ||
          ts.isForInStatement(ast)
        ) {
          const loop = node(
            "loop",
            ts.isForOfStatement(ast) || ts.isForInStatement(ast)
              ? "iterate: next / exhausted"
              : ts.isForStatement(ast)
                ? (ast.condition?.getText() ?? "true")
                : ast.expression.getText(),
            ast,
            depth,
          );
          const condition = ts.isForStatement(ast)
            ? ast.condition
            : ts.isForOfStatement(ast) || ts.isForInStatement(ast)
              ? undefined
              : ast.expression;
          const conditionEntry = expr(condition, loop, ctx);
          const increment = ts.isForStatement(ast)
            ? expr(ast.incrementor, conditionEntry, ctx)
            : conditionEntry;
          const body = statementFlow(ast.statement, increment, {
            ...ctx,
            breakTo: after,
            continueTo: increment,
          });
          edge(loop, body, "branch", "next / true");
          if (!(ts.isForStatement(ast) && !ast.condition))
            edge(loop, after, "branch", "exhausted / false");
          if (ts.isDoStatement(ast)) return body;
          if (ts.isForStatement(ast))
            return expr(ast.initializer, conditionEntry, ctx);
          return ts.isForOfStatement(ast) || ts.isForInStatement(ast)
            ? expr(ast.expression, conditionEntry, ctx)
            : conditionEntry;
        }
        if (ts.isSwitchStatement(ast)) {
          const branch = node(
            "branch",
            `switch ${ast.expression.getText()}`,
            ast,
            depth,
          );
          let fallthrough = after;
          let hasDefault = false;
          for (const clause of [...ast.caseBlock.clauses].reverse()) {
            fallthrough = sequence(clause.statements, fallthrough, {
              ...ctx,
              breakTo: after,
            });
            edge(
              branch,
              fallthrough,
              "branch",
              ts.isCaseClause(clause)
                ? `case ${clause.expression.getText()}`
                : "default",
            );
            if (ts.isDefaultClause(clause)) hasDefault = true;
          }
          if (!hasDefault) edge(branch, after, "branch", "no match");
          graph.gaps.push(
            "Switch case dispatch is conservative; side effects in case expressions are not ordered.",
          );
          return expr(ast.expression, branch, ctx);
        }
        if (ts.isTryStatement(ast)) {
          const memo = new Map<string, string>();
          const finish = (targetId: string) => {
            if (!ast.finallyBlock) return targetId;
            if (!memo.has(targetId))
              memo.set(
                targetId,
                statementFlow(ast.finallyBlock, targetId, ctx),
              );
            return memo.get(targetId)!;
          };
          const normal = finish(after);
          const protectedContext: Targets = {
            returnTo: finish(ctx.returnTo),
            throwTo: finish(ctx.throwTo),
            breakTo: ctx.breakTo ? finish(ctx.breakTo) : undefined,
            continueTo: ctx.continueTo ? finish(ctx.continueTo) : undefined,
          };
          const caught = ast.catchClause
            ? statementFlow(ast.catchClause.block, normal, protectedContext)
            : protectedContext.throwTo;
          return statementFlow(ast.tryBlock, normal, {
            ...protectedContext,
            throwTo: caught,
          });
        }
        if (ts.isLabeledStatement(ast) || ts.isWithStatement(ast)) {
          graph.gaps.push(
            `Unsupported control construct: ${ts.SyntaxKind[ast.kind]}`,
          );
          const gap = node("gap", ast.getText(), ast, depth);
          edge(gap, after, "unknown");
          return gap;
        }
        const item = node("statement", ast.getText(), ast, depth);
        edge(item, after, "next");
        if (ts.isExpressionStatement(ast))
          return expr(ast.expression, item, ctx);
        if (ts.isVariableStatement(ast)) {
          let entry = item;
          for (const declaration of [
            ...ast.declarationList.declarations,
          ].reverse())
            entry = expr(declaration.initializer, entry, ctx);
          return entry;
        }
        return expr(ast, item, ctx);
      };
      const context: Targets = { returnTo: exit, throwTo: thrown };
      let statements = ts.isBlock(fn.body) ? [...fn.body.statements] : [];
      if (
        fn === rootFn &&
        input.root.start === "cursor" &&
        input.root.position &&
        ts.isBlock(fn.body)
      ) {
        const selected = statements.findIndex(
          (s) => s.getFullStart() <= offset && s.getEnd() >= offset,
        );
        if (selected >= 0) {
          statements = statements.slice(selected);
          if (
            !ts.isExpressionStatement(statements[0]) &&
            !ts.isVariableStatement(statements[0])
          )
            graph.gaps.push(
              "Cursor inside a control statement starts at that enclosing statement, including its condition.",
            );
        }
      }
      const entry = ts.isBlock(fn.body)
        ? sequence(statements, exit, context)
        : expr(fn.body, exit, context);
      edge(current.node, entry, "entry");
    }
    if (queue.length || !bounded()) frontier(graph.nodes[0]?.id ?? "", "time");
    graph.gaps.push(
      "Static possible paths only. Reflection, implicit framework dispatch, getters, generators and callback scheduling may be unresolved.",
    );
    graph.gaps = [...new Set(graph.gaps)];
    graph.durationMs = Date.now() - began;
    // Drop edges to nodes omitted by a resource limit, never invent terminal paths.
    const ids = new Set(graph.nodes.map((n) => n.id));
    graph.edges = graph.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
    if (this.cache.size > 2000) {
      this.cache.clear();
      this.oldProgram = undefined;
    }
    return graph;
  }
}
