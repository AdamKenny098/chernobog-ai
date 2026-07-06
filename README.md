# Chernobog Milestone 8K — Correct Minecraft Texture Rendering

Direct-copy overlay package. No scripts, no patches, no payloads.

This package does **not** include Mojang/Microsoft texture files. It implements correct per-face Minecraft texture support and expects you to provide local texture files from your own Minecraft installation under `public/schematic-textures/minecraft/`.

## What this adds

- Per-face block texture rules.
- Correct handling for common Minecraft blocks:
  - grass block top/side/bottom
  - logs/stems top versus bark side
  - stripped logs
  - crafting tables
  - furnaces/blast furnaces/smokers
  - bookshelves
  - pumpkins/jack-o-lanterns
  - glass/water/leaves transparency
  - modern and legacy texture aliases
- Texture fallback search across multiple layouts.
- Viewer replacement that uses six-sided block materials.
- Diagnostics endpoint to confirm whether texture files are discoverable.

## Files included

```txt
app/api/minecraft-schematic/textures/explain/route.ts
lib/modules/minecraft-schematic/components/visual-library/minecraftBlockTextureRules.ts
lib/modules/minecraft-schematic/components/visual-library/minecraftTextureResolver.ts
lib/modules/minecraft-schematic/components/visual-library/SchematicVoxelViewer.tsx
public/schematic-textures/minecraft/.gitkeep
README.md
```

## Expected local texture layouts

Any of these work:

```txt
public/schematic-textures/minecraft/<name>.png
public/schematic-textures/minecraft/block/<name>.png
public/schematic-textures/minecraft/blocks/<name>.png
public/schematic-textures/minecraft/assets/minecraft/textures/block/<name>.png
public/schematic-textures/minecraft/assets/minecraft/textures/blocks/<name>.png
```

Modern Minecraft jars use:

```txt
assets/minecraft/textures/block/
```

Legacy Minecraft jars, including 1.8.8, often use:

```txt
assets/minecraft/textures/blocks/
```

## Local extraction command

Run from the root of `chernobog-ai-ui`.

Change `$version` to whichever Minecraft version you have launched locally.

```powershell
$version = "1.21.1"
$jar = "$env:APPDATA\.minecraft\versions\$version\$version.jar"
$dest = "public\schematic-textures\minecraft"
$tmp = Join-Path $env:TEMP "chernobog-minecraft-assets-$version"

if (!(Test-Path $jar)) {
  throw "Minecraft jar not found: $jar. Launch Minecraft $version once first, then try again."
}

Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
New-Item -ItemType Directory -Force -Path $dest | Out-Null

Copy-Item $jar "$tmp\minecraft-$version.zip"
Expand-Archive "$tmp\minecraft-$version.zip" "$tmp\extracted" -Force

$modernBlockPath = "$tmp\extracted\assets\minecraft\textures\block"
$legacyBlockPath = "$tmp\extracted\assets\minecraft\textures\blocks"

if (Test-Path $modernBlockPath) {
  Copy-Item "$modernBlockPath\*.png" $dest -Force
}

if (Test-Path $legacyBlockPath) {
  Copy-Item "$legacyBlockPath\*.png" $dest -Force
}

Write-Host "Copied Minecraft block textures into $dest"
```

## Diagnostics

After applying this overlay and extracting local textures, run:

```powershell
npx tsc --noEmit
npm run lint
npm run dev
```

Then open:

```txt
http://localhost:3000/api/minecraft-schematic/textures/explain?block=minecraft:grass_block
http://localhost:3000/api/minecraft-schematic/textures/explain?block=minecraft:oak_log
http://localhost:3000/api/minecraft-schematic/textures/explain?block=minecraft:crafting_table
http://localhost:3000/api/minecraft-schematic/textures/explain?block=minecraft:furnace
```

If `found` is `true`, Chernobog can see at least one texture for that block.

## Viewer test

```txt
http://localhost:3000/schematics/<real-schematic-id>
http://localhost:3000/schematics/<real-schematic-id>?highlight=grass_block
http://localhost:3000/schematics/<real-schematic-id>?view=top-down
http://localhost:3000/schematics/<real-schematic-id>?view=layer&layer=0
```

## Notes

This is a renderer hardening package, not a `.schem` parser upgrade. If your schematic payload only contains metadata and not block coordinates, the viewer still falls back to a small placeholder structure. Correct texture rendering requires actual voxel/block payloads from the schematic library reader.
