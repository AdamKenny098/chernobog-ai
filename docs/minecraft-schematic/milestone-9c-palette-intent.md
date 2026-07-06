# Schematic Generator Milestone 9C — Version-Safe Palette Intent

## Purpose

Milestone 9B gave the schematic generator target-version parsing and palette-level compatibility reports.

Milestone 9C adds the missing generation-time bridge: before the normal block registry fallback pass runs, generated builds now get a version-safe palette intent pass.

That means a build generated for `1.8.8`, `1.12.2`, or another target version gets its block list normalized earlier instead of relying only on the final registry repair step.

## What this package adds

- `applyVersionSafePaletteIntentToBuild.ts`
  - Walks generated blocks, palette entries, and block entities.
  - Uses the existing block compatibility resolver.
  - Replaces blocks with version-safe substitutions where available.
  - Omits blocks that are explicitly marked as unavailable/omittable.
  - Leaves truly unresolved blocks for the later registry/export validator instead of hiding them.
  - Adds warnings and a `version_safe_palette_9c` feature marker to generated builds.

- `versionSafePaletteIntent.selftest.ts`
  - Lightweight internal fixture for checking the pass runs and annotates a build.

- `scripts/apply-schematic-9c-palette-intent.mjs`
  - Copies the new files into the module.
  - Exports the pass from `block-registry/index.ts`.
  - Wires the pass into `persistGeneratedBuild` before `applyBlockRegistryToBuild`.

- `scripts/verify-schematic-9c-palette-intent.mjs`
  - Verifies the package has been copied and wired correctly.

## Install

From the repo root:

```powershell
node scripts/apply-schematic-9c-palette-intent.mjs
node scripts/verify-schematic-9c-palette-intent.mjs
npx tsc --noEmit
npm run lint
```

## Test commands

```text
generate minecraft schematic: gatehouse version 1.8.8
schematic show latest
schematic validate latest
```

Expected signs of success:

- Generated build includes feature marker `version_safe_palette_9c`.
- Output warnings mention the `9C version-safe palette pass`.
- Block registry fallback count should drop where the compatibility resolver has good substitutions.
- Any unresolved blocks are still reported instead of silently hidden.

## Notes

This does not replace the final registry, exporter, or validation layers. It deliberately runs before them.

9C is a prevention layer. The later validator/export milestones remain the enforcement layer.
