import { rename, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

// Windows readers and scanners can temporarily deny atomic replacement. Keep
// the old file intact and retry the rename; never fall back to deleting it.
export async function replaceFile(
  from: string,
  to: string,
  move = rename,
  pause: (ms: number) => Promise<unknown> = delay,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      await move(from, to);
      return;
    } catch (error) {
      if (
        !["EPERM", "EACCES", "EBUSY"].includes(
          (error as NodeJS.ErrnoException).code ?? "",
        ) ||
        attempt === 5
      )
        throw error;
      await pause(50 * 2 ** attempt);
    }
  }
}

export async function writeAtomic(path: string, content: string | Uint8Array) {
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, { mode: 0o600, flag: "wx" });
    await replaceFile(temporary, path);
  } finally {
    await unlink(temporary).catch(() => {});
  }
}
