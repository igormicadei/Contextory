/** Retries connection establishment only. Never accepts or replays a user operation. */
export class ReconnectLoop {
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;
  private disposed = false;
  private attempt = 0;
  constructor(
    private readonly connect: () => Promise<unknown>,
    private readonly waiting: (error: unknown, nextRetryAt: number) => void,
  ) {}
  request(error?: unknown) {
    if (this.disposed || this.timer || this.running) return;
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(this.attempt++, 5));
    this.waiting(error, Date.now() + delay);
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.retry();
    }, delay);
    this.timer.unref?.();
  }
  private async retry() {
    if (this.disposed) return;
    this.running = true;
    let failed = false;
    let error: unknown;
    try {
      await this.connect();
      this.reset();
    } catch (reason) {
      failed = true;
      error = reason;
    } finally {
      this.running = false;
    }
    if (failed) this.request(error);
  }
  reset() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.attempt = 0;
  }
  dispose() {
    this.disposed = true;
    this.reset();
  }
}
