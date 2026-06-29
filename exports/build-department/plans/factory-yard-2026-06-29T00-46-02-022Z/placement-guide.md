# factory-yard-2026-06-29T00-46-02-022Z Placement Guide

Prompt: create factory yard with train platform

## Scene Summary

- Scene type: factory_yard
- Scale: medium
- Biome hint: unknown
- Style profile: siriocraft-create
- Purpose: Server-ready Create factory yard scene plan with train and storage logistics.

## Paste Order

1. central_factory_shell.schem — Central Factory Shell
2. train_platform.schem — Train Platform
3. storage_yard.schem — Storage Yard
4. press_line_module.schem — Press Line Module
5. yard_paths.schem — Yard Paths

## Structure Layout

- **Central Factory Shell** (central_factory_shell.schem) — origin x:0, z:0, size 31x25, facing south.
- **Train Platform** (train_platform.schem) — origin x:-36, z:0, size 37x9, facing east. Dependencies: central_factory_shell.
- **Storage Yard** (storage_yard.schem) — origin x:34, z:4, size 23x19, facing west. Dependencies: central_factory_shell.
- **Press Line Module** (press_line_module.schem) — origin x:3, z:-22, size 15x11, facing south. Dependencies: central_factory_shell.
- **Yard Paths** (yard_paths.schem) — origin x:0, z:28, size 55x17, facing north. Dependencies: central_factory_shell, train_platform, storage_yard.

## Roads

- road_1_central_factory_shell_to_train_platform: central_factory_shell → train_platform, width 5, role rail_path
- road_2_central_factory_shell_to_storage_yard: central_factory_shell → storage_yard, width 3, role main_path
- road_3_central_factory_shell_to_press_line_module: central_factory_shell → press_line_module, width 3, role factory_path
- road_4_central_factory_shell_to_yard_paths: central_factory_shell → yard_paths, width 3, role main_path

## Zones

- Industrial Core: industrial, x:-24..24, z:-22..22
- Transport Edge: transport, x:-60..-12, z:-10..10
- Storage Side: storage, x:14..54, z:-14..22

## Terrain Preparation

- Recommended paste origin: x:0, y:72, z:0
- Foundation depth: 3
- Flattening bounds: x:-48..48, z:-48..48
- Support stilts: no
- Basement fill: yes

## Biome Dressing Hints

- Use local biome blocks for path edges, vegetation, and retaining walls.
- Keep major roads readable from above.

## Warnings

- M6-D is a scene planning layer only. It does not yet export multi-schematic packs.
- Structure generators are referenced by generatorHint and will be wired in M6-E.
