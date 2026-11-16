# Removes ONLY the OH-6C-R3A scheduled task if it points at the known supervisor.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$name = 'Chernobog-OH6CR3-Host'
$task = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
if (-not $task) { Write-Host 'No OH-6C-R3A task registered.'; return }
$actions = @($task.Actions)
if ($actions.Count -ne 1 -or $actions[0].Arguments -notmatch 'HostSupervisor\.ps1') {
    throw "Task name is occupied by unexpected actions; refusing to remove $name."
}
Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $name -Confirm:$false
Write-Host "UNREGISTERED: $name. No explicit Next/Ollama termination was requested; confirm running process state after task removal."
