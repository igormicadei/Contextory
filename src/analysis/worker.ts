import { parentPort, workerData } from "node:worker_threads";
import { SourceEngine } from "./engine";
import type { FlowInput } from "../contracts/model";
const engine = new SourceEngine(workerData.root);
parentPort!.on("message", (message: { id: string; input: FlowInput }) => {
  try {
    parentPort!.postMessage({
      id: message.id,
      result: engine.trace(message.input),
    });
  } catch (error) {
    parentPort!.postMessage({
      id: message.id,
      error: {
        code: (error as { code?: string }).code ?? "ANALYSIS_FAILED",
        message: error instanceof Error ? error.message : "Analysis failed",
      },
    });
  }
});
