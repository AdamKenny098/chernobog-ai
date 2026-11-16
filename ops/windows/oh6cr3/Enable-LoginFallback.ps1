# Explicit owner opt-in. Creates only a current-user Windows Startup shortcut.
# Does not change or terminate the existing scheduled task or applications.
[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Repo, [switch]$StartNow)
$ErrorActionPreference = 'Stop'
$Repo = [IO.Path]::GetFullPath($Repo)
$kickstart = Join-Path $Repo 'ops\windows\oh6cr3\HostLoginKickstart.ps1'
if (-not (Test-Path -LiteralPath $kickstart -PathType Leaf)) { throw 'Kickstart script missing.' }
if ($Repo.Contains('"') -or $kickstart.Contains('"')) { throw 'Unsafe repository path.' }
$task = Get-ScheduledTask -TaskName 'Chernobog-OH6CR3-Host' -ErrorAction SilentlyContinue
if (-not $task) { throw 'Main supervisor task is not registered. Refusing shortcut.' }
$actions = @($task.Actions)
if ($actions.Count -ne 1 -or $actions[0].Arguments -notmatch 'HostSupervisor\.ps1') {
    throw 'Main scheduled task does not point to the expected supervisor.'
}
$startupDir = [Environment]::GetFolderPath('Startup')
if (-not (Test-Path -LiteralPath $startupDir -PathType Container)) {
    throw 'Windows user Startup folder is unavailable.'
}
$shortcut = Join-Path $startupDir 'Chernobog Host Supervisor Fallback.lnk'
$powershell = Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe'
$args = '-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $kickstart + '"'
$shell = New-Object -ComObject WScript.Shell
if (Test-Path -LiteralPath $shortcut) {
    $existing = $shell.CreateShortcut($shortcut)
    if ($existing.TargetPath -ne $powershell -or $existing.Arguments -ne $args) {
        throw 'An existing shortcut with this name differs. Refusing to overwrite.'
    }
    Write-Host 'UNCHANGED: login fallback already installed.'
} else {
    $link = $shell.CreateShortcut($shortcut)
    $link.TargetPath = $powershell
    $link.Arguments = $args
    $link.WorkingDirectory = $Repo
    $link.WindowStyle = 7
    $link.Description = 'Starts the existing Chernobog host task at user sign-in if needed.'
    $link.Save()
    Write-Host 'INSTALLED: owner-login fallback shortcut.'
}
Write-Host ('Shortcut: ' + $shortcut)
if ($StartNow) {
    & $kickstart -NoDelay
    Write-Host 'One-time kickstart check completed. Inspect HostStatus.'
}
