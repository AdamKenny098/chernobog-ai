# Chernobog schematic texture folders

Milestone 8J supports multiple local texture layouts. Do not commit or redistribute official Minecraft textures unless you have the rights to do so. Use this folder for local development copies extracted from your own installed client or for custom/resource-pack textures you are allowed to use.

Supported vanilla layouts:

```txt
public/schematic-textures/minecraft/<name>.png
public/schematic-textures/minecraft/block/<name>.png
public/schematic-textures/minecraft/blocks/<name>.png
public/schematic-textures/minecraft/textures/block/<name>.png
public/schematic-textures/minecraft/textures/blocks/<name>.png
public/schematic-textures/minecraft/assets/minecraft/textures/block/<name>.png
public/schematic-textures/minecraft/assets/minecraft/textures/blocks/<name>.png
```

Recommended simple layout:

```txt
public/schematic-textures/minecraft/stone.png
public/schematic-textures/minecraft/oak_planks.png
public/schematic-textures/minecraft/glass.png
```

Recommended direct extracted layout:

```txt
public/schematic-textures/minecraft/assets/minecraft/textures/block/stone.png
```

Legacy Minecraft versions may use:

```txt
public/schematic-textures/minecraft/assets/minecraft/textures/blocks/stone.png
```

Supported modded layouts:

```txt
public/schematic-textures/modded/<namespace>/<name>.png
public/schematic-textures/modded/<namespace>/block/<name>.png
public/schematic-textures/modded/<namespace>/blocks/<name>.png
public/schematic-textures/modded/<namespace>/assets/<namespace>/textures/block/<name>.png
public/schematic-textures/modded/<namespace>/assets/<namespace>/textures/blocks/<name>.png
```

After copying textures, restart the dev server and check:

```txt
/api/minecraft-schematic/textures/diagnostics
/api/minecraft-schematic/textures/diagnostics?block=minecraft:stone
```
