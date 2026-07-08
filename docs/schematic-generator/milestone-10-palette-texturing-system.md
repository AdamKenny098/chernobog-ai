# Milestone 10 — Palette + Texturing System

## Goal

Chernobog can generate reusable Minecraft build palettes and apply those palettes during schematic generation or to existing exported schematics.

Milestone 9 made block selection version-aware. Milestone 10 builds on that by making materials reusable, inspectable, generated, validated, and re-applied.

## Storage

```txt
data/schematic-palettes/
  medieval-1.8.8.json
  create-industrial-1.20.1.json
  abandoned-stone.json
  snowy-frontier-vanilla.json
```

Each palette defines these required roles:

```txt
wallPrimary
wallSecondary
trim
roof
floor
window
accent
light
path
foundation
```

Weighted texture roles are optional:

```txt
wallTexture
floorTexture
roofTexture
foundationTexture
pathTexture
accentTexture
```

Example:

```json
"wallTexture": [
  { "block": "minecraft:stone_bricks", "weight": 70 },
  { "block": "minecraft:cracked_stone_bricks", "weight": 20 },
  { "block": "minecraft:cobblestone", "weight": 10 }
]
```

## Commands

```txt
list palettes
show palette <id>
validate palette <id> [version/profile]
generate palette <prompt> [version/profile]
generate <structure> using palette <id> [version/profile]
apply palette <id> to schematic <id|latest> [version/profile]
```

Examples:

```txt
generate palette medieval castle 1.8.8
generate palette abandoned factory 1.20.1
generate palette snowy frontier vanilla
generate tower using palette medieval-1.8.8
generate factory using palette create-industrial-1.20.1
apply palette abandoned-stone to schematic latest
```

## Architecture

```txt
palettes/
  paletteTypes.ts       Shared palette types
  palettePaths.ts       data/schematic-palettes path helpers
  paletteLibrary.ts     List, load, save, validate JSON palettes
  paletteFactory.ts     Prompt-to-palette generation templates
  paletteVersioning.ts  Milestone 9 block registry compatibility pass
  paletteTexturing.ts   Weighted block resolver
  applyPaletteToBuild.ts Post-generation build retexturing
  paletteFormatter.ts   CLI/chat formatting
  index.ts              Barrel exports
```

## Compatibility behavior

When a palette is validated or applied, the system runs palette blocks through the existing block registry path. If a palette block is unsupported by the requested target version/profile, the registry can replace it with a known fallback. If no fallback is available, the palette validation result is marked invalid.

## Generator migration path

Milestone 10 does not require rewriting every structure generator. The first safe implementation is:

1. Generate the structure normally.
2. Load a palette if the command requested one.
3. Apply the palette to the generated build.
4. Run final registry/version validation.
5. Export as normal.

Later, generators should gradually request semantic material slots directly:

```ts
resolvePaletteMaterial(palette, "palette.wall.texture", { x, y, z }, seed)
```

That is the cleaner long-term system because layout logic stops caring about exact block names.

## Acceptance checklist

- `list palettes` returns palette library entries.
- `show palette medieval-1.8.8` displays role blocks and weighted textures.
- `validate palette medieval-1.8.8 1.8.8` runs through the block registry.
- `generate palette abandoned factory 1.20.1` writes a JSON palette under `data/schematic-palettes/`.
- `generate tower using palette medieval-1.8.8` generates a normal schematic with palette-aware materials.
- `apply palette abandoned-stone to schematic latest` creates a new retextured exported schematic.
- Existing commands still work if no palette is requested.
