# Safely removes the fallback shortcut ONLY if it matches the Chernobog script.
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$shortcut = Join-Path ([Environment]::GetFolderPath('Startup')) 'Chernobog Host Supervisor Fallback.lnk'
if (-not (Test-Path -LiteralPath $shortcut)) { Write-Host 'No login fallback shortcut.'; return }
$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut($shortcut)
if ($link.Arguments -notmatch 'HostLoginKickstart\.ps1' -or $link.TargetPath -notmatch 'powershell\.exe$') {
    throw 'Shortcut content differs; refusing removal.'
}
Remove-Item -LiteralPath $shortcut -Force
Write-Host 'REMOVED: owner-login fallback shortcut. Main scheduled task unchanged.'
