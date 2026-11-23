import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

if (process.platform !== "win32")
  throw new Error(
    "Background editor qualification currently requires Windows VS Code.",
  );
const executable = [
  process.env.LOCALAPPDATA &&
    join(process.env.LOCALAPPDATA, "Programs/Microsoft VS Code/Code.exe"),
  process.env.ProgramFiles &&
    join(process.env.ProgramFiles, "Microsoft VS Code/Code.exe"),
  resolve(".contextory-local/debug-runtime/Code.exe"),
].find((path) => path && existsSync(path));
if (!executable)
  throw new Error(
    "Install VS Code or prepare the isolated debug runtime before running this editor check.",
  );
for (const [name, options] of [
  ["background-startup", []],
  ["background-startup-delayed", ["-DelayedStartup"]],
  ["background-startup-paused", ["-StartPaused"]],
]) {
  const result = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      resolve("scripts/host-smoke.ps1"),
      "-Executable",
      executable,
      "-HostName",
      name,
      "-ReportDirectory",
      resolve(".contextory-local/background-startup-reports"),
      ...options,
    ],
    { stdio: "inherit", windowsHide: true, timeout: 140000 },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  const report = JSON.parse(
    readFileSync(
      resolve(
        ".contextory-local/background-startup-reports",
        `host-${name}.json`,
      ),
      "utf8",
    ).replace(/^\uFEFF/, ""),
  );
  if (
    !report.passed ||
    !report.checks.some((check) =>
      check.includes("automatic background activation"),
    )
  )
    throw new Error(`Automatic activation was not qualified: ${name}`);
  if (
    name.endsWith("-delayed") &&
    !report.checks.some((check) =>
      check.includes("startup runtime readiness failure recovers"),
    )
  )
    throw new Error("Delayed runtime recovery scenario was not exercised.");
  if (
    name.endsWith("-paused") &&
    !report.checks.some((check) =>
      check.includes("paused cold startup creates no provider configuration"),
    )
  )
    throw new Error("Paused startup scenario was not exercised.");
}
