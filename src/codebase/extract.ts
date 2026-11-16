import ts from "typescript";
import { dirname, posix, resolve } from "node:path";
import {
  codeEdge,
  codeId,
  fileId,
  fileNode,
  isTestPath,
  type CodeExtraction,
  type CodeFile,
  type CodeNode,
} from "./model";

export class CodeExtractor {
  private sources = new Map<string, { text: string; source: ts.SourceFile }>();
  extract(root: string, files: CodeFile[]): CodeExtraction {
    const result: CodeExtraction = {
      nodes: files.map(fileNode),
      edges: [],
      gaps: [],
    };
    const byPath = new Map(files.map((f) => [f.path, f]));
    const canonical = (name: string) =>
      process.platform === "win32"
        ? resolve(name).toLowerCase()
        : resolve(name);
    const absolute = new Map(
      files.map((f) => [canonical(resolve(root, f.path)), f]),
    );
    const safeRead = (name: string) => absolute.get(canonical(name))?.text;
    const config = ts.getParsedCommandLineOfConfigFile(
      resolve(root, "tsconfig.json"),
      {},
      {
        useCaseSensitiveFileNames: true,
        getCurrentDirectory: () => root,
        readDirectory: () =>
          [...absolute.values()]
            .filter((f) => /\.[cm]?[jt]sx?$/.test(f.path))
            .map((f) => resolve(root, f.path)),
        fileExists: (name) => safeRead(name) !== undefined,
        readFile: safeRead,
        onUnRecoverableConfigFileDiagnostic: (d) => {
          if (byPath.has("tsconfig.json"))
            result.gaps.push(
              ts.flattenDiagnosticMessageText(d.messageText, " "),
            );
        },
      },
    );
    if (config)
      result.gaps.push(
        ...config.errors.map((d) =>
          ts.flattenDiagnosticMessageText(d.messageText, " "),
        ),
      );
    const options: ts.CompilerOptions = {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ESNext,
      ...config?.options,
      allowJs: true,
      noEmit: true,
      noLib: true,
      skipLibCheck: true,
    };
    const host = ts.createCompilerHost(options);
    host.readFile = safeRead;
    host.fileExists = (name) => safeRead(name) !== undefined;
    host.directoryExists = (name) =>
      [...absolute.keys()].some(
        (p) =>
          p.startsWith(canonical(name) + "\\") ||
          p.startsWith(canonical(name) + "/"),
      );
    host.getSourceFile = (name, version) => {
      const text = safeRead(name);
      if (text === undefined) return undefined;
      const key = canonical(name);
      const old = this.sources.get(key);
      if (old?.text === text) return old.source;
      const source = ts.createSourceFile(name, text, version, true);
      this.sources.set(key, { text, source });
      return source;
    };
    for (const key of this.sources.keys())
      if (!absolute.has(key)) this.sources.delete(key);
    const program = ts.createProgram(
      files
        .filter((f) => /\.[cm]?[jt]sx?$/.test(f.path))
        .map((f) => resolve(root, f.path)),
      options,
      host,
    );
    const checker = program.getTypeChecker();
    const decls = new Map<ts.Node, CodeNode>();
    const owners = new Map<ts.Node, CodeNode>();
    const sourceFiles = program
      .getSourceFiles()
      .filter((sf) => absolute.has(canonical(sf.fileName)));
    const pathOf = (node: ts.Node) =>
      absolute.get(canonical(node.getSourceFile().fileName))!.path;
    const loc = (node: ts.Node) =>
      node.getSourceFile().getLineAndCharacterOfPosition(node.getStart());
    for (const sf of sourceFiles) {
      const path = pathOf(sf);
      result.gaps.push(
        ...program
          .getSyntacticDiagnostics(sf)
          .slice(0, 3)
          .map(
            (d) =>
              `${path}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`,
          ),
      );
      const seen = new Map<string, number>();
      const collect = (node: ts.Node, scope: string, owner?: CodeNode) => {
        let current = owner;
        let name: string | undefined;
        let kind: CodeNode["kind"] | undefined;
        if (
          ts.isFunctionDeclaration(node) ||
          ts.isClassDeclaration(node) ||
          ts.isInterfaceDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          ts.isEnumDeclaration(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isMethodSignature(node) ||
          ts.isPropertyDeclaration(node) ||
          ts.isPropertySignature(node)
        )
          name = node.name?.getText(sf);
        if (ts.isConstructorDeclaration(node)) name = "constructor";
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name))
          name = node.name.text;
        if (name) {
          kind = ts.isClassDeclaration(node)
            ? "class"
            : ts.isInterfaceDeclaration(node)
              ? "interface"
              : ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)
                ? "type"
                : ts.isMethodDeclaration(node) ||
                    ts.isMethodSignature(node) ||
                    ts.isConstructorDeclaration(node)
                  ? "method"
                  : ts.isFunctionDeclaration(node) ||
                      (ts.isVariableDeclaration(node) &&
                        node.initializer &&
                        (ts.isArrowFunction(node.initializer) ||
                          ts.isFunctionExpression(node.initializer)))
                    ? "function"
                    : "variable";
          const qualifiedName = scope ? `${scope}.${name}` : name;
          const signature = node
            .getText(sf)
            .split(/\{|=>/)[0]
            .replace(/\s+/g, " ")
            .slice(0, 300);
          const base = codeId(path, kind, qualifiedName);
          const occurrence = seen.get(base) ?? 0;
          seen.set(base, occurrence + 1);
          const p = loc(node);
          current = {
            id: occurrence
              ? codeId(path, kind, qualifiedName, signature, String(occurrence))
              : base,
            kind,
            label: name,
            qualifiedName,
            path,
            line: p.line,
            endLine: sf.getLineAndCharacterOfPosition(node.end).line,
            character: p.character,
            language: /[jt]sx$/.test(path)
              ? "tsx"
              : /\.[cm]?js/.test(path)
                ? "javascript"
                : "typescript",
            signature,
            text: node.getText(sf).slice(0, 2400),
            test: isTestPath(path),
            origin: "native",
          };
          result.nodes.push(current);
          decls.set(node, current);
          if (ts.isVariableDeclaration(node) && node.initializer)
            decls.set(node.initializer, current);
          result.edges.push(
            codeEdge(
              owner?.id ?? fileId(path),
              current.id,
              "contains",
              path,
              p.line,
              "extracted",
            ),
          );
          scope = qualifiedName;
        }
        if (current) owners.set(node, current);
        ts.forEachChild(node, (child) => collect(child, scope, current));
      };
      collect(sf, "");
    }
    const targetOf = (node: ts.Node): CodeNode | undefined => {
      let symbol = checker.getSymbolAtLocation(node);
      if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
        try {
          symbol = checker.getAliasedSymbol(symbol);
        } catch {
          return undefined;
        }
      }
      return symbol?.declarations?.map((d) => decls.get(d)).find(Boolean);
    };
    const contracts = new Map<string, CodeNode>();
    let unresolvedCalls = 0;
    const contract = (
      channel: string,
      name: string,
      node: ts.Node,
      owner: string,
      sends: boolean,
    ) => {
      const path = pathOf(node),
        p = loc(node),
        key = `${channel}:${name}`;
      if (!contracts.has(key))
        contracts.set(key, {
          ...fileNode(byPath.get(path)!),
          id: codeId("contract", channel, name),
          kind: "contract",
          label: name,
          qualifiedName: key,
          line: p.line,
          endLine: p.line,
          character: p.character,
          signature: key,
          text: `Literal ${channel} contract ${name}; dispatch matching is static.`,
          language: "contract",
        });
      const c = contracts.get(key)!;
      result.edges.push(
        codeEdge(
          sends ? owner : c.id,
          sends ? c.id : owner,
          sends ? "sends" : "handles",
          path,
          p.line,
          "inferred",
          `Literal ${channel} endpoint; runtime delivery is not proven.`,
        ),
      );
    };
    const literal = (node?: ts.Node) =>
      node && ts.isStringLiteralLike(node) ? node.text : undefined;
    const messageChannel = (path: string, receiver = "") =>
      /worker|parentPort/.test(receiver) || /worker/.test(path)
        ? "worker"
        : /webview/.test(receiver) ||
            /webview|(^|\/)extension\.[jt]s$/.test(path) ||
            /host/.test(receiver)
          ? "webview"
          : "service-event";
    for (const sf of sourceFiles) {
      const path = pathOf(sf);
      const walk = (node: ts.Node, owner = fileId(path)) => {
        owner = owners.get(node)?.id ?? owner;
        const line = loc(node).line;
        if (
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier
        ) {
          const module = literal(node.moduleSpecifier);
          if (module) {
            const found = ts.resolveModuleName(
              module,
              sf.fileName,
              options,
              host,
            ).resolvedModule;
            const target =
              found && absolute.get(canonical(found.resolvedFileName));
            if (target)
              result.edges.push(
                codeEdge(
                  fileId(path),
                  fileId(target.path),
                  ts.isExportDeclaration(node) ? "re_exports" : "imports",
                  path,
                  line,
                ),
              );
            else if (!module.startsWith(".")) {
              const name = module.startsWith("@")
                ? module.split("/").slice(0, 2).join("/")
                : module.split("/")[0];
              const id = codeId("package", name);
              if (!result.nodes.some((n) => n.id === id))
                result.nodes.push({
                  ...fileNode(byPath.get(path)!),
                  id,
                  kind: "package",
                  label: name,
                  qualifiedName: name,
                  path: "",
                  language: "package",
                  signature: name,
                  text: `External package ${name}; implementation is outside the indexed workspace.`,
                });
              result.edges.push(
                codeEdge(
                  fileId(path),
                  id,
                  "depends_on",
                  path,
                  line,
                  "extracted",
                  "Literal external module specifier",
                ),
              );
            } else if (module.startsWith("."))
              result.gaps.push(
                `${path}:${line + 1}: unresolved import ${module}`,
              );
          }
        }
        if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
          const declaration = checker.getResolvedSignature(node)?.declaration;
          const target =
            (declaration && decls.get(declaration)) ||
            targetOf(node.expression);
          if (target)
            result.edges.push(codeEdge(owner, target.id, "calls", path, line));
          else unresolvedCalls++;
          if (target && isTestPath(path) && !target.test)
            result.edges.push(
              codeEdge(
                owner,
                target.id,
                "tests",
                path,
                line,
                "resolved",
                "Referenced by test code; execution coverage is not implied.",
              ),
            );
          const expr = node.expression.getText(sf),
            method = ts.isPropertyAccessExpression(node.expression)
              ? node.expression.name.text
              : expr;
          const first = literal(node.arguments?.[0]);
          if (method === "rpc" && node.arguments) {
            const name = literal(node.arguments[1]);
            if (name) contract("rpc", name, node, owner, true);
          } else if (
            method === "call" &&
            first &&
            (ts.isPropertyAccessExpression(node.expression) ||
              first.startsWith("contextory_"))
          )
            contract(
              first.startsWith("contextory_") ? "mcp" : "rpc",
              first,
              node,
              owner,
              true,
            );
          if (
            ["postMessage", "send", "notify"].includes(method) &&
            node.arguments?.[0] &&
            ts.isObjectLiteralExpression(node.arguments[0])
          ) {
            const type = node.arguments[0].properties.find(
              (p) =>
                ts.isPropertyAssignment(p) && p.name.getText(sf) === "type",
            );
            if (type && ts.isPropertyAssignment(type)) {
              const name = literal(type.initializer);
              if (name)
                contract(messageChannel(path, expr), name, node, owner, true);
            }
          }
        }
        if (ts.isCaseClause(node) && ts.isSwitchStatement(node.parent.parent)) {
          const name = literal(node.expression),
            expression = node.parent.parent.expression.getText(sf);
          if (
            name &&
            (/^(?:method|key|name)$/.test(expression) ||
              /\.type$/.test(expression))
          )
            contract(
              name.startsWith("contextory_")
                ? "mcp"
                : /\.type$/.test(expression)
                  ? messageChannel(path)
                  : "rpc",
              name,
              node,
              owner,
              false,
            );
        }
        if (
          ts.isIdentifier(node) &&
          !(
            "name" in node.parent &&
            (node.parent as ts.NamedDeclaration).name === node
          )
        ) {
          const target = targetOf(node);
          if (target && target.id !== owner)
            result.edges.push(
              codeEdge(owner, target.id, "references", path, line),
            );
        }
        if (ts.isExpressionWithTypeArguments(node)) {
          const target = targetOf(node.expression);
          if (target)
            result.edges.push(
              codeEdge(
                owner,
                target.id,
                ts.isHeritageClause(node.parent) &&
                  node.parent.token === ts.SyntaxKind.ImplementsKeyword
                  ? "implements"
                  : "extends",
                path,
                line,
              ),
            );
        }
        ts.forEachChild(node, (child) => walk(child, owner));
      };
      walk(sf);
    }
    result.nodes.push(...contracts.values());
    if (unresolvedCalls)
      result.gaps.push(
        `${unresolvedCalls} TS/JS call target(s) are external or dynamic and were not resolved.`,
      );
    for (const file of files) {
      if (file.language === "markdown") {
        let owner = fileId(file.path);
        const counts = new Map<string, number>();
        const lines = file.text.split("\n");
        let fence = false;
        for (let line = 0; line < lines.length; line++) {
          if (/^\s*(```|~~~)/.test(lines[line])) fence = !fence;
          if (fence) continue;
          const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(lines[line]);
          if (heading) {
            const name = heading[2],
              n = counts.get(name) ?? 0;
            counts.set(name, n + 1);
            const next = lines.findIndex(
              (l, i) =>
                i > line && new RegExp(`^#{1,${heading[1].length}}\\s`).test(l),
            );
            const section: CodeNode = {
              ...fileNode(file),
              id: codeId(file.path, "section", name, String(n)),
              kind: "section",
              label: name,
              qualifiedName: name,
              line,
              endLine: next < 0 ? lines.length - 1 : next - 1,
              signature: name,
              text: lines
                .slice(line, next < 0 ? lines.length : next)
                .join("\n")
                .slice(0, 2400),
            };
            result.nodes.push(section);
            owner = section.id;
            result.edges.push(
              codeEdge(
                fileId(file.path),
                owner,
                "contains",
                file.path,
                line,
                "extracted",
              ),
            );
          }
          for (const link of lines[line].matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
            const [dest, symbol] = link[1].split("#"),
              targetPath = posix.normalize(
                posix.join(dirname(file.path).replaceAll("\\", "/"), dest),
              );
            const target = symbol
              ? result.nodes.find(
                  (n) =>
                    n.path === targetPath &&
                    (n.qualifiedName === symbol || n.label === symbol),
                )
              : undefined;
            if (byPath.has(targetPath))
              result.edges.push(
                codeEdge(
                  owner,
                  target?.id ?? fileId(targetPath),
                  "documents",
                  file.path,
                  line,
                  "extracted",
                  "Explicit Markdown source link",
                ),
              );
          }
        }
      }
      if (/\.(?:json|ya?ml|toml)$/.test(file.path)) {
        const linked = new Set<string>();
        for (const match of file.text.matchAll(
          /["']([^"'\r\n]+\.(?:[cm]?[jt]sx?|py|md|json))["']/g,
        )) {
          const target = posix.normalize(
            posix.join(posix.dirname(file.path), match[1]),
          );
          if (byPath.has(target) && !linked.has(target)) {
            linked.add(target);
            result.edges.push(
              codeEdge(
                fileId(file.path),
                fileId(target),
                "configures",
                file.path,
                file.text.slice(0, match.index).split("\n").length - 1,
                "extracted",
              ),
            );
          }
        }
      }
    }
    const ids = new Set(result.nodes.map((n) => n.id));
    result.edges = [
      ...new Map(
        result.edges
          .filter((e) => ids.has(e.source) && ids.has(e.target))
          .map((e) => [e.id, e]),
      ).values(),
    ];
    result.gaps = [...new Set(result.gaps)].slice(0, 100);
    return result;
  }
}
