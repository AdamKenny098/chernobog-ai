#Requires -Version 5.1
#Requires -RunAsAdministrator

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Find-CppBuildTools {
    $vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"

    if (-not (Test-Path $vswhere)) {
        return $null
    }

    $installation = & $vswhere -latest -products "*" -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if ($LASTEXITCODE -ne 0 -or -not $installation) {
        return $null
    }

    return $installation.Trim()
}

Write-Host ""
Write-Host "CF1H-B0 / Visual Studio 2022 C++ prerequisite" -ForegroundColor Cyan
Write-Host "This installs only Microsoft's Build Tools and the Desktop C++ workload."
Write-Host "It does not modify ComfyUI, Python, CUDA, or character project data."
Write-Host ""

$existing = Find-CppBuildTools
if ($existing) {
    Write-Host "C++ Build Tools are already ready:" -ForegroundColor Green
    Write-Host $existing
    exit 0
}

if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
    throw "Windows Package Manager (winget) is not available. Install or update App Installer from the Microsoft Store, then run this script again."
}

$answer = Read-Host "Install Visual Studio 2022 Build Tools with Desktop C++ now? Type YES"
if ($answer -cne "YES") {
    throw "Installation cancelled. Nothing was changed."
}

$override = "--wait --passive --norestart --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
& winget.exe install --exact --id Microsoft.VisualStudio.2022.BuildTools --source winget --accept-package-agreements --accept-source-agreements --override $override

if ($LASTEXITCODE -ne 0) {
    throw "winget could not install Visual Studio Build Tools (exit $LASTEXITCODE). Copy the complete output before trying another installer."
}

$installed = Find-CppBuildTools
if (-not $installed) {
    throw "Visual Studio installed, but the Desktop C++ workload was not detected. Open Visual Studio Installer, choose Modify for Build Tools 2022, enable 'Desktop development with C++', finish the change, then rerun this script."
}

Write-Host ""
Write-Host "Visual Studio C++ Build Tools are ready:" -ForegroundColor Green
Write-Host $installed
Write-Host "Close this Administrator window before running step 02."

