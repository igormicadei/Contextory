export type ReloadMode = "prompt" | "automatic" | "never";
interface State {
  fingerprints: Record<string, string>;
  pending: boolean;
  offered: boolean;
}
export interface ReloadStore {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): Thenable<void> | Promise<void>;
}
const key = "contextory.setupReload";

/** Persists before prompting/restarting so reactivation cannot create a loop. */
export class SetupReload {
  private handling = false;
  constructor(
    readonly store: ReloadStore,
    readonly prompt: () => Promise<boolean>,
    readonly restart: () => Promise<unknown>,
  ) {}
  get pending() {
    return this.store.get<State>(key)?.pending ?? false;
  }
  async changed(provider: string, fingerprint: string, configChanged = false) {
    const state = this.store.get<State>(key) ?? {
      fingerprints: {},
      pending: false,
      offered: false,
    };
    if (!configChanged && state.fingerprints[provider] === fingerprint) return;
    await this.store.update(key, {
      fingerprints: { ...state.fingerprints, [provider]: fingerprint },
      pending: true,
      offered: false,
    });
  }
  async offer(mode: ReloadMode) {
    const state = this.store.get<State>(key);
    if (this.handling || mode === "never" || !state?.pending || state.offered)
      return;
    this.handling = true;
    try {
      await this.store.update(key, { ...state, offered: true });
      if (mode === "automatic" || (await this.prompt())) {
        const current = this.store.get<State>(key);
        await this.store.update(key, {
          ...current,
          offered: true,
          pending: false,
        });
        await this.restart();
      }
    } finally {
      this.handling = false;
    }
  }
}
