import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { realpath } from "node:fs/promises";
import { ContextoryError } from "../contracts/model";
const exec = promisify(execFile);
export const redactGit = (text: string) =>
  text.replace(/(https?:\/\/)[^/@\s]+@/g, "$1[redacted]@");
export interface GitCommit {
  hash: string;
  parents: string[];
  date: string;
  subject: string;
  body: string;
  bodyTruncated: boolean;
  breaking: boolean;
}
export class ReleaseGit {
  constructor(readonly root: string) {}
  async run(args: string[], timeout = 30000, input?: string) {
    try {
      const command = exec("git", args, {
        cwd: this.root,
        windowsHide: true,
        timeout,
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      });
      if (input !== undefined) command.child.stdin!.end(input);
      return (await command).stdout.trimEnd();
    } catch (error) {
      const e = error as Error & { stderr?: string; code?: unknown };
      throw Object.assign(
        new ContextoryError(
          "GIT_FAILED",
          redactGit((e.stderr || e.message).slice(-3000)),
        ),
        { exitCode: e.code },
      );
    }
  }
  async assertRoot() {
    const top = await this.run(["rev-parse", "--show-toplevel"]);
    if ((await realpath(top)) !== (await realpath(this.root)))
      throw new ContextoryError(
        "GIT_ROOT_REQUIRED",
        "Open the Git repository root to manage project releases; parent repositories are outside this workspace scope.",
      );
  }
  async head() {
    return this.run(["rev-parse", "--verify", "HEAD"]);
  }
  async branch() {
    return this.run(["symbolic-ref", "--quiet", "--short", "HEAD"]);
  }
  async dirty() {
    return this.run(["status", "--porcelain=v1", "--untracked-files=normal"]);
  }
  async ancestor(before: string, after: string) {
    try {
      await this.run(["merge-base", "--is-ancestor", before, after]);
      return true;
    } catch (error) {
      if ((error as { exitCode?: number }).exitCode === 1) return false;
      throw error;
    }
  }
  async commits(head: string, base?: string): Promise<GitCommit[]> {
    const raw = await this.run([
      "log",
      "--reverse",
      "-10001",
      "-z",
      "--format=%H%x00%P%x00%aI%x00%s%x00%B",
      base ? `${base}..${head}` : head,
      "--",
    ]);
    const parts = raw.split("\0");
    if (parts.at(-1) === "") parts.pop();
    if (!raw) return [];
    if (parts.length % 5)
      throw new ContextoryError(
        "GIT_FORMAT",
        "Git log could not be decoded without losing commit boundaries.",
      );
    const commits: GitCommit[] = [];
    for (let i = 0; i < parts.length; i += 5) {
      if (!/^[a-f0-9]{40,64}$/.test(parts[i]))
        throw new ContextoryError(
          "GIT_FORMAT",
          "Git returned an invalid commit identity.",
        );
      commits.push({
        hash: parts[i],
        parents: parts[i + 1].split(" ").filter(Boolean),
        date: parts[i + 2],
        subject: parts[i + 3],
        body: parts[i + 4].slice(0, 8000),
        bodyTruncated: parts[i + 4].length > 8000,
        breaking:
          /^[\w-]+(?:\([^\n]+\))?!:/.test(parts[i + 3]) ||
          /^BREAKING[ -]CHANGE:/m.test(parts[i + 4]),
      });
    }
    if (commits.length > 10000)
      throw new ContextoryError(
        "RELEASE_LIMIT",
        "This version interval exceeds 10000 commits. Establish a reviewed baseline tag before preparing this release.",
      );
    return commits;
  }
}
