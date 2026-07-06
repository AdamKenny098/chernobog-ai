# Schematic Generator 9E — Version Conversion Command

## Goal

Milestone 9E turns the already-parsed command below into a real conversion action:

```txt
convert schematic <buildId> to version 1.8.8
```

Before 9E, the command could parse and report conversion intent. After 9E, it writes a new converted build with its own `.schem`, debug JSON, metadata JSON, vault note, and latest-build record.

## Conversion pipeline

9E intentionally does not mutate the source build.

1. Read the source metadata from `exports/schematics/metadata/<buildId>.metadata.json`.
2. Read the source debug JSON because the metadata does not contain the full block grid.
3. Rebuild a `GeneratedSchematicBuild` from the debug block grid and metadata.
4. Create a new converted build id.
5. Set `targetMinecraftVersion`.
6. Force vanilla fallback behavior for the requested target version.
7. Run `applyBlockRegistryToBuild(...)`.
8. Run `normalizeBlockEntitiesForBuild(...)`.
9. Run the 9D block-by-block validator.
10. Validate the generated block grid.
11. Export debug JSON.
12. Export `.schem`.
13. Validate the written `.schem`.
14. Write metadata, vault note, and latest-build record.

## Feature markers

Converted builds receive these feature markers:

```txt
version_conversion_9e
converted_from_<sourceBuildId>
converted_to_<targetVersionSlug>
```

## Expected command

```txt
convert schematic siriocraft_gatehouse-2026-07-05T23-55-46-414Z to version 1.8.8
```

Expected output includes:

```txt
Source Build ID: <source>
Converted Build ID: <new-id>
Target Minecraft Version: 1.8.8
Fallback Replacements: <number>
Unsupported Blocks: <number>
Validation: passed
Schematic: exports/schematics/<new-id>.schem
Debug JSON: exports/schematics/debug/<new-id>.debug.json
Metadata JSON: exports/schematics/metadata/<new-id>.metadata.json
Vault Note: vault/chernobog/Minecraft/Schematics/<new-id>.md
```

## Limitation

9E requires the source debug JSON. That is by design: metadata alone stores summary information, not the full coordinate-level block grid needed to write a converted schematic.
