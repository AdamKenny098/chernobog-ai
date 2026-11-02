# OH-5 PSI 1E - Governed Memory Context Integration
# Run from the root of the chernobog-ai repository:
#   powershell -ExecutionPolicy Bypass -File .\OH5-PSI-1E-Install.ps1
# Optional: -SkipBuild -SkipTests
[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = (Get-Location).Path
$target = Join-Path $repo 'packages\models\src\contextEngine.ts'
$store = Join-Path $repo 'packages\vault\src\oh5\store.ts'
if (-not (Test-Path -LiteralPath $target) -or -not (Test-Path -LiteralPath $store)) {
    throw 'Run this script from the root of chernobog-ai (missing Context Engine or OH-5 store).'
}
if (-not (Test-Path -LiteralPath (Join-Path $repo 'package.json'))) {
    throw 'package.json not found: not at repository root.'
}

$gitBranch = (& git branch --show-current 2>$null)
if ($LASTEXITCODE -ne 0) { throw 'Git is required to verify the working branch.' }
$gitBranch = ($gitBranch | Out-String).Trim()
if ($gitBranch -ne 'oh5/psi1-request-context') {
    throw "Expected branch oh5/psi1-request-context, found '$gitBranch'. No changes made."
}

$existing = [System.IO.File]::ReadAllText($target)
$sourceId = 'oh5-governed-memory'
if ($existing.Contains($sourceId)) {
    Write-Host 'OH-5 governed memory source already appears in contextEngine.ts; no changes made.' -ForegroundColor Yellow
    exit 0
}

$importAnchor = 'import type {'
$engineAnchor = 'const defaultContextEngine ='
$registerAnchor = 'export function getContextEngine():'
foreach ($anchor in @($importAnchor, $engineAnchor, $registerAnchor)) {
    if (-not $existing.Contains($anchor)) {
        throw "Expected insertion point not found: $anchor. No changes made."
    }
}

# Exact source contract: project isolation + confirmed only + original project metadata.
$importText = 'import { GovernedMemoryStore, defaultOH5BDatabasePath } from "../../vault/src/oh5/store";' + "`n"
$sourceText = @'
/**
 * OH-5 PSI 1E: governed confirmed memory is available as read-only context.
 * Retrieval fails closed without a project ID; the store is opened and closed
 * for each retrieval, following the existing OH-5 API lifecycle.
 */
function governedOH5MemorySource(): ContextSource {
  return {
    id: "oh5-governed-memory",
    isolationScope: "project",
    categories: ["memory"],
    retrieve(request) {
      const projectId = request.projectId?.trim();
      if (!projectId) return [];

      const store = new GovernedMemoryStore(defaultOH5BDatabasePath());
      try {
        const records = store.list(projectId, { tiers: ["confirmed"], limit: 100 });
        const retrievedAt = new Date().toISOString();
        return records
          .filter((record) => record.projectId === projectId && record.tier === "confirmed")
          .map((record): ContextItem => ({
            id: `oh5-memory:${record.id}`,
            category: "memory",
            title: `Confirmed project memory: ${record.id}`,
            content: record.body,
            provenance: {
              sourceId: "oh5-governed-memory",
              sourceType: "oh5-confirmed-memory",
              reference: record.sourceRef,
              recordKey: record.id,
              retrievedAt,
            },
            observedAt: record.updatedAt,
            freshness: "historical",
            confidence: 0.95,
            sensitive: true,
            relevanceTags: ["memory", "confirmed"],
            metadata: {
              projectId: record.projectId,
              memoryId: record.id,
              revision: record.revision,
              tier: record.tier,
              channel: record.channel,
            },
          }));
      } finally {
        store.close();
      }
    },
  };
}

'@
$registrationText = @'
defaultContextEngine.registerSource(
  governedOH5MemorySource(),
);

'@

# Do not alter runtime World State or World Model; strict PSI-1D boundaries stay intact.
$updated = $importText + $existing
$updated = $updated.Replace($engineAnchor, $sourceText + $engineAnchor)
$updated = $updated.Replace($registerAnchor, $registrationText + $registerAnchor)

$backup = "$target.psi1e-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
[System.IO.File]::WriteAllText($backup, $existing, (New-Object System.Text.UTF8Encoding($false)))
try {
    [System.IO.File]::WriteAllText($target, $updated, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "Patched: $target" -ForegroundColor Green
    Write-Host "Backup:  $backup"

    if (-not $SkipTests) {
        Write-Host '`nRunning PSI regression tests...' -ForegroundColor Cyan
        & npx.cmd tsx --test 'tests/*.test.ts'
        if ($LASTEXITCODE -ne 0) { throw "PSI regression tests failed (exit $LASTEXITCODE)." }
    }
    if (-not $SkipBuild) {
        Write-Host '`nRunning TypeScript validation...' -ForegroundColor Cyan
        & npm.cmd run typecheck
        if ($LASTEXITCODE -ne 0) { throw "Typecheck failed (exit $LASTEXITCODE)." }
        Write-Host '`nRunning production build...' -ForegroundColor Cyan
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw "Production build failed (exit $LASTEXITCODE)." }
    }
    Write-Host '`nPSI 1E installed. No commit or merge was performed.' -ForegroundColor Green
    Write-Host 'Restart npm run dev, then retry the Silver Heron / 4827 conversation test.'
    Write-Host 'Note: passing tests does not establish live end-to-end acceptance; test cross-project isolation before merging.'
} catch {
    [System.IO.File]::WriteAllText($target, $existing, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host 'Validation failed; original contextEngine.ts restored from memory.' -ForegroundColor Red
    throw
}
