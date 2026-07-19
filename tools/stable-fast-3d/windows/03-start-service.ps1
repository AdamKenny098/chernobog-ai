#Requires -Version 5.1

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Sf3dRoot = Split-Path $PSScriptRoot -Parent
$EnvironmentRoot = Join-Path $Sf3dRoot ".env"
$RepositoryRoot = Join-Path $Sf3dRoot "stable-fast-3d"
$CacheRoot = Join-Path $Sf3dRoot "cache\huggingface"
$Python = Join-Path $EnvironmentRoot "python.exe"
$HealthServer = Join-Path $Sf3dRoot "health_server.py"
$ServiceScript = Join-Path $PSScriptRoot "run-service.cmd"
$BootstrapMarker = Join-Path $Sf3dRoot ".bootstrap-complete"
$CudaHomeMarker = Join-Path $Sf3dRoot ".cuda-home"

function Find-VsDevCmd {
    $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
    if (-not (Test-Path $vswhere)) {
        return $null
    }

    $installation = & $vswhere -latest -products "*" -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($LASTEXITCODE -ne 0 -or -not $installation) {
        return $null
    }

    $candidate = Join-Path $installation.Trim() "Common7\Tools\VsDevCmd.bat"
    if (Test-Path $candidate) {
        return $candidate
    }

    return $null
}

if (-not (Test-Path $BootstrapMarker)) {
    throw "The native bootstrap is incomplete. Run 02-bootstrap-native.ps1 first."
}

if (-not (Test-Path $Python) -or -not (Test-Path $HealthServer) -or -not (Test-Path $ServiceScript) -or -not (Test-Path $CudaHomeMarker)) {
    throw "The isolated SF3D environment is incomplete. Do not repair it with ComfyUI Python; rerun step 02."
}

$VsDevCmd = Find-VsDevCmd
if (-not $VsDevCmd) {
    throw "Visual Studio 2022 Desktop C++ Build Tools are unavailable. Rerun step 01 as Administrator."
}

$NvidiaSmi = Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue
if (-not $NvidiaSmi) {
    throw "nvidia-smi.exe is unavailable. Confirm the NVIDIA driver is installed before starting SF3D."
}

$usedMemoryOutput = @(
    & $NvidiaSmi.Source `
        "--query-gpu=memory.used" `
        "--format=csv,noheader,nounits" 2>&1
)
$nvidiaSmiExitCode = $LASTEXITCODE
$usedMemoryText = $usedMemoryOutput |
    ForEach-Object { ([string]$_).Trim() } |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -First 1
$usedMemoryMb = 0
$usedMemoryMatch = if ($usedMemoryText) {
    [regex]::Match($usedMemoryText, "^(?<megabytes>\d+)")
} else {
    $null
}

if (
    $nvidiaSmiExitCode -ne 0 -or
    -not $usedMemoryMatch -or
    -not $usedMemoryMatch.Success -or
    -not [int]::TryParse($usedMemoryMatch.Groups["megabytes"].Value, [ref]$usedMemoryMb)
) {
    $nvidiaSmiOutputText = ($usedMemoryOutput | ForEach-Object { ([string]$_).Trim() }) -join " | "
    if ([string]::IsNullOrWhiteSpace($nvidiaSmiOutputText)) {
        $nvidiaSmiOutputText = "<no output>"
    }

    throw "Chernobog could not read current NVIDIA GPU memory use (nvidia-smi exit $nvidiaSmiExitCode). Output: $nvidiaSmiOutputText"
}

if ($usedMemoryMb -gt 3000) {
    throw "The GPU is already using $usedMemoryMb MB. Close ComfyUI and other GPU-heavy programs, wait 20 seconds, then start SF3D again."
}

$CudaHome = (Get-Content -Raw $CudaHomeMarker).Trim()
$env:CUDA_HOME = $CudaHome
$env:CUDA_PATH = $CudaHome
$env:PATH = "$CudaHome\bin;$EnvironmentRoot;$EnvironmentRoot\Scripts;$EnvironmentRoot\Library\bin;$env:PATH"
$env:HF_HOME = $CacheRoot
$env:HF_HUB_DISABLE_TELEMETRY = "1"
$env:TORCH_CUDA_ARCH_LIST = "8.6"
$env:USE_CUDA = "1"
$env:USE_NATIVE_ARCH = "0"
$env:CHERNOBOG_SF3D_PORT = "8190"

Write-Host ""
Write-Host "Starting the local-only Chernobog SF3D service..." -ForegroundColor Cyan
Write-Host "GPU memory in use before load: $usedMemoryMb MB"
Write-Host "Gated SF3D cache:"
Write-Host $CacheRoot
Write-Host "Background-removal cache:"
Write-Host (Join-Path $Sf3dRoot "cache\rembg")
Write-Host "Leave this window open. Stop the service later with Ctrl+C."
Write-Host "Wait for: Chernobog SF3D model loaded on CUDA."
Write-Host ""

& $ServiceScript $VsDevCmd $EnvironmentRoot $RepositoryRoot $HealthServer $CudaHome
if ($LASTEXITCODE -ne 0) {
    throw "The SF3D service exited with code $LASTEXITCODE."
}
