# OH-6J2/R3B. Runs in owner's Windows logon session; does not touch Tailscale configuration.
# Never stops a port-owning process or clears .next, credentials or PA state.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Repo,
    [ValidateSet('dev', 'start')][string]$Mode = 'dev',
    [ValidateRange(15, 300)][int]$PollSeconds = 30,
    [switch]$Once,
    [switch]$ObserveOnly
)
$ErrorActionPreference = 'Stop'
$Repo = [IO.Path]::GetFullPath($Repo)
if (-not (Test-Path -LiteralPath (Join-Path $Repo 'package.json') -PathType Leaf)) {
    throw "Not a Chernobog repository: $Repo"
}
$script:LogRoot = Join-Path $env:LOCALAPPDATA 'Chernobog\OH6CR3'
New-Item -Path $script:LogRoot -ItemType Directory -Force | Out-Null
$script:EventLog = Join-Path $script:LogRoot 'supervisor.jsonl'
$script:StatusFile = Join-Path $script:LogRoot 'health.json'
$script:LastNextStart = [datetime]::MinValue
$script:ConsecutiveNextDown = 0
$script:LastOllamaStart = [datetime]::MinValue

function Write-Record([string]$Code, [string]$Detail) {
    $timestamp = (Get-Date).ToUniversalTime().ToString('o')
    $entry = [ordered]@{ observedAt = $timestamp; event = $Code; detail = $Detail }
    try {
        if ((Test-Path -LiteralPath $script:EventLog) -and (Get-Item -LiteralPath $script:EventLog).Length -gt 5242880) {
            $archived = "$($script:EventLog).previous"
            if (Test-Path -LiteralPath $archived) { Remove-Item -LiteralPath $archived -Force }
            Move-Item -LiteralPath $script:EventLog -Destination $archived
        }
        Add-Content -LiteralPath $script:EventLog -Value ($entry | ConvertTo-Json -Compress -Depth 3) -Encoding UTF8
    } catch { Write-Warning 'Unable to write host supervisor log.' }
    Write-Host "$timestamp $Code $Detail"
}
function Test-Http([string]$Url) {
    try {
        $request = [System.Net.HttpWebRequest]::Create($Url)
        $request.Timeout = 6000
        $request.ReadWriteTimeout = 6000
        $request.Method = 'GET'
        $request.AllowAutoRedirect = $false
        $response = $request.GetResponse()
        try { return ([int]$response.StatusCode -ge 200 -and [int]$response.StatusCode -lt 400) }
        finally { $response.Close() }
    } catch { return $false }
}
function Test-Listen([int]$Port) {
    return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1)
}
# Check for an existing repository-bound Next.js process before trying another
# launch. A node listener can disappear briefly during dev recompilation.
# Never infer ownership from a bare port number, and never kill a process.
function Test-NextRepositoryProcess {
    try {
        $procs = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction Stop
        foreach ($proc in $procs) {
            $command = [string]$proc.CommandLine
            if ($command.IndexOf($Repo, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
                $command -match '[\\/]node_modules[\\/]next[\\/]') {
                return $true
            }
        }
    } catch {
        Write-Record 'next-process-inspection-unavailable' $_.Exception.GetType().Name
        # An ambiguous process inventory must not trigger a speculative launch.
        return $true
    }
    return $false
}
function Resolve-Binary([string]$Name, [string]$Fallback) {
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd -and $cmd.Source -and (Test-Path -LiteralPath $cmd.Source -PathType Leaf)) { return $cmd.Source }
    if ($Fallback -and (Test-Path -LiteralPath $Fallback -PathType Leaf)) { return $Fallback }
    return $null
}
function Start-Local([string]$File, [string[]]$Arguments, [string]$WorkingDirectory, [string]$Role) {
    $stamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
    $out = Join-Path $script:LogRoot "$Role-$stamp.stdout.log"
    $err = Join-Path $script:LogRoot "$Role-$stamp.stderr.log"
    try {
        $started = Start-Process -FilePath $File -ArgumentList $Arguments -WorkingDirectory $WorkingDirectory `
            -PassThru -WindowStyle Hidden -RedirectStandardOutput $out -RedirectStandardError $err
        Write-Record "$Role-start-requested" "pid=$($started.Id); output in local OH6CR3 directory"
        foreach ($kind in @('stdout', 'stderr')) {
            Get-ChildItem -LiteralPath $script:LogRoot -Filter "$Role-*.$kind.log" -File -ErrorAction SilentlyContinue |
                Sort-Object LastWriteTime -Descending | Select-Object -Skip 10 |
                Remove-Item -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Record "$Role-start-failed" $_.Exception.GetType().Name
    }
}
function Observe-Host {
    $nextReady = Test-Http 'http://127.0.0.1:3000/api/personal-assistance/attention'
    $nextPort = Test-Listen 3000
    $ollamaReady = Test-Http 'http://127.0.0.1:11434/api/version'
    $ollamaPort = Test-Listen 11434
    $tailscaleService = Get-Service -Name Tailscale -ErrorAction SilentlyContinue
    $tailServiceStatus = if ($null -eq $tailscaleService) { 'missing' } else { $tailscaleService.Status.ToString().ToLowerInvariant() }
    $tsExe = Resolve-Binary 'tailscale.exe' (Join-Path $env:ProgramFiles 'Tailscale\tailscale.exe')
    $serveMapping = 'unknown'
    if ($tsExe) {
        try {
            $serve = (& $tsExe serve status 2>$null) -join "`n"
            if ($LASTEXITCODE -eq 0) {
                $serveMapping = if ($serve -match 'proxy\s+http://127\.0\.0\.1:3000') { 'configured' } else { 'not-detected' }
            }
        } catch { $serveMapping = 'unknown' }
    }
    return [ordered]@{
        observedAt = (Get-Date).ToUniversalTime().ToString('o')
        next = $(if ($nextReady) { 'ready' } elseif ($nextPort) { 'degraded-port-occupied' } else { 'down' })
        ollama = $(if ($ollamaReady) { 'ready' } elseif ($ollamaPort) { 'degraded-port-occupied' } else { 'down' })
        tailscaleService = $tailServiceStatus
        serveMapping = $serveMapping
        mode = $Mode
        supervisorObserveOnly = [bool]$ObserveOnly
        managedBeforeLogon = $false
    }
}
function Run-Cycle {
    $status = Observe-Host
    if (-not $ObserveOnly) {
        $node = Resolve-Binary 'node.exe' (Join-Path $env:ProgramFiles 'nodejs\node.exe')
        $ollama = Resolve-Binary 'ollama.exe' (Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe')
        $now = Get-Date
        if ($status.ollama -eq 'down' -and ($now - $script:LastOllamaStart).TotalSeconds -ge 120) {
            $script:LastOllamaStart = $now
            if ($ollama) { Start-Local $ollama @('serve') $env:USERPROFILE 'ollama' }
            else { Write-Record 'ollama-missing' 'Ollama executable unavailable; no changes made.' }
        }
        if ($status.next -eq 'down') { $script:ConsecutiveNextDown += 1 }
        else { $script:ConsecutiveNextDown = 0 }

        # Deliberately wait for two consecutive down observations (~30 seconds).
        # A momentary port gap, still-running Next launcher, or live listener
        # must not cause a second Next.js server to start.
        if ($status.next -eq 'down' -and $script:ConsecutiveNextDown -ge 2 -and
            ($now - $script:LastNextStart).TotalSeconds -ge 240) {
            if (Test-NextRepositoryProcess) {
                Write-Record 'next-launch-suppressed' 'Existing repo-bound Next.js process or unverified process inventory.'
            } elseif (Test-Listen 3000) {
                Write-Record 'next-launch-suppressed' 'Port 3000 appeared during startup check.'
            } else {
                $node = Resolve-Binary 'node.exe' (Join-Path $env:ProgramFiles 'nodejs\node.exe')
                $nextCli = Join-Path $Repo 'node_modules\next\dist\bin\next'
                if ($Mode -eq 'start' -and -not (Test-Path -LiteralPath (Join-Path $Repo '.next\BUILD_ID'))) {
                    Write-Record 'next-not-built' 'Production mode requires npm run build; refusing to start.'
                } elseif ($node -and (Test-Path -LiteralPath $nextCli -PathType Leaf)) {
                    # Last-second second-chance recheck guards against external
                    # startup racing this supervisor after the first observation.
                    Start-Sleep -Seconds 3
                    if (-not (Test-Listen 3000) -and -not (Test-NextRepositoryProcess)) {
                        $script:LastNextStart = Get-Date
                        $script:ConsecutiveNextDown = 0
                        $args = @(('"' + $nextCli + '"'), $Mode, '--hostname', '127.0.0.1', '--port', '3000')
                        Start-Local $node $args $Repo 'next'
                    } else {
                        Write-Record 'next-launch-suppressed' 'Startup detected during final race check.'
                    }
                } else {
                    Write-Record 'next-missing' 'node.exe or local Next CLI missing; no changes made.'
                }
            }
        }
    }
    $json = $status | ConvertTo-Json -Depth 4
    try { Set-Content -LiteralPath $script:StatusFile -Value $json -Encoding UTF8 }
    catch { Write-Record 'health-file-error' $_.Exception.GetType().Name }
    Write-Record 'health' "next=$($status.next) ollama=$($status.ollama) tailscale=$($status.tailscaleService) serve=$($status.serveMapping)"
}

$mutex = [System.Threading.Mutex]::new($false, 'Local\ChernobogOH6CR3Supervisor')
$owned = $false
try {
    try { $owned = $mutex.WaitOne(0, $false) }
    catch [System.Threading.AbandonedMutexException] { $owned = $true }
    if (-not $owned) { Write-Record 'duplicate-supervisor' 'Another supervisor is active; exiting.'; return }
    Write-Record 'supervisor-start' "mode=$Mode observeOnly=$([bool]$ObserveOnly)"
    do {
        try { Run-Cycle }
        catch { Write-Record 'cycle-error' $_.Exception.GetType().Name }
        if (-not $Once) { Start-Sleep -Seconds $PollSeconds }
    } while (-not $Once)
} finally {
    if ($owned) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
