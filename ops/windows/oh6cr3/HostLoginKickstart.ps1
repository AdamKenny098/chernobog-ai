# OH-6J1: startup-folder fallback, runs for logged-in owner only.
# It starts the EXISTING scheduled task only if the task is Ready.
[CmdletBinding()]
param([switch]$NoDelay)
$ErrorActionPreference = 'Stop'
$logRoot = Join-Path $env:LOCALAPPDATA 'Chernobog\OH6CR3'
New-Item -ItemType Directory -Path $logRoot -Force | Out-Null
$log = Join-Path $logRoot 'login-kickstart.jsonl'
function Record([string]$Event) {
    $entry = @{ observedAt = (Get-Date).ToUniversalTime().ToString('o'); event = $Event }
    try {
        if ((Test-Path -LiteralPath $log) -and (Get-Item -LiteralPath $log).Length -gt 524288) {
            Move-Item -LiteralPath $log -Destination "$log.previous" -Force
        }
        Add-Content -LiteralPath $log -Value ($entry | ConvertTo-Json -Compress) -Encoding UTF8
    } catch { }
}
if (-not $NoDelay) { Start-Sleep -Seconds 20 }
$taskName = 'Chernobog-OH6CR3-Host'
try {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
    if ($task.State -eq 'Running') { Record 'already-running'; return }
    if ($task.State -ne 'Ready') { Record "not-startable-$($task.State)"; return }
    $actions = @($task.Actions)
    if ($actions.Count -ne 1 -or $actions[0].Arguments -notmatch 'HostSupervisor\.ps1') {
        Record 'task-action-mismatch'; return
    }
    Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
    Record 'start-requested'
} catch {
    Record ('kickstart-error-' + $_.Exception.GetType().Name)
}
