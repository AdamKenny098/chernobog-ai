# Registers a task only for the current user. No admin password, no SYSTEM identity, no Tailscale changes.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Repo,
    [ValidateSet('dev', 'start')][string]$Mode = 'dev',
    [switch]$StartNow
)
$ErrorActionPreference = 'Stop'
$Repo = [IO.Path]::GetFullPath($Repo)
$supervisor = Join-Path $Repo 'ops\windows\oh6cr3\HostSupervisor.ps1'
if (-not (Test-Path -LiteralPath $supervisor -PathType Leaf)) { throw "Supervisor missing: $supervisor" }
if ($Repo.Contains('"') -or $supervisor.Contains('"')) { throw 'Unsafe repository path quoting.' }
$taskName = 'Chernobog-OH6CR3-Host'
$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) { throw "Task $taskName already exists. Inspect it before replacing; no task was changed." }
$account = (& whoami).Trim()
if ([string]::IsNullOrWhiteSpace($account)) { throw 'Could not resolve current Windows user.' }
$exe = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$args = '-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $supervisor + '" -Repo "' + $Repo + '" -Mode ' + $Mode
$action = New-ScheduledTaskAction -Execute $exe -Argument $args -WorkingDirectory $Repo
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $account
$principal = New-ScheduledTaskPrincipal -UserId $account -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -MultipleInstances IgnoreNew -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 2)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
    -Principal $principal -Settings $settings -Description 'OH-6C-R3A owner-session local web and Ollama supervisor; no privileged system startup.' | Out-Null
Write-Host "REGISTERED: $taskName (user logon only; no pre-login guarantee)"
if ($StartNow) {
    Start-ScheduledTask -TaskName $taskName
    Write-Host 'Task start requested. Inspect HostStatus after a short interval.'
}
