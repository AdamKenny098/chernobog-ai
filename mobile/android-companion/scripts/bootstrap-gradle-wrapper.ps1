param(
    [string]$GradleVersion = "9.6.0"
)

$ErrorActionPreference = "Stop"

$ProjectRoot =
    (Resolve-Path (
        Join-Path $PSScriptRoot ".."
    )).Path

Set-Location $ProjectRoot

$ExpectedVersion =
    "9.6.0"

if ($GradleVersion -ne $ExpectedVersion) {
    throw "PA-2D1 currently pins Gradle $ExpectedVersion. Refusing unreviewed version $GradleVersion."
}

$DistributionUrl =
    "https://services.gradle.org/distributions/gradle-$GradleVersion-bin.zip"

$ExpectedSha256 =
    "bbaeb2fef8710818cf0e261201dab964c572f92b942812df0c3620d62a529a01"

$RunId =
    "{0}-{1}" -f $PID, (Get-Date -Format "yyyyMMddHHmmssfff")

$TempRoot =
    Join-Path `
        $env:TEMP `
        "chernobog-gradle-$GradleVersion-$RunId"

$ZipPath =
    Join-Path `
        $TempRoot `
        "gradle.zip"

$ExtractRoot =
    Join-Path `
        $TempRoot `
        "extract"

New-Item `
    -ItemType Directory `
    -Force `
    -Path $TempRoot |
    Out-Null

try {
    Write-Host "Downloading Gradle $GradleVersion from the official Gradle distribution service..."

    Invoke-WebRequest `
        -Uri $DistributionUrl `
        -OutFile $ZipPath

    $ActualSha256 =
        (
            Get-FileHash `
                -LiteralPath $ZipPath `
                -Algorithm SHA256
        ).Hash.ToLowerInvariant()

    if ($ActualSha256 -ne $ExpectedSha256) {
        throw "Gradle distribution checksum mismatch. Expected $ExpectedSha256, got $ActualSha256."
    }

    Write-Host "PASS Gradle distribution SHA-256 verified"

    Expand-Archive `
        -LiteralPath $ZipPath `
        -DestinationPath $ExtractRoot `
        -Force

    $GradleBat =
        Join-Path `
            $ExtractRoot `
            "gradle-$GradleVersion\bin\gradle.bat"

    if (-not (Test-Path $GradleBat)) {
        throw "Extracted Gradle executable was not found."
    }

    Write-Host "Generating the standard Gradle wrapper..."

    & $GradleBat `
        :wrapper `
        "--gradle-version=$GradleVersion" `
        "--distribution-type=bin" `
        "--no-daemon"

    if ($LASTEXITCODE -ne 0) {
        throw "Gradle wrapper generation failed with exit code $LASTEXITCODE."
    }

    if (-not (Test-Path ".\gradlew.bat")) {
        throw "gradlew.bat was not generated."
    }

    if (-not (Test-Path ".\gradle\wrapper\gradle-wrapper.jar")) {
        throw "gradle-wrapper.jar was not generated."
    }

    if (-not (Test-Path ".\gradle\wrapper\gradle-wrapper.properties")) {
        throw "gradle-wrapper.properties was not generated."
    }

    Write-Host ""
    Write-Host "PASS Chernobog Companion Gradle wrapper ready."
    Write-Host "Next build command:"
    Write-Host "  .\gradlew.bat testDebugUnitTest assembleDebug"
}
finally {
    if (Test-Path $TempRoot) {
        for ($attempt = 1; $attempt -le 6; $attempt++) {
            try {
                Remove-Item `
                    -LiteralPath $TempRoot `
                    -Recurse `
                    -Force `
                    -ErrorAction Stop
                break
            }
            catch {
                if ($attempt -eq 6) {
                    Write-Warning "Temporary Gradle directory remains locked and was left for Windows cleanup: $TempRoot"
                    break
                }

                Start-Sleep -Milliseconds (250 * $attempt)
            }
        }
    }
}
