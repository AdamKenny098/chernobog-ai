# Chernobog Build Department — Milestone 6 Final Status

Milestone 6 is the first complete version of the Chernobog Minecraft Schematic Build Department.

## Status

Complete candidate.

## Completed

- Create mechanical graph spine
- Create graph to `.schem` export
- Create machine polish
- Scene planner core
- Scene pack filesystem contract
- Real multi-schematic pack compiler
- Quality-preserving pack compiler
- Pack review and safe repair
- Vanilla preview / Schemat.io compatibility export
- Build Department command layer
- Final command/documentation pass

## Final Command Set

```txt
build department status
build department plan create factory yard with train platform
build department generate create factory yard with train platform
build department full pipeline create factory yard with train platform
build department review latest
build department repair latest
build department preview latest
schematic pack latest
schematic review pack latest
schematic repair pack latest
schematic preview pack latest
milestone 6 status
write milestone 6 docs
```

## Recommended SirioCraft Workflow

1. Run `build department status`.
2. Run `build department full pipeline create factory yard with train platform`.
3. Inspect the generated pack folder.
4. Use vanilla-preview schematics for browser viewing.
5. Use original schematics in a Create-enabled Minecraft instance.
6. Run `build department review latest` after every full pipeline export.
7. Run `build department repair latest` only for metadata/latest-pointer drift.

## Known Limitations

- Build Department roles are deterministic orchestration layers, not autonomous multi-agent workers yet.
- Safe repair refreshes metadata and latest pointers only.
- Road/path modules still use simpler fallback geometry.
- Vanilla previews are browser-viewer compatibility artifacts, not final build files.
- Create/modded schematics should be validated in a Create-enabled Minecraft instance.
- Terrain awareness is metadata-led; the generator does not yet conform schematics to live terrain.
