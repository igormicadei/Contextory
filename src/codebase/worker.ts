import { parentPort, workerData } from "node:worker_threads";
import { execFile } from "node:child_process";
import { CodeExtractor } from "./extract";
import type { CodeExtraction, CodeFile } from "./model";

const extractor = new CodeExtractor();
parentPort!.on(
  "message",
  async (message: {
    id: string;
    files: CodeFile[];
    python: string;
    pythonScript: string;
  }) => {
    try {
      const result = extractor.extract(workerData.root, message.files);
      const files = Object.fromEntries(
        message.files
          .filter((f) => f.language === "python")
          .map((f) => [f.path, f.text]),
      );
      if (Object.keys(files).length) {
        try {
          const parsed = await new Promise<CodeExtraction>(
            (resolve, reject) => {
              const child = execFile(
                message.python,
                ["-I", "-X", "utf8", message.pythonScript],
                {
                  windowsHide: true,
                  timeout: 15000,
                  maxBuffer: 12 * 1024 * 1024,
                },
                (error, stdout) => {
                  if (error) reject(error);
                  else {
                    try {
                      resolve(JSON.parse(stdout));
                    } catch (e) {
                      reject(e);
                    }
                  }
                },
              );
              child.stdin!.end(JSON.stringify({ files }));
              child.stdin!.on("error", () => {});
            },
          );
          if (!Array.isArray(parsed.nodes))
            throw new Error("Invalid Python AST response");
          result.nodes.push(...parsed.nodes);
          result.edges.push(...parsed.edges);
          result.gaps.push(...parsed.gaps);
        } catch (error) {
          result.gaps.push(
            `Python symbols unavailable: ${error instanceof Error ? error.message.slice(0, 200) : "parser failed"}`,
          );
        }
      }
      if (result.nodes.length > 20000 || result.edges.length > 100000) {
        result.gaps.push(
          "Graph capacity reached (20,000 nodes / 100,000 edges). Narrow project inputs.",
        );
        result.nodes = result.nodes.slice(0, 20000);
        const ids = new Set(result.nodes.map((n) => n.id));
        result.edges = result.edges
          .filter((e) => ids.has(e.source) && ids.has(e.target))
          .slice(0, 100000);
      }
      parentPort!.postMessage({ id: message.id, result });
    } catch (error) {
      parentPort!.postMessage({
        id: message.id,
        error: error instanceof Error ? error.message : "Extraction failed",
      });
    }
  },
);
