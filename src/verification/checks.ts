import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { Workflow } from "../core/workflow";
import { sourceSnapshot } from "./workspace";
import {
  RelayError,
  type Actor,
  type CheckRecipe,
  type SourceSnapshot,
} from "../contracts/model";
import type { Input } from "../contracts/tools";
export class CheckRunner {
  readonly running = new Map<string, AbortController>();
  constructor(
    private workflow: Workflow,
    private artifactRoot: string,
    public recipes: CheckRecipe[],
  ) {}
  start(a: Input<"relay_check_run">, actor: Actor) {
    const ledger = this.workflow.ledger;
    const result = ledger.transaction(a.operationId, actor, "check", a, () => {
      const spec = this.workflow.assertLease(a.specId, a.leaseId, actor);
      this.workflow.criteria(spec, a.criteria);
      const recipe = this.recipes.find((r) => r.id === a.recipeId);
      if (!recipe)
        throw new RelayError(
          "UNKNOWN_RECIPE",
          "Choose a check recipe configured by the developer.",
        );
      const id = `JOB-${randomUUID()}`;
      ledger.db.prepare("INSERT INTO jobs VALUES (?,?,?)").run(
        id,
        "queued",
        JSON.stringify({
          specId: spec.id,
          criteria: a.criteria,
          contract: spec.data.contract,
          generation: spec.data.generation,
          recipe,
        }),
      );
      ledger.audit("check.queued", spec.id, actor, {
        jobId: id,
        recipe: recipe.id,
      });
      return { jobId: id, state: "queued" };
    });
    const row = ledger.db
      .prepare("SELECT state,data FROM jobs WHERE id=?")
      .get(result.jobId);
    if (row?.state === "queued") {
      ledger.db
        .prepare("UPDATE jobs SET state='running' WHERE id=?")
        .run(result.jobId);
      void this.execute(result.jobId, JSON.parse(String(row.data))).catch(
        (error) => {
          ledger.db
            .prepare("UPDATE jobs SET state=?,data=? WHERE id=?")
            .run(
              "failed",
              JSON.stringify({ error: String(error) }),
              result.jobId,
            );
          ledger.onChange();
        },
      );
    }
    return result;
  }
  private async execute(
    id: string,
    job: {
      specId: string;
      criteria: string[];
      contract: string;
      generation: number;
      recipe: CheckRecipe;
    },
  ) {
    const ledger = this.workflow.ledger;
    const actor = { id: "relay-runner", human: false };
    const controller = new AbortController();
    this.running.set(id, controller);
    let detail = "";
    let result = "failed";
    let before: SourceSnapshot | undefined;
    let after: SourceSnapshot | undefined;
    let exitCode: number | null = null;
    const startedAt = new Date().toISOString();
    try {
      before = await sourceSnapshot(ledger.root);
      if (controller.signal.aborted)
        throw new Error("Check was cancelled before execution.");
      const output = await new Promise<{ text: string; code: number | null }>(
        (resolve, reject) => {
          const child = spawn(job.recipe.executable, job.recipe.args, {
            cwd: ledger.root,
            shell: false,
            windowsHide: true,
            stdio: ["ignore", "pipe", "pipe"],
          });
          let text = "";
          let truncated = false;
          const append = (chunk: Buffer) => {
            if (text.length < 128 * 1024)
              text += chunk.toString("utf8").slice(0, 128 * 1024 - text.length);
            else truncated = true;
          };
          child.stdout.on("data", append);
          child.stderr.on("data", append);
          const stop = () => {
            if (process.platform === "win32" && child.pid)
              spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
                windowsHide: true,
                stdio: "ignore",
              });
            else child.kill("SIGTERM");
          };
          const timer = setTimeout(() => {
            controller.abort();
          }, job.recipe.timeoutMs ?? 120000);
          controller.signal.addEventListener("abort", stop, { once: true });
          child.once("error", (error) => {
            clearTimeout(timer);
            controller.signal.removeEventListener("abort", stop);
            reject(error);
          });
          child.once("close", (code) => {
            clearTimeout(timer);
            controller.signal.removeEventListener("abort", stop);
            resolve({
              text: text + (truncated ? "\n[Output truncated at 128 KiB]" : ""),
              code,
            });
          });
        },
      );
      after = await sourceSnapshot(ledger.root);
      detail = output.text;
      exitCode = output.code;
      result = controller.signal.aborted
        ? "interrupted"
        : before.hash !== after.hash
          ? "stale"
          : output.code === 0
            ? "passed"
            : "failed";
    } catch (error) {
      detail = error instanceof Error ? error.message : "Check failed";
      result = controller.signal.aborted ? "interrupted" : "failed";
    }
    try {
      await mkdir(this.artifactRoot, { recursive: true });
      await writeFile(join(this.artifactRoot, `${id}.txt`), detail, "utf8");
      ledger.transaction(`runner:${id}`, actor, "runner-result", { id }, () => {
        const evidence = ledger.create(
          "evidence",
          job.recipe.name,
          {
            origin: "relay-runner",
            recipeId: job.recipe.id,
            recipe: job.recipe,
            criteria: job.criteria,
            contract: job.contract,
            generation: job.generation,
            snapshot: before ?? after,
            afterSnapshot: after,
            exitCode,
            detail: detail.slice(-4000),
            artifact: `${id}.txt`,
            startedAt,
            finishedAt: new Date().toISOString(),
          },
          job.specId,
          result,
        );
        ledger.db
          .prepare("UPDATE jobs SET state=?,data=? WHERE id=?")
          .run(
            result,
            JSON.stringify({ ...job, evidenceId: evidence.id, exitCode }),
            id,
          );
        ledger.audit(`check.${result}`, job.specId, actor, {
          jobId: id,
          evidenceId: evidence.id,
        });
        return evidence;
      });
    } finally {
      this.running.delete(id);
    }
  }
  cancel(id: string) {
    const running = this.running.get(id);
    if (!running)
      throw new RelayError("NOT_RUNNING", "This job is no longer running.");
    running.abort();
  }
  job(id: string): { state: string; data: unknown } {
    const row = this.workflow.ledger.db
      .prepare("SELECT * FROM jobs WHERE id=?")
      .get(id);
    if (!row) throw new RelayError("NOT_FOUND", "Check job was not found.");
    return { state: String(row.state), data: JSON.parse(String(row.data)) };
  }
  async close() {
    for (const job of this.running.values()) job.abort();
    while (this.running.size)
      await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
