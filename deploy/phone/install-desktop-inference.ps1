param(
    [Parameter(Mandatory)][string]$BundlePath,
    [string]$RuntimeDirectory = (Join-Path $env:USERPROFILE 'Documents\Codex\chernobog-desktop-inference')
)
$ErrorActionPreference = 'Stop'
$runtime = [IO.Path]::GetFullPath($RuntimeDirectory)
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $runtime /inheritance:r /grant:r "${identity}:(OI)(CI)(F)" 'SYSTEM:(OI)(CI)(F)' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not protect inference configuration directory' }
$configPath = Join-Path $runtime 'config.json'
if (!(Test-Path -LiteralPath $configPath)) {
    $config = @{
        secret = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
        ollama = 'http://127.0.0.1:11434'
        models = @{ default = 'qwen3.5:9b'; code = 'deepseek-coder-v2:16b'; planner = 'gpt-oss:20b'; repair = 'qwen3-coder:30b' }
    }
    $config | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $configPath -Encoding utf8
}
$taskName = 'Chernobog Desktop Inference'
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) { Stop-ScheduledTask -TaskName $taskName }
Copy-Item -LiteralPath $BundlePath -Destination (Join-Path $runtime 'gateway.mjs')
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'run-desktop-inference.ps1') -Destination (Join-Path $runtime 'run-desktop-inference.ps1')
$shellPath = (Get-Command pwsh -ErrorAction Stop).Source
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + (Join-Path $runtime 'run-desktop-inference.ps1') + '" -RuntimeDirectory "' + $runtime + '"'
$action = New-ScheduledTaskAction -Execute $shellPath -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity
$principal = New-ScheduledTaskPrincipal -UserId $identity -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName $taskName
Write-Output 'Desktop inference registered at user sign-in; configuration protected to this account and SYSTEM.'
