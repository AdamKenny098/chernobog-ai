param([Parameter(Mandatory)][string]$RuntimeDirectory)
$ErrorActionPreference = 'Continue'
$nodePath = (Get-Command node -ErrorAction Stop).Source
while ($true) {
    $logPath = Join-Path $RuntimeDirectory 'gateway.log'
    if ((Test-Path -LiteralPath $logPath) -and (Get-Item -LiteralPath $logPath).Length -gt 2MB) {
        Move-Item -LiteralPath $logPath -Destination (Join-Path $RuntimeDirectory 'gateway.previous.log') -Force
    }
    & $nodePath (Join-Path $RuntimeDirectory 'gateway.mjs') (Join-Path $RuntimeDirectory 'config.json') *> $logPath
    Start-Sleep -Seconds 5
}
