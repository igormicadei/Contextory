import { setTimeout as delay } from "node:timers/promises";

export const foregroundReadinessMs = 15000;
export const backgroundReadinessMs = 5 * 60 * 1000;

/** Retries only read-only probes; a foreground timeout does not stop discovery. */
export class WorkspaceReadiness {
  private readiness?: Promise<void>;
  private observation?: Promise<void>;

  constructor(
    private readonly probe: (timeoutMs: number) => Promise<void>,
    private readonly signal: AbortSignal,
  ) {}

  wait(timeoutMs = foregroundReadinessMs): Promise<void> {
    return (this.readiness ??= this.retry(timeoutMs).finally(() => {
      // Never cache success across a reopened workspace or rotated descriptor.
      this.readiness = undefined;
    }));
  }

  observe(): Promise<void> {
    return (this.observation ??= (async () => {
      const deadline = Date.now() + backgroundReadinessMs;
      while (true) {
        try {
          await this.wait(
            Math.min(foregroundReadinessMs, deadline - Date.now()),
          );
          return;
        } catch (error) {
          if (
            this.signal.aborted ||
            (error as { code?: string }).code === "SERVICE_RESTART_REQUIRED" ||
            Date.now() >= deadline
          )
            throw error;
        }
      }
    })().finally(() => {
      this.observation = undefined;
    }));
  }

  private async retry(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let pause = 100;
    while (!this.signal.aborted) {
      try {
        await this.probe(Math.min(1000, Math.max(1, deadline - Date.now())));
        return;
      } catch (error) {
        if (
          (error as { code?: string }).code === "SERVICE_RESTART_REQUIRED" ||
          Date.now() >= deadline
        )
          throw error;
        await delay(Math.min(pause, deadline - Date.now()), undefined, {
          signal: this.signal,
        });
        pause = Math.min(1000, pause * 2);
      }
    }
    throw new Error("Native MCP connection closed.");
  }
}
