# Schematic Generator 9D — Block-by-Block Version Validator

## Goal

Milestone 9D adds a final block-by-block Minecraft version validator to the schematic generation pipeline.

This pass runs after:

1. generation,
2. 9C palette intent,
3. registry fallback repair,
4. block entity normalization.

It runs before final schematic validation/export metadata is completed.

## What it catches

The validator scans every placed block in `build.blocks`, canonicalizes the block id, and checks it against the target Minecraft version using the existing block registry utilities.

It reports:

- target Minecraft version,
- placed block count checked,
- distinct block types checked,
- invalid placed block count,
- invalid block type count,
- coordinates for incompatible blocks,
- suggested replacement if the registry can resolve one.

## Why this matters

Before 9D, the generator could target Minecraft 1.8.8 and repair many modern blocks, but there was no final proof that every placed block survived the pipeline as version-safe.

After 9D, leaked modern blocks are promoted into `blockRegistryReport.unsupportedBlocks`, which makes the existing `validateGeneratedBuild(...)` fail clearly instead of silently exporting a bad schematic.

## Expected output marker

Generated builds should include:

```txt
version_block_validator_9d
```

Passing builds should also include:

```txt
version_block_validation_passed
```

Failed builds should include:

```txt
version_block_validation_failed
```

## Test commands

```powershell
node scripts/apply-schematic-9d-block-version-validator.mjs
node scripts/verify-schematic-9d-block-version-validator.mjs
npx tsc --noEmit
npm run lint
```

Then in Chernobog:

```txt
generate minecraft schematic: gatehouse version 1.8.8
schematic show latest
schematic validate latest
```

Look for:

```txt
9D block-by-block version validation passed for Minecraft 1.8.8
```

If a modern block leaks, output should include coordinate-specific entries like:

```txt
9D incompatible block minecraft:lantern x2: Block minecraft:lantern was introduced in Minecraft 1.14, which is newer than target 1.8.8. Coordinates: 1,0,0; 2,0,0. Suggested replacement: minecraft:torch.
```
