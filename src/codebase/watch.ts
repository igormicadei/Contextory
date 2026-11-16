import { watch, type FSWatcher } from "node:fs";
import type { CodebaseIndex } from "./index";

export function watchCodebase(index: CodebaseIndex) {
  let watcher: FSWatcher | undefined;
  try {
    watcher = watch(index.ledger.root, { recursive: true }, (_event, name) => {
      const path = String(name ?? "").replaceAll("\\", "/");
      if (
        !path ||
        path === ".git/HEAD" ||
        path === ".git/index" ||
        path.startsWith(".git/refs/")
      )
        index.schedule();
      else if (
        !/(^|\/)(?:node_modules|\.git|\.contextory-local|dist|build|artifacts|coverage|test-results|playwright-report|\.agents|\.codex|\.claude|\.bob|\.venv|__pycache__)(\/|$)/.test(
          path,
        )
      )
        index.schedule();
    });
    watcher.on("error", () => {
      watcher?.close();
      watcher = undefined;
    });
    watcher.unref();
  } catch {
    /* The bounded poll below also covers hosts without recursive watch. */
  }
  const poll = setInterval(() => index.schedule(50), 30000);
  poll.unref();
  index.schedule(25);
  return () => {
    watcher?.close();
    clearInterval(poll);
  };
}
