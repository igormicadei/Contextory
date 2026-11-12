import { Worker } from "node:worker_threads";
import { randomUUID } from "node:crypto";
import { RelayError, type FlowGraph, type FlowInput } from "../contracts/model";
import { PythonAnalysis } from "./python";
export class AnalysisManager {
  generation = 0;
  private worker?: Worker;
  private pending = new Map<
    string,
    {
      resolve(value: FlowGraph): void;
      reject(error: Error): void;
      timer: NodeJS.Timeout;
    }
  >();
  readonly graphs = new Map<string, { graph: FlowGraph; input: FlowInput }>();
  readonly python: PythonAnalysis;
  private pythonPending = 0;
  constructor(
    private root: string,
    private workerPath: string,
  ) {
    this.python = new PythonAnalysis(root, workerPath);
  }
  private ensure() {
    if (this.worker) return this.worker;
    const worker = new Worker(this.workerPath, {
      workerData: { root: this.root },
      resourceLimits: { maxOldGenerationSizeMb: 256 },
    });
    this.worker = worker;
    worker.on(
      "message",
      (message: {
        id: string;
        result?: FlowGraph;
        error?: { code: string; message: string };
      }) => {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(message.id);
        if (message.error)
          pending.reject(
            new RelayError(message.error.code, message.error.message),
          );
        else pending.resolve(message.result!);
      },
    );
    worker.on("error", (error) => {
      if (this.worker === worker) this.fail(error);
    });
    worker.on("exit", () => {
      if (this.worker === worker)
        this.fail(
          new RelayError(
            "ANALYSIS_INTERRUPTED",
            "Analysis worker exited. Retry to start a fresh worker.",
          ),
        );
    });
    return worker;
  }
  private fail(error: Error) {
    this.worker = undefined;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    this.pending.clear();
  }
  async trace(input: FlowInput): Promise<FlowGraph> {
    if (this.pending.size + this.pythonPending >= 2)
      throw new RelayError(
        "ANALYSIS_BUSY",
        "Two source queries are already queued. Retry after they finish.",
      );
    if (/\.py$/i.test(input.root.path)) {
      this.pythonPending++;
      try {
        const graph = await this.python.trace(input);
        this.remember(graph, input);
        return graph;
      } finally {
        this.pythonPending--;
      }
    }
    const worker = this.ensure();
    const id = randomUUID();
    const graph = await new Promise<FlowGraph>((resolve, reject) => {
      const timer = setTimeout(
        () => {
          void worker.terminate();
          this.fail(
            new RelayError(
              "ANALYSIS_TIMEOUT",
              "Source analysis exceeded its time budget. Use Calls mode or a smaller workspace.",
            ),
          );
        },
        (input.limits?.timeoutMs ?? 2000) + 500,
      );
      this.pending.set(id, { resolve, reject, timer });
      worker.postMessage({ id, input });
    });
    this.remember(graph, input);
    return graph;
  }
  remember(graph: FlowGraph, input: FlowInput) {
    if (this.graphs.size >= 20)
      this.graphs.delete(this.graphs.keys().next().value!);
    this.graphs.set(graph.id, { graph, input });
  }
  async close() {
    this.generation++;
    this.python.cancel();
    const worker = this.worker;
    this.fail(new RelayError("CANCELLED", "Analysis stopped."));
    await worker?.terminate();
  }
}
