# Schematic Generator 9F — Final Version Hardening

## Goal

9F is the final Milestone 9 patch for **Minecraft Version Block Limits**.

Previous Milestone 9 work added:

- 9A — block registry and version comparison
- 9B — version parsing/reporting
- 9C — generation-time version-safe palette intent
- 9D — block-by-block version validator
- 9E — conversion command that writes a downgraded build

9F closes the loop by adding a final registry-hardening pass that runs after the normal block registry repair and before 9D validation.

## Why this exists

The base registry already handles common blocks and profile fallbacks. But as generators expand, new blocks can leak in from:

- newer Minecraft versions
- newer decorative variants
- 1.21 copper/trial chamber blocks
- modern workstations
- sculk/amethyst/archaeology blocks
- Create blocks not yet covered by the base fallback table
- unknown blocks emitted by future generators

9F catches those cases without replacing the whole registry file.

## Pipeline placement

9F should run here:

```ts
const registryBuild = applyBlockRegistryToBuild(...);
const milestone9FinalBuild = applyMilestone9FFinalVersionHardeningToBuild(registryBuild);
const normalized = normalizeBlockEntitiesForBuild(milestone9FinalBuild);
const versionValidatedBuild = applyBlockVersionValidationToBuild(normalized.build);
```

That means the final flow is:

1. Generator creates build.
2. 9C chooses version-safer palette intent.
3. Registry applies normal substitutions.
4. 9F catches registry gaps and unknown modern blocks.
5. Block entities normalize.
6. 9D validates every placed block.
7. Export proceeds.

## Feature markers

9F adds:

```txt
version_registry_hardening_9f
version_registry_hardening_clean
minecraft_version_block_limits_complete
```

If unresolved blocks remain, the clean marker is replaced with:

```txt
version_registry_hardening_needs_review
```

## Coverage added

9F adds conservative fallback coverage for:

- tuff, calcite, dripstone, mud, reinforced deepslate
- stripped logs and modern wood variants
- bamboo/crimson/warped wood families
- copper bulbs, copper grates, copper doors/trapdoors, heavy core, trial spawner, vault
- smoker, blast furnace, grindstone, stonecutter, smithing table, cartography table, fletching table, composter, lectern, bell
- candles, soul torch, shroomlight, froglights, glow lichen
- amethyst, tinted glass, sculk family, decorated pots, suspicious sand/gravel
- additional Create blocks such as gearboxes, bearings, depot, basin, crushing wheels, fans, pumps, tanks, and item vaults

## Success condition

For a target like Minecraft 1.8.8, 9F should reduce modern leaked blocks into legacy-safe substitutes before 9D runs.

Expected final command result should include something like:

```txt
Features: ..., version_registry_hardening_9f, version_registry_hardening_clean, minecraft_version_block_limits_complete
Version Validation: passed
Invalid Blocks: 0
```

## Notes

9F does not try to perfectly preserve every visual detail. It makes conservative choices. A modern copper bulb becoming glowstone or torch is better than exporting an invalid 1.8.8 block.
