param([string]$Executable, [string]$HostName = 'vscode', [string]$ExtensionPath, [switch]$StartPaused, [switch]$MultiRoot)
$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if (-not $ExtensionPath) { $ExtensionPath = $taskRoot }
if (-not $Executable) {
  & node (Join-Path $PSScriptRoot 'prepare-debug.mjs')
  if ($LASTEXITCODE -ne 0) { throw 'Could not prepare isolated VS Code.' }
  $Executable = Join-Path $taskRoot '.contextory-local\debug-runtime\Code.exe'
}
if (-not (Test-Path -LiteralPath $Executable)) { throw "Host executable not found: $Executable" }
$taskDirectory = Join-Path $taskRoot ('.contextory-local\host-smoke\' + $HostName + '-' + [Guid]::NewGuid().ToString('N'))
$taskWorkspace = Join-Path $taskDirectory 'workspace'
New-Item -ItemType Directory -Path (Join-Path $taskWorkspace '.vscode') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $taskDirectory 'user\User') -Force | Out-Null
$taskNode = (Get-Command node).Source
@{ 'security.workspace.trust.enabled' = $false; 'extensions.autoUpdate' = $false; 'update.mode' = 'none'; 'workbench.startupEditor' = 'none' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskDirectory 'user\User\settings.json') -Encoding UTF8
@{ 'contextory.nodeExecutable' = $taskNode; 'files.autoSave' = 'off'; 'contextory.restartAfterSetup' = 'never' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskWorkspace '.vscode\settings.json') -Encoding UTF8
if ($StartPaused) {
  @{ 'contextory.nodeExecutable' = $taskNode; 'contextory.autoConnect' = $false; 'files.autoSave' = 'off'; 'contextory.restartAfterSetup' = 'never' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskWorkspace '.vscode\settings.json') -Encoding UTF8
}
'function start(ok:boolean){if(ok){next()}else{fallback()}} function next(){} function fallback(){}' | Set-Content -LiteralPath (Join-Path $taskWorkspace 'main.ts') -Encoding UTF8
$taskReport = Join-Path $taskRoot ('artifacts\host-' + $HostName + '.json')
$taskTest = Join-Path $taskRoot 'tests\host\smoke.cjs'
if ($MultiRoot) {
  $taskSecond = Join-Path $taskDirectory 'second'
  New-Item -ItemType Directory -Path (Join-Path $taskSecond '.vscode') -Force | Out-Null
  @{ 'contextory.autoConnect' = $false; 'contextory.checks' = @(@{ id = 'beta'; name = 'Beta'; executable = $taskNode; args = @('-e', 'process.exit(0)') }) } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $taskSecond '.vscode\settings.json') -Encoding UTF8
  'export function start(){return "beta"}' | Set-Content -LiteralPath (Join-Path $taskSecond 'main.ts') -Encoding UTF8
  $taskWorkspaceFile = Join-Path $taskDirectory 'projects.code-workspace'
  @{ folders = @(@{ path = $taskWorkspace; name = 'Alpha' }, @{ path = $taskSecond; name = 'Beta' }); settings = @{ 'contextory.nodeExecutable' = $taskNode; 'contextory.restartAfterSetup' = 'never' } } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $taskWorkspaceFile -Encoding UTF8
  $taskWorkspace = $taskWorkspaceFile
  $taskTest = Join-Path $taskRoot 'tests\host\workspace.cjs'
  $taskReport = Join-Path $taskRoot ('artifacts\host-' + $HostName + '-multi-root.json')
}
$taskArguments = @('--new-window', '--skip-welcome', '--skip-release-notes', '--disable-extensions', '--disable-updates', '--disable-gpu', '--no-sandbox',
  '--user-data-dir', ('"' + (Join-Path $taskDirectory 'user') + '"'), '--extensions-dir', ('"' + (Join-Path $taskDirectory 'extensions') + '"'),
  ('--extensionDevelopmentPath="' + $ExtensionPath + '"'), ('--extensionTestsPath="' + $taskTest + '"'), ('"' + $taskWorkspace + '"'))
$taskArguments += @('--extensionDevelopmentPath="' + (Join-Path $taskRoot 'tests\host\agents\codex') + '"', '--extensionDevelopmentPath="' + (Join-Path $taskRoot 'tests\host\agents\claude') + '"')
$taskEnvironment = @{}
try {
  foreach ($taskVariable in (Get-ChildItem Env: | Where-Object { $_.Name -like 'VSCODE_*' -or $_.Name -eq 'ELECTRON_RUN_AS_NODE' -or $_.Name -eq 'CONTEXTORY_SMOKE_REPORT' })) { $taskEnvironment[$taskVariable.Name] = $taskVariable.Value; [Environment]::SetEnvironmentVariable($taskVariable.Name, $null, 'Process') }
  $env:CONTEXTORY_SMOKE_REPORT = $taskReport
  $taskStarted = [DateTime]::UtcNow
  $taskProcess = Start-Process -FilePath $Executable -ArgumentList $taskArguments -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $taskDirectory 'stdout.log') -RedirectStandardError (Join-Path $taskDirectory 'stderr.log')
} finally {
  [Environment]::SetEnvironmentVariable('CONTEXTORY_SMOKE_REPORT', $null, 'Process')
  foreach ($taskVariableName in $taskEnvironment.Keys) { [Environment]::SetEnvironmentVariable($taskVariableName, $taskEnvironment[$taskVariableName], 'Process') }
}
while (-not $taskProcess.WaitForExit(500)) {
  if (([DateTime]::UtcNow - $taskStarted).TotalSeconds -gt 120) { & taskkill.exe /PID $taskProcess.Id /T /F | Out-Null; throw "Host test timed out. Logs: $taskDirectory" }
}
if (-not (Test-Path -LiteralPath $taskReport)) { throw "Host did not write a report. Logs: $taskDirectory" }
$taskResult = Get-Content -Raw -LiteralPath $taskReport | ConvertFrom-Json
if ([DateTime]::Parse($taskResult.recordedAt).ToUniversalTime() -lt $taskStarted.AddSeconds(-1)) { throw 'Host report is stale.' }
$taskResult | ConvertTo-Json -Depth 5
if (-not $taskResult.passed) { throw "Host smoke failed. Logs: $taskDirectory" }
