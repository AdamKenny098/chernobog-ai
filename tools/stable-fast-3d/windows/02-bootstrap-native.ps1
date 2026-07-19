#Requires -Version 5.1

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Sf3dRoot = Split-Path $PSScriptRoot -Parent
$CondaRoot = Join-Path $Sf3dRoot "miniconda"
$EnvironmentRoot = Join-Path $Sf3dRoot ".env"
$RepositoryRoot = Join-Path $Sf3dRoot "stable-fast-3d"
$DownloadRoot = Join-Path $Sf3dRoot "downloads"
$CacheRoot = Join-Path $Sf3dRoot "cache\huggingface"
$Conda = Join-Path $CondaRoot "Scripts\conda.exe"
$Python = Join-Path $EnvironmentRoot "python.exe"
$HealthServer = Join-Path $Sf3dRoot "health_server.py"
$BuildScript = Join-Path $PSScriptRoot "build-native.cmd"
$ModelCheckScript = Join-Path $PSScriptRoot "verify-model.cmd"
$BuildMarker = Join-Path $Sf3dRoot ".native-build-complete"
$BootstrapMarker = Join-Path $Sf3dRoot ".bootstrap-complete"
$CudaHomeMarker = Join-Path $Sf3dRoot ".cuda-home"
$PinnedCommit = "ff21fc491b4dc5314bf6734c7c0dabd86b5f5bb2"
$MinicondaFileName = "Miniconda3-py310_26.5.3-1-Windows-x86_64.exe"
$MinicondaUrl = "https://repo.anaconda.com/miniconda/$MinicondaFileName"
$MinicondaSha256 = "4f06762e55cb2901364d9999bac4489e5fd23f7f1c8d7d3e02fa354d95fe4de0"

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Step
    )

    Write-Host ""
    Write-Host "--- $Step" -ForegroundColor Cyan
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Step failed with exit code $LASTEXITCODE. Copy the final 40 lines before retrying."
    }
}

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

Write-Host ""
Write-Host "CF1H-B0 / Native Windows Stable Fast 3D bootstrap" -ForegroundColor Cyan
Write-Host "Pinned stack: Python 3.10 / PyTorch 2.4.1 / CUDA 12.4 / SF3D $($PinnedCommit.Substring(0, 7))"
Write-Host "Install root: $Sf3dRoot"
Write-Host "ComfyUI is not used or modified by this installer."
Write-Host ""

if (-not (Test-Path $HealthServer) -or -not (Test-Path $BuildScript) -or -not (Test-Path $ModelCheckScript)) {
    throw "The CF1H bootstrap files are incomplete. Re-extract the ZIP into the Chernobog project root."
}

if ($Sf3dRoot.Contains(" ")) {
    throw "The SF3D install path contains a space. Move Chernobog to a path without spaces before running the native compiler bootstrap."
}

$drive = Get-PSDrive -Name ([System.IO.Path]::GetPathRoot($Sf3dRoot).Substring(0, 1))
if ($drive.Free -lt 25GB) {
    throw "At least 25 GB free disk space is required for the isolated compiler, environment, weights, and build cache."
}

if (-not (Get-Command git.exe -ErrorAction SilentlyContinue)) {
    throw "Git is not installed or not on PATH."
}

if (-not (Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue)) {
    throw "The NVIDIA Windows driver is not available."
}

