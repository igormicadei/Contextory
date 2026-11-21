import { lstat, mkdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { ContextoryError, type Actor } from "../contracts/model";
import type { Input } from "../contracts/tools";
import type { Ledger } from "../storage/ledger";
import { writeAtomic } from "../storage/atomic";
import { hookEvents } from "./clients";
import { rebuildProviderHooks } from "./registration";

export class HookRecovery {
  private pending: Promise<unknown> = Promise.resolve();
  constructor(
    private ledger: Ledger,
    private storage: string,
    private packagedHook: string,
  ) {}

  rebuild(input: Input<"contextory_hooks_rebuild">, actor: Actor) {
    const work = this.pending.then(() => this.apply(input, actor));
    this.pending = work.catch(() => {});
    return work;
  }

  private async apply(input: Input<"contextory_hooks_rebuild">, actor: Actor) {
    const method = "hooks.rebuild";
    const retained = this.ledger.db
      .prepare("SELECT id FROM operations WHERE id=?")
      .get(input.operationId);
    if (retained)
      return this.ledger.transaction(
        input.operationId,
        actor,
        method,
        input,
        () => {
          throw new Error("Missing retained hook rebuild result.");
        },
      );

    // Read the trusted packaged asset before touching any project files. Neither
    // the executable, launcher nor descriptor paths are supplied by the agent.
    const source = await readFile(this.packagedHook);
    const runtime = join(this.storage, "runtime");
    await mkdir(runtime, { recursive: true });
    if ((await lstat(runtime)).isSymbolicLink())
      throw new ContextoryError(
        "LINKED_CONFIG",
        "Linked hook runtime directories are preserved.",
      );
    const hook = join(runtime, "contextory-hook.mjs");
    const hookInfo = await lstat(hook).catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    if (hookInfo && (!hookInfo.isFile() || hookInfo.isSymbolicLink()))
      throw new ContextoryError(
        "LINKED_CONFIG",
        "Hook launchers must be regular files; the existing path was preserved.",
      );
    const previous = await readFile(hook).catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    const launcherChanged = !previous?.equals(source);
    const changedFiles = await rebuildProviderHooks({
      root: this.ledger.root,
      provider: input.provider,
      node: process.execPath,
      proxy: join(runtime, "mcp-proxy.mjs"),
      descriptor: join(this.storage, `${input.provider}.json`),
      hook,
      hookDescriptor: join(this.storage, `${input.provider}-hook.json`),
    });
    if (launcherChanged) await writeAtomic(hook, source);
    const result = {
      provider: input.provider,
      status: changedFiles.length || launcherChanged ? "rebuilt" : "unchanged",
      changedFiles: changedFiles.map((file) =>
        relative(this.ledger.root, file).replaceAll("\\", "/"),
      ),
      launcherChanged,
      events: hookEvents(input.provider),
      trust: "client-owned",
      instruction:
        "Contextory hook files are ready. This does not confirm execution or change native hook trust. Review hooks in the affected native session and reload it if needed. For Codex use /hooks (or Settings > Hooks), keeping the same workspace path casing: C: and c: can have different saved approvals. If an unchanged rebuild leaves hooks unobserved, check native trust and service logs instead of rebuilding repeatedly. A running Contextory service is required for the MCP tool; use Contextory: Rebuild Agent Hooks in the editor when MCP is unavailable.",
    };
    return this.ledger.transaction(
      input.operationId,
      actor,
      method,
      input,
      () => {
        this.ledger.audit("hooks.rebuilt", this.ledger.projectId, actor, {
          title: `${input.provider} hooks (${result.status})`,
          provider: input.provider,
          status: result.status,
          changedFiles: result.changedFiles,
          launcherChanged,
        });
        return result;
      },
    );
  }
}
