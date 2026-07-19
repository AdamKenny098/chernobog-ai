#Requires -Version 5.1

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "Checking http://127.0.0.1:8190/health ..."
$health = Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8190/health" -TimeoutSec 10
$health | ConvertTo-Json -Depth 10

if (-not $health.ready) {
    throw "The service answered but is not ready. Read the 'error' field above and copy the SF3D service window output."
}

Write-Host "All local SF3D health checks passed." -ForegroundColor Green