$VsDevCmd = Find-VsDevCmd
if (-not $VsDevCmd) {
    throw "Visual Studio 2022 Desktop C++ Build Tools are missing. Run 01-install-build-tools.ps1 as Administrator first."
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
New-Item -ItemType Directory -Force -Path $DownloadRoot, $CacheRoot | Out-Null

if (-not (Test-Path $Conda)) {
    $installer = Join-Path $DownloadRoot $MinicondaFileName
    $obsoleteInstaller = Join-Path $DownloadRoot "Miniconda3-latest-Windows-x86_64.exe"

    if (Test-Path $obsoleteInstaller) {
        Write-Host "Removing the unused installer left by CF1H-B0's failed checksum request..."
        Remove-Item -Force $obsoleteInstaller
    }

    Write-Host "Downloading the pinned official Miniconda installer..."
    Invoke-WebRequest -UseBasicParsing -Uri $MinicondaUrl -OutFile $installer

    $expectedHash = $MinicondaSha256.ToUpperInvariant()
    $actualHash = (Get-FileHash -Algorithm SHA256 $installer).Hash.ToUpperInvariant()
    if ($actualHash -cne $expectedHash) {
        throw "Miniconda checksum mismatch. The installer was not executed."
    }

    Write-Host "Installing isolated Miniconda..."
    $process = Start-Process -FilePath $installer -ArgumentList @(
        "/InstallationType=JustMe",
        "/RegisterPython=0",
        "/AddToPath=0",
        "/S",
        "/D=$CondaRoot"
    ) -Wait -PassThru

    if ($process.ExitCode -ne 0 -or -not (Test-Path $Conda)) {
        throw "Miniconda installation failed with exit code $($process.ExitCode)."
    }
}

if (-not (Test-Path $Python)) {
    Invoke-Checked -FilePath $Conda -Arguments @(
        "create", "--prefix", $EnvironmentRoot,
        "--override-channels", "--strict-channel-priority", "-c", "conda-forge",
        "python=3.10", "pip=24.0", "setuptools=69.5.1", "wheel", "cmake", "ninja",
        "-y"
    ) -Step "Create the isolated Python 3.10 environment"
}

Invoke-Checked -FilePath $Conda -Arguments @(
    "install", "--prefix", $EnvironmentRoot,
    "--override-channels", "--strict-channel-priority", "-c", "pytorch", "-c", "nvidia", "-c", "conda-forge",
    "pytorch=2.4.1", "torchvision=0.19.1", "pytorch-cuda=12.4",
    "-y"
) -Step "Install the official PyTorch 2.4.1 CUDA 12.4 build"

Invoke-Checked -FilePath $Conda -Arguments @(
    "install", "--prefix", $EnvironmentRoot,
    "--override-channels",
    "-c", "nvidia/label/cuda-12.4.1", "-c", "nvidia", "-c", "pytorch", "-c", "conda-forge",
    "cuda-toolkit=12.4.1", "cuda-cccl=12.4.127",
    "-y"
) -Step "Install the isolated CUDA 12.4 compiler toolkit"

$CcclTargetHeader = Join-Path $EnvironmentRoot "include\nv\target"
if (-not (Test-Path $CcclTargetHeader)) {
    Write-Host "The CUDA meta-package omitted its CCCL headers; repairing the pinned NVIDIA component..." -ForegroundColor Yellow
    Invoke-Checked -FilePath $Conda -Arguments @(
        "install", "--prefix", $EnvironmentRoot,
        "--override-channels", "-c", "nvidia/label/cuda-12.4.1", "-c", "nvidia",
        "--force-reinstall", "cuda-cccl=12.4.127",
        "-y"
    ) -Step "Repair the CUDA 12.4 CCCL development headers"
}

if (-not (Test-Path $CcclTargetHeader)) {
    throw "CUDA CCCL repair completed without include\nv\target. Copy the conda output before retrying."
}

$Nvcc = Get-ChildItem -Path $EnvironmentRoot -Filter nvcc.exe -Recurse -File | Select-Object -First 1
if (-not $Nvcc) {
    throw "The isolated CUDA package installed without nvcc.exe. Do not install a random system CUDA version; copy this error."
}

$CudaHome = Split-Path (Split-Path $Nvcc.FullName -Parent) -Parent
Set-Content -Path $CudaHomeMarker -Value $CudaHome -Encoding ASCII

if (-not (Test-Path (Join-Path $RepositoryRoot ".git"))) {
    Invoke-Checked -FilePath "git.exe" -Arguments @(
        "clone", "https://github.com/Stability-AI/stable-fast-3d.git", $RepositoryRoot
    ) -Step "Clone the official Stable Fast 3D repository"
}

$remote = (& git.exe -C $RepositoryRoot remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $remote -ne "https://github.com/Stability-AI/stable-fast-3d.git") {
    throw "The existing stable-fast-3d directory is not the expected official repository."
}

Invoke-Checked -FilePath "git.exe" -Arguments @(
    "-C", $RepositoryRoot, "fetch", "origin", $PinnedCommit, "--depth", "1"
) -Step "Fetch the pinned SF3D revision"

Invoke-Checked -FilePath "git.exe" -Arguments @(
    "-C", $RepositoryRoot, "checkout", "--detach", $PinnedCommit
) -Step "Lock SF3D to the verified revision"

if (-not (Test-Path $BuildMarker)) {
    Invoke-Checked -FilePath $BuildScript -Arguments @(
        $VsDevCmd, $EnvironmentRoot, $RepositoryRoot, $CudaHome
    ) -Step "Compile and smoke-test the native SF3D extensions"

    Set-Content -Path $BuildMarker -Value "SF3D native build passed at $PinnedCommit" -Encoding ASCII
}

$env:HF_HOME = $CacheRoot
$env:HF_HUB_DISABLE_TELEMETRY = "1"
$HuggingFaceCli = Join-Path $EnvironmentRoot "Scripts\huggingface-cli.exe"
if (-not (Test-Path $HuggingFaceCli)) {
    throw "The Hugging Face login command was not installed with SF3D requirements."
}

Write-Host ""
Write-Host "Hugging Face authentication" -ForegroundColor Yellow
& $HuggingFaceCli whoami *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Paste a READ token when prompted. The token is entered directly into Hugging Face's CLI."
    Write-Host "Do not paste that token into Chernobog or send it in chat."
    Invoke-Checked -FilePath $HuggingFaceCli -Arguments @("login") -Step "Authenticate the isolated SF3D environment"
}
else {
    Write-Host "The isolated SF3D environment is already authenticated." -ForegroundColor Green
}

$accessCheck = "from huggingface_hub import hf_hub_download; print(hf_hub_download('stabilityai/stable-fast-3d', 'config.yaml', cache_dir=r'$CacheRoot'))"
Invoke-Checked -FilePath $Python -Arguments @("-c", $accessCheck) -Step "Verify granted access to the gated SF3D model"

Invoke-Checked -FilePath $ModelCheckScript -Arguments @(
    $VsDevCmd, $EnvironmentRoot, $RepositoryRoot, $CudaHome
) -Step "Download and load the gated SF3D weights on CUDA"

Set-Content -Path $BootstrapMarker -Value @(
    "ready=true",
    "sf3d=$PinnedCommit",
    "python=3.10",
    "torch=2.4.1",
    "cuda=12.4"
) -Encoding ASCII

Write-Host ""
Write-Host "Native Windows SF3D bootstrap completed successfully." -ForegroundColor Green
Write-Host "Next: run .\tools\stable-fast-3d\windows\03-start-service.ps1"
