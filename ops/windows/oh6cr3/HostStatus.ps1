# Read-only host/scheduled-task status. Does not start or stop services.
[CmdletBinding()]
param()
$logRoot = Join-Path $env:LOCALAPPDATA 'Chernobog\OH6CR3'
$health = Join-Path $logRoot 'health.json'
$events = Join-Path $logRoot 'supervisor.jsonl'
Write-Host '=== OH-6J1J2 HOST STATUS ==='
$task = Get-ScheduledTask -TaskName 'Chernobog-OH6CR3-Host' -ErrorAction SilentlyContinue
$taskRunning = ($null -ne $task -and $task.State -eq 'Running')
if ($task) {
    $task | Select-Object TaskName, State | Format-Table -AutoSize
    Get-ScheduledTaskInfo -TaskName 'Chernobog-OH6CR3-Host' | Select-Object LastRunTime, LastTaskResult, NumberOfMissedRuns | Format-List
} else { Write-Host 'Scheduled task: not registered' }
if (Test-Path -LiteralPath $health) {
    try {
        $snapshot = Get-Content -LiteralPath $health -Raw | ConvertFrom-Json
        $snapshot | Format-List
        $age = ((Get-Date).ToUniversalTime() - ([datetime]::Parse($snapshot.observedAt).ToUniversalTime())).TotalSeconds
        $fresh = ($age -ge 0 -and $age -le 120)
        Write-Host ('Supervisor actively reporting: ' + ($taskRunning -and $fresh))
        Write-Host ('Health snapshot age (seconds): ' + [math]::Round($age, 1))
        if (-not $taskRunning) { Write-Warning 'Scheduled task is not running; displayed service health may be stale.' }
        elseif (-not $fresh) { Write-Warning 'Scheduled task is running but latest service health is stale.' }
    } catch { Write-Warning 'Health snapshot could not be parsed.' }
} else { Write-Host 'Health: no supervisor snapshot yet' }
if (Test-Path -LiteralPath $events) { Get-Content -LiteralPath $events -Tail 12 }
Write-Host 'IMPORTANT: At-logon task does not run before Windows user sign-in.'
