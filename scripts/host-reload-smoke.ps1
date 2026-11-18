param([string]$Executable, [string]$ExtensionPath)
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (-not $ExtensionPath) { $ExtensionPath = $taskRoot }
if (-not $Executable) { $Executable = Join-Path $taskRoot '.contextory-local\debug-runtime\Code.exe' }
if (-not (Test-Path -LiteralPath $Executable)) { throw 'Prepare the isolated editor with npm run prepare:debug first.' }
$taskDirectory = Join-Path $taskRoot ('.contextory-local\host-reload-' + [Guid]::NewGuid().ToString('N'))
$taskWorkspace = Join-Path $taskDirectory 'workspace'
New-Item -ItemType Directory -Path (Join-Path $taskWorkspace '.vscode') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $taskDirectory 'user\User') -Force | Out-Null
@{ 'security.workspace.trust.enabled' = $false; 'extensions.autoUpdate' = $false; 'update.mode' = 'none'; 'workbench.startupEditor' = 'none' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskDirectory 'user\User\settings.json') -Encoding UTF8
@{ 'contextory.nodeExecutable' = (Get-Command node).Source; 'contextory.restartAfterSetup' = 'automatic' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskWorkspace '.vscode\settings.json') -Encoding UTF8
$taskReport = Join-Path $taskRoot 'artifacts\host-reload.json'
$taskArguments = @('--new-window', '--skip-welcome', '--skip-release-notes', '--disable-extensions', '--disable-updates', '--disable-gpu', '--no-sandbox',
  '--user-data-dir', ('"' + (Join-Path $taskDirectory 'user') + '"'), '--extensions-dir', ('"' + (Join-Path $taskDirectory 'extensions') + '"'),
  ('--extensionDevelopmentPath="' + $ExtensionPath + '"'), ('--extensionDevelopmentPath="' + (Join-Path $taskRoot 'tests\host\reload') + '"'),
  ('--extensionDevelopmentPath="' + (Join-Path $taskRoot 'tests\host\agents\codex') + '"'), ('"' + $taskWorkspace + '"'))
$taskEnvironment = @{}
try {
  foreach ($taskVariable in (Get-ChildItem Env: | Where-Object { $_.Name -like 'VSCODE_*' -or $_.Name -eq 'ELECTRON_RUN_AS_NODE' -or $_.Name -eq 'CONTEXTORY_RELOAD_REPORT' })) { $taskEnvironment[$taskVariable.Name] = $taskVariable.Value; [Environment]::SetEnvironmentVariable($taskVariable.Name, $null, 'Process') }
  $env:CONTEXTORY_RELOAD_REPORT = $taskReport
  $taskStarted = [DateTime]::UtcNow
  $taskProcess = Start-Process -FilePath $Executable -ArgumentList $taskArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskDirectory 'stdout.log') -RedirectStandardError (Join-Path $taskDirectory 'stderr.log')
} finally {
  [Environment]::SetEnvironmentVariable('CONTEXTORY_RELOAD_REPORT', $null, 'Process')
  foreach ($taskVariableName in $taskEnvironment.Keys) { [Environment]::SetEnvironmentVariable($taskVariableName, $taskEnvironment[$taskVariableName], 'Process') }
}
while (-not $taskProcess.WaitForExit(500)) {
  if (([DateTime]::UtcNow - $taskStarted).TotalSeconds -gt 120) { & taskkill.exe /PID $taskProcess.Id /T /F | Out-Null; throw "Host restart test timed out. Logs: $taskDirectory" }
}
if (-not (Test-Path -LiteralPath $taskReport)) { throw "Host did not write a report. Logs: $taskDirectory" }
$taskResult = Get-Content -Raw -LiteralPath $taskReport | ConvertFrom-Json
if ([DateTime]::Parse($taskResult.recordedAt).ToUniversalTime() -lt $taskStarted.AddSeconds(-1)) { throw 'Host report is stale.' }
$taskResult | ConvertTo-Json -Depth 5
if (-not $taskResult.passed) { throw "Host restart smoke failed. Logs: $taskDirectory" }
