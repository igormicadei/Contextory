import { createHash } from "node:crypto";

export const extractorVersion = "contextory-code-1";
export type CodeKind =
  | "file"
  | "function"
  | "class"
  | "interface"
  | "type"
  | "variable"
  | "method"
  | "section"
  | "package"
  | "contract";
export interface CodeNode {
  id: string;
  kind: CodeKind;
  label: string;
  qualifiedName: string;
  path: string;
  line: number;
  endLine: number;
  character: number;
  language: string;
  signature: string;
  text: string;
  test: boolean;
  origin: "native" | "graphify";
}
export interface CodeEdge {
  id: string;
  source: string;
  target: string;
  kind: string;
  path: string;
  line: number;
  category: "extracted" | "resolved" | "inferred" | "ambiguous";
  extractor: string;
  detail: string;
}
export interface CodeFile {
  path: string;
  hash: string;
  language: string;
  text: string;
}
export interface CodeExtraction {
  nodes: CodeNode[];
  edges: CodeEdge[];
  gaps: string[];
}
export interface CodeImport extends CodeExtraction {
  sourceHashes: Record<string, string>;
}
export interface CodeStatus {
  state: "empty" | "ready" | "building" | "stale" | "failed";
  snapshotId: string;
  indexedAt?: string;
  files: number;
  symbols: number;
  edges: number;
  partial: boolean;
  gaps: string[];
  changedFiles: number;
}
export const codeId = (...parts: string[]) =>
  "code:" +
  createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
export const fileId = (path: string) => codeId("file", path);
export function codeEdge(
  source: string,
  target: string,
  kind: string,
  path: string,
  line: number,
  category: CodeEdge["category"] = "resolved",
  detail = "",
): CodeEdge {
  return {
    id: codeId(source, target, kind, path, String(line)),
    source,
    target,
    kind,
    path,
    line,
    category,
    extractor: extractorVersion,
    detail,
  };
}
export const isTestPath = (path: string) =>
  /(^|\/)(__tests__|tests?|specs?)(\/|$)|[._-](test|spec)\.[^/]+$|(^|\/)test_[^/]+\.py$/.test(
    path,
  );
export function fileNode(file: CodeFile): CodeNode {
  return {
    id: fileId(file.path),
    kind: "file",
    label: file.path.split("/").pop()!,
    qualifiedName: file.path,
    path: file.path,
    line: 0,
    endLine: file.text.split("\n").length - 1,
    character: 0,
    language: file.language,
    signature: file.path,
    text: file.text.slice(0, 1600),
    test: isTestPath(file.path),
    origin: "native",
  };
}
