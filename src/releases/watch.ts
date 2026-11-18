import { watch, type FSWatcher } from "node:fs";
import type { ReleaseManager } from "./manager";

/** Observation only: never bump, commit, tag or publish from filesystem events. */
export function watchReleases(manager: ReleaseManager, pollMs = 30000) {
  let stopped = false,
    running = false,
    timer: NodeJS.Timeout | undefined,
    watcher: FSWatcher | undefined;
  const schedule = () => {
    if (stopped || timer || running) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (!stopped) {
        running = true;
        void manager
          .observe()
          .catch(() => {})
          .finally(() => {
            running = false;
          });
      }
    }, 250);
    timer.unref();
  };
  try {
    watcher = watch(
      manager.ledger.root,
      { recursive: true },
      (_event, filename) => {
        const path = String(filename ?? "").replaceAll("\\", "/");
        if (
          !path ||
          /^(?:\.git\/(?:HEAD|index|packed-refs|refs\/)|contextory\.release\.json$|package(?:-lock)?\.json$|contextory\.version\.json$)/.test(
            path,
          )
        )
          schedule();
      },
    );
    watcher.on("error", () => {
      watcher?.close();
      watcher = undefined;
    });
    watcher.unref();
  } catch {
    /* Poll also covers linked worktrees, packed refs and custom version files. */
  }
  const poll = setInterval(schedule, pollMs);
  poll.unref();
  schedule();
  return () => {
    stopped = true;
    watcher?.close();
    clearInterval(poll);
    if (timer) clearTimeout(timer);
  };
}
