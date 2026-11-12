$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
& node (Join-Path $PSScriptRoot 'prepare-debug.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Could not prepare the isolated VS Code runtime.' }
$codeExecutable = Join-Path $taskRoot '.relay-local\debug-runtime\Code.exe'
if (-not (Test-Path -LiteralPath $codeExecutable)) { throw 'Prepared VS Code executable not found.' }
$taskUserData = Join-Path $taskRoot '.relay-local\host-smoke-user'
$taskExtensions = Join-Path $taskRoot '.relay-local\host-smoke-extensions'
$taskReport = Join-Path $taskRoot 'artifacts\host-smoke.json'
$taskStartedAt = [DateTime]::UtcNow
$taskArguments = @(
  '--new-window', '--skip-welcome', '--skip-release-notes', '--disable-extensions', '--disable-updates', '--disable-gpu', '--verbose',
  '--user-data-dir', ('"' + $taskUserData + '"'),
  '--extensions-dir', ('"' + $taskExtensions + '"'),
  ('--extensionDevelopmentPath="' + $taskRoot + '"'),
  ('--extensionTestsPath="' + (Join-Path $taskRoot 'tests\host\smoke.cjs') + '"')
)
$taskHostEnvironment = @{}
try {
  # Do not inherit an extension-host entrypoint/IPC connection into an isolated GUI host.
  foreach ($taskVariable in (Get-ChildItem Env: | Where-Object { $_.Name -like 'VSCODE_*' -or $_.Name -eq 'ELECTRON_RUN_AS_NODE' })) {
    $taskHostEnvironment[$taskVariable.Name] = $taskVariable.Value
    [Environment]::SetEnvironmentVariable($taskVariable.Name, $null, 'Process')
  }
  $taskProcess = Start-Process -FilePath $codeExecutable -ArgumentList $taskArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskRoot '.relay-local\host-smoke.stdout.log') -RedirectStandardError (Join-Path $taskRoot '.relay-local\host-smoke.stderr.log')
} finally {
  foreach ($taskVariableName in $taskHostEnvironment.Keys) {
    [Environment]::SetEnvironmentVariable($taskVariableName, $taskHostEnvironment[$taskVariableName], 'Process')
  }
}
if (-not $taskProcess.WaitForExit(60000)) {
  & taskkill.exe /PID $taskProcess.Id /T /F | Out-Null
  throw 'VS Code host smoke timed out after 60 seconds.'
}
if (-not (Test-Path -LiteralPath $taskReport)) {
  $taskStartupLog = Join-Path $taskRoot '.relay-local\host-smoke.stdout.log'
  if ((Test-Path -LiteralPath $taskStartupLog) -and (Select-String -LiteralPath $taskStartupLog -Pattern 'vscode-updating is held' -Quiet)) {
    throw 'VS Code startup is blocked by its installer/update mutex. Finish the existing VS Code update, then rerun this smoke test.'
  }
  throw 'VS Code did not write a host smoke report. Inspect .relay-local/host-smoke.stderr.log and host-smoke.stdout.log.'
}
$taskResult = Get-Content -Raw -LiteralPath $taskReport | ConvertFrom-Json
if ([DateTime]::Parse($taskResult.recordedAt).ToUniversalTime() -lt $taskStartedAt.AddSeconds(-1)) { throw 'Host smoke report is stale.' }
$taskResult | ConvertTo-Json -Depth 4
if (-not $taskResult.passed) { throw 'VS Code host smoke failed.' }
