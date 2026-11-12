import { spawn, type ChildProcess } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import {
  flowDefaults,
  RelayError,
  type FlowGraph,
  type FlowInput,
} from "../contracts/model";
import { workspaceFiles, workspacePath } from "../verification/workspace";

export class PythonAnalysis {
  executable = "python";
  private children = new Set<ChildProcess>();
  private generation = 0;
  constructor(
    private root: string,
    private workerPath: string,
  ) {}
  cancel() {
    this.generation++;
    for (const child of this.children) child.kill();
  }
  async trace(input: FlowInput): Promise<FlowGraph> {
    const generation = this.generation;
    const began = Date.now();
    const limits = { ...flowDefaults, ...input.limits };
    const rootPath = input.root.path.replaceAll("\\", "/");
    const paths = [
      rootPath,
      ...(await workspaceFiles(this.root)).filter(
        (p) =>
          /\.py$/.test(p) &&
          p !== rootPath &&
          !/(^|\/)(?:\.venv|venv|__pycache__)(\/|$)/.test(p),
      ),
    ];
    const files: Record<string, string> = {};
    const gaps: string[] = [];
    let size = 0;
    for (const path of paths) {
      if (generation !== this.generation)
        throw new RelayError("CANCELLED", "Python analysis stopped.");
      if (
        Object.keys(files).length >= 500 ||
        size >= 12 * 1024 * 1024 ||
        Date.now() - began > limits.timeoutMs
      ) {
        gaps.push(
          "Workspace scan reached its file, byte or time limit; imports and incoming callers may be incomplete.",
        );
        break;
      }
      try {
        const safe = await workspacePath(this.root, path);
        const text = input.overlays?.[path] ?? (await readFile(safe, "utf8"));
        if (text.length > 512 * 1024) {
          gaps.push(`Skipped large Python source: ${path}`);
          continue;
        }
        files[path] = text;
        size += text.length;
      } catch (error) {
        if (path === rootPath) throw error;
        gaps.push(`Skipped unreadable or external source: ${path}`);
      }
    }
    if (!files[rootPath])
      throw new RelayError(
        "UNREADABLE_SOURCE",
        "Choose a readable Python source file under 512 KiB.",
      );
    const snapshotId = createHash("sha256")
      .update(JSON.stringify(files))
      .digest("hex");
    const remaining = Math.max(100, limits.timeoutMs - (Date.now() - began));
    const graph = await new Promise<FlowGraph>((resolve, reject) => {
      if (generation !== this.generation) {
        reject(new RelayError("CANCELLED", "Python analysis stopped."));
        return;
      }
      const child = spawn(
        this.executable,
        ["-I", "-X", "utf8", join(dirname(this.workerPath), "python-flow.py")],
        { windowsHide: true, shell: false, stdio: ["pipe", "pipe", "pipe"] },
      );
      this.children.add(child);
      let output = "",
        stderr = "",
        failure: Error | undefined;
      const timer = setTimeout(() => {
        failure = new RelayError(
          "ANALYSIS_TIMEOUT",
          "Python analysis exceeded its time budget. Reduce the workspace or increase timeoutMs.",
        );
        child.kill();
      }, remaining + 500);
      child.stdout!.on("data", (chunk) => {
        output += chunk;
        if (output.length > 3 * 1024 * 1024) {
          failure = new RelayError(
            "SOURCE_LIMIT",
            "Python graph exceeded its output bound.",
          );
          child.kill();
        }
      });
      child.stderr!.on("data", (chunk) => {
        stderr = (stderr + chunk).slice(-2000);
      });
      child.stdin!.on("error", () => {});
      child.once("error", () => {
        failure = new RelayError(
          "PYTHON_REQUIRED",
          "Python 3.10+ is required for Python source flow. Configure relay.pythonExecutable with its executable path.",
        );
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        this.children.delete(child);
        if (generation !== this.generation)
          reject(new RelayError("CANCELLED", "Python analysis stopped."));
        else if (failure) reject(failure);
        else if (code !== 0)
          reject(
            new RelayError(
              "PYTHON_ANALYSIS_FAILED",
              stderr || "Python parser failed.",
            ),
          );
        else
          try {
            const value = JSON.parse(output);
            if (value.error)
              reject(new RelayError(value.error.code, value.error.message));
            else resolve(value);
          } catch {
            reject(
              new RelayError(
                "PYTHON_ANALYSIS_FAILED",
                "Python parser returned invalid output.",
              ),
            );
          }
      });
      child.stdin!.end(
        JSON.stringify({
          input: { ...input, root: { ...input.root, path: rootPath } },
          files,
          limits: { ...limits, timeoutMs: remaining },
          snapshotId,
          gaps,
        }),
      );
    });
    graph.durationMs = Date.now() - began;
    graph.limits = limits;
    return graph;
  }
}
