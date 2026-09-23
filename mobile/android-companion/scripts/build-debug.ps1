$ErrorActionPreference = "Stop"

$ProjectRoot =
    (Resolve-Path (
        Join-Path $PSScriptRoot ".."
    )).Path

Set-Location $ProjectRoot

if (-not (Test-Path ".\gradlew.bat")) {
    throw @"
Gradle wrapper not found.

Run:
powershell -ExecutionPolicy Bypass -File ".\scripts\bootstrap-gradle-wrapper.ps1"
"@
}

& ".\gradlew.bat" `
    testDebugUnitTest `
    assembleDebug

if ($LASTEXITCODE -ne 0) {
    throw "Android build failed with exit code $LASTEXITCODE."
}

$Apk =
    Join-Path `
        $ProjectRoot `
        "app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path $Apk)) {
    throw "Build reported success but debug APK was not found."
}

Write-Host ""
Write-Host "PASS Chernobog Companion debug build"
Write-Host "APK: $Apk"
