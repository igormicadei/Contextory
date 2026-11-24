import ts from "typescript";
import { readFile, readdir } from "node:fs/promises";

// Extract source-owned messages only; interpolation values are never cataloged.
export function markupKeys(text) {
  const found = [];
  const add = (s) => {
    let i = 0;
    const key = s
      .replace(/\uE000\d+\uE001/g, () => `{${i++}}`)
      .trim()
      .replace(/\s+/g, " ");
    if (
      /[A-Za-z]/.test(key.replace(/&[a-z]+;/g, "")) &&
      !/^[\d{}\s\W]+$/.test(key)
    )
      found.push(key);
  };
  if (!/<\/?[a-z!]|\b(?:aria-label|title|placeholder|alt)=/i.test(text)) {
    if (
      !/^[.#\[]|^[\w-]+[:=]|^[\w-]+(?:\uE000\d+\uE001)?(?:[.\w-]*)$|^M\uE000/.test(
        text.trim(),
      )
    )
      add(text);
    return found;
  }
  if (!/<\/?[a-z!]/i.test(text)) {
    for (const m of text.matchAll(
      /\b(?:title|aria-label|placeholder|alt)=(?:"([^"]*)"|'([^']*)')/g,
    ))
      add(m[1] ?? m[2]);
    return found;
  }
  let literal = false;
  for (const part of text.split(/(<(?:[^>"']|"[^"]*"|'[^']*')*>)/g)) {
    if (part.startsWith("<")) {
      if (/^<\/(?:pre|code|script|style)\b/i.test(part)) literal = false;
      else if (/^<(?:pre|code|script|style)\b/i.test(part)) literal = true;
      for (const m of part.matchAll(
        /\b(?:title|aria-label|placeholder|alt)=(?:"([^"]*)"|'([^']*)')/g,
      ))
        add(m[1] ?? m[2]);
    } else if (!literal) add(part);
  }
  return found;
}
export async function localizationKeys() {
  const files = (await readdir("src/webview"))
    .filter((f) => f.endsWith(".ts"))
    .map((f) => `src/webview/${f}`)
    .concat(["src/extension.ts", "src/editor/calls.ts"]);
  const keys = new Set();
  for (const file of files) {
    const ast = ts.createSourceFile(
      file,
      await readFile(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const walk = (n) => {
      if (
        ts.isCallExpression(n) &&
        n.expression.getText(ast) === "tx" &&
        ts.isStringLiteral(n.arguments[0])
      )
        keys.add(n.arguments[0].text);
      if (
        ts.isCallExpression(n) &&
        n.expression.getText(ast) === "ui" &&
        ts.isStringLiteral(n.arguments[0])
      )
        for (const key of markupKeys(n.arguments[0].text)) keys.add(key);
      if (ts.isTaggedTemplateExpression(n) && n.tag.getText(ast) === "ui") {
        const t = n.template;
        const text = ts.isNoSubstitutionTemplateLiteral(t)
          ? t.text
          : t.head.text +
            t.templateSpans
              .map((span, i) => `\uE000${i}\uE001${span.literal.text}`)
              .join("");
        for (const key of markupKeys(text)) keys.add(key);
      }
      ts.forEachChild(n, walk);
    };
    walk(ast);
  }
  keys.add("Contextory — Workspace Tasks");
  const usage = ts.createSourceFile(
    "usage.ts",
    await readFile("src/core/usage.ts", "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const reader = ts.createSourceFile(
    "reader.ts",
    await readFile("src/documentation/reader.ts", "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const systemMessages = (n) => {
    if (
      ts.isVariableDeclaration(n) &&
      n.name.getText(usage) === "usageNote" &&
      n.initializer &&
      ts.isStringLiteral(n.initializer)
    )
      keys.add(n.initializer.text);
    if (
      ts.isPropertyAssignment(n) &&
      n.name.getText(reader) === "note" &&
      ts.isStringLiteral(n.initializer)
    )
      keys.add(n.initializer.text);
    if (
      ts.isPropertyAssignment(n) &&
      n.name.getText(reader) === "provenance" &&
      ts.isConditionalExpression(n.initializer)
    ) {
      for (const value of [n.initializer.whenTrue, n.initializer.whenFalse])
        if (ts.isStringLiteral(value)) keys.add(value.text);
    }
    ts.forEachChild(n, systemMessages);
  };
  systemMessages(usage);
  systemMessages(reader);
  const history = ts.createSourceFile(
    "history.ts",
    await readFile("src/core/history.ts", "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  for (const statement of history.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const d of statement.declarationList.declarations) {
      if (
        !["activityVerbs", "nativeActivityActions"].includes(
          d.name.getText(history),
        ) ||
        !d.initializer ||
        !ts.isObjectLiteralExpression(d.initializer)
      )
        continue;
      for (const p of d.initializer.properties)
        if (ts.isPropertyAssignment(p) && ts.isStringLiteral(p.initializer))
          keys.add(p.initializer.text);
    }
  }
  return [...keys]
    .filter(
      (k) => !["explorer-item {0}", "{0}-hook.json", "{0}.json"].includes(k),
    )
    .sort();
}
