import { tx } from "../i18n";
import * as vscode from "vscode";
import { createHash, randomUUID } from "node:crypto";
import { relative } from "node:path";
import {
  flowDefaults,
  ContextoryError,
  type FlowGraph,
  type FlowInput,
} from "../contracts/model";
import { workspacePath } from "../verification/workspace";
export async function editorCallGraph(
  root: string,
  input: FlowInput,
): Promise<FlowGraph> {
  const started = Date.now();
  const limits = { ...flowDefaults, ...input.limits };
  const bounded = async <T>(work: Thenable<T>): Promise<T> => {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new ContextoryError(
                  "EDITOR_TIMEOUT",
                  tx("Language service exceeded the source query budget."),
                ),
              ),
            Math.max(1, limits.timeoutMs - (Date.now() - started)),
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  const uri = vscode.Uri.file(await workspacePath(root, input.root.path));
  const doc = await bounded(vscode.workspace.openTextDocument(uri));
  const position = input.root.position
    ? new vscode.Position(
        input.root.position.line,
        input.root.position.character,
      )
    : new vscode.Position(0, 0);
  const candidates = await bounded(
    vscode.commands.executeCommand<vscode.CallHierarchyItem[]>(
      "vscode.prepareCallHierarchy",
      uri,
      position,
    ),
  );
  if (!candidates?.length)
    throw new ContextoryError(
      "NO_CALL_PROVIDER",
      tx(
        "No installed language service resolved a call hierarchy here. Use TS/JS Flow mode or enable a language extension.",
      ),
    );
  const graph: FlowGraph = {
    id: randomUUID(),
    snapshotId: "",
    root: input.root,
    view: "calls",
    engine: "editor-call-hierarchy",
    nodes: [],
    edges: [],
    frontier: [],
    gaps: [
      tx(
        "Possible caller/callee relationships from the installed language service; no branch order or runtime execution is implied.",
      ),
    ],
    limits,
    partial: false,
    unsaved: doc.isDirty,
    durationMs: 0,
  };
  const snapshots = new Map<string, string>();
  const seen = new Map<string, string>();
  const queue: {
    item: vscode.CallHierarchyItem;
    depth: number;
    ancestors: string[];
  }[] = [];
  const itemKey = (item: vscode.CallHierarchyItem) =>
    `${item.uri.toString()}:${item.range.start.line}:${item.range.start.character}`;
  const add = async (
    item: vscode.CallHierarchyItem,
    depth: number,
    ancestors: string[],
  ) => {
    const key = itemKey(item);
    const old = seen.get(key);
    if (old) return old;
    if (graph.nodes.length >= limits.nodes) {
      graph.partial = true;
      return undefined;
    }
    const path = relative(root, item.uri.fsPath).replaceAll("\\", "/");
    if (
      item.uri.scheme !== "file" ||
      !(await workspacePath(root, path).catch(() => undefined))
    )
      return undefined;
    const source = await bounded(vscode.workspace.openTextDocument(item.uri));
    snapshots.set(path, source.getText());
    graph.unsaved ||= source.isDirty;
    const id = `n${seen.size}`;
    seen.set(key, id);
    graph.nodes.push({
      id,
      label: item.name,
      kind: "function",
      depth,
      source: {
        path,
        line: item.selectionRange.start.line,
        character: item.selectionRange.start.character,
      },
      detail: item.detail,
    });
    queue.push({ item, depth, ancestors });
    return id;
  };
  const rootItem = input.root.symbol
    ? (candidates.find((item) => item.name === input.root.symbol) ??
      candidates[0])
    : candidates[0];
  await add(rootItem, 0, []);
  while (queue.length && Date.now() - started < limits.timeoutMs) {
    const current = queue.shift()!;
    const from = seen.get(itemKey(current.item))!;
    if (current.depth >= limits.callDepth) {
      graph.frontier.push({ nodeId: from, reason: "depth", handle: from });
      continue;
    }
    const incoming = input.direction === "incoming";
    let calls: (
      | vscode.CallHierarchyOutgoingCall
      | vscode.CallHierarchyIncomingCall
    )[];
    try {
      calls =
        (await bounded(
          vscode.commands.executeCommand<
            (
              | vscode.CallHierarchyOutgoingCall
              | vscode.CallHierarchyIncomingCall
            )[]
          >(
            incoming
              ? "vscode.provideIncomingCalls"
              : "vscode.provideOutgoingCalls",
            current.item,
          ),
        )) ?? [];
    } catch (error) {
      graph.partial = true;
      graph.frontier.push({
        nodeId: from,
        reason: error instanceof Error ? error.message : "provider failure",
      });
      break;
    }
    if (calls.length > limits.targetsPerCall) {
      graph.frontier.push({ nodeId: from, reason: "fanout", handle: from });
      graph.partial = true;
    }
    for (const call of calls.slice(0, limits.targetsPerCall)) {
      if (
        Date.now() - started >= limits.timeoutMs ||
        graph.edges.length >= limits.edges
      ) {
        graph.partial = true;
        graph.frontier.push({ nodeId: from, reason: "time/edges" });
        break;
      }
      const target = "to" in call ? call.to : call.from;
      const to = await add(target, current.depth + 1, [
        ...current.ancestors,
        itemKey(current.item),
      ]);
      if (!to) {
        graph.frontier.push({ nodeId: from, reason: "external/nodes" });
        continue;
      }
      const recursive =
        current.ancestors.includes(itemKey(target)) ||
        itemKey(current.item) === itemKey(target);
      graph.edges.push({
        id: `e${graph.edges.length}`,
        from: incoming ? to : from,
        to: incoming ? from : to,
        kind: "calls",
        label: recursive ? "recursion" : "call",
      });
    }
  }
  if (queue.length) {
    graph.partial = true;
    graph.frontier.push({ nodeId: graph.nodes[0].id, reason: "time" });
  }
  graph.snapshotId = createHash("sha256")
    .update(JSON.stringify([...snapshots].sort()))
    .digest("hex");
  graph.durationMs = Date.now() - started;
  return graph;
}
