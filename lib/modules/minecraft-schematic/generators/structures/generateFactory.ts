import type { BlockRegistryProfileId, GeneratedSchematicBuild, MinecraftBlockName, SchematicBlockEntity, SchematicVariant } from "../../types";
import { getSirioCraftPreset } from "../../presets/siriocraft";
import { blockState, SchematicBlockGrid } from "./SchematicBlockGrid";
import { placeLanternPost } from "./detailHelpers";
import {
  placeChimneyStack,
  placeCogwheelMotif,
  placeIndustrialFence,
  placeIndustrialWindowPanelEastWest,
  placeIndustrialWindowPanelNorthSouth,
  placeLoadingBayNorth,
  placePipeRunX,
  placePipeRunZ,
  placeRoofVent,
  placeSawtoothRoof,
  placeSteppedWarehouseRoof,
  placeStorageCluster,
} from "./industrialDetailHelpers";
import { createIndustrialPalette, industrialPalette as vanillaIndustrialPalette } from "./structurePalettes";
import type { StructurePalette } from "./structurePalettes";

type GenerateStructureOptions = {
  prompt: string;
  command: string;
  presetId?: string;
  variant?: SchematicVariant;
  minecraftVersion?: string;
  profile?: BlockRegistryProfileId | string;
  allowModdedBlocks?: boolean;
  fallbackToVanilla?: boolean;
};

let industrialPalette: StructurePalette = vanillaIndustrialPalette;

function getFactoryProfileSettings(options: GenerateStructureOptions): {
  profile: BlockRegistryProfileId;
  allowModdedBlocks: boolean;
  fallbackToVanilla: boolean;
} {
  const preset = options.presetId ? getSirioCraftPreset(options.presetId) : undefined;
  const profile = (options.profile ?? preset?.profile ?? "vanilla") === "siriocraft-create" ? "siriocraft-create" : "vanilla";

  return {
    profile,
    allowModdedBlocks: options.allowModdedBlocks ?? preset?.allowModdedBlocks ?? profile === "siriocraft-create",
    fallbackToVanilla: options.fallbackToVanilla ?? preset?.fallbackToVanilla ?? true,
  };
}

function shouldUseCreateBlocks(options: GenerateStructureOptions): boolean {
  const settings = getFactoryProfileSettings(options);
  return settings.profile === "siriocraft-create" && settings.allowModdedBlocks;
}

function resolveIndustrialPalette(options: GenerateStructureOptions): StructurePalette {
  return shouldUseCreateBlocks(options) ? createIndustrialPalette : vanillaIndustrialPalette;
}

function createProfileFeatureFlags(options: GenerateStructureOptions): string[] {
  return shouldUseCreateBlocks(options)
    ? [
        "siriocraft_create_profile",
        "create_cogwheel_blocks",
        "create_fluid_pipe_blocks",
        "create_casing_blocks",
        "create_shaft_blocks",
      ]
    : ["vanilla_industrial_palette"];
}

function isStorageYard(options: GenerateStructureOptions): boolean {
  return options.presetId === "industrial_storage_yard" || options.variant === "industrial_storage_yard";
}

function placeStarterFactoryFoundation(grid: SchematicBlockGrid): void {
  grid.fill(0, 0, 0, 42, 0, 34, industrialPalette.foundation);
  grid.fill(1, 1, 1, 41, 1, 33, industrialPalette.floor);

  // Yard and loading path blocks are intentionally different so the front approach reads in preview.
  grid.fill(30, 1, 1, 41, 1, 14, industrialPalette.road);
  grid.fill(9, 1, 0, 20, 1, 4, industrialPalette.road);
}

function placeStarterFactoryHall(grid: SchematicBlockGrid): void {
  const x1 = 1;
  const x2 = 29;
  const z1 = 5;
  const z2 = 30;

  grid.fill(x1, 2, z1, x2, 12, z2, industrialPalette.wall);
  grid.clearBox(x1 + 1, 2, z1 + 1, x2 - 1, 11, z2 - 1);
  grid.fill(x1 + 1, 1, z1 + 1, x2 - 1, 1, z2 - 1, industrialPalette.floor);

  // Vertical trim/bay columns stop the long brick sides from reading as one flat slab.
  for (const x of [1, 8, 15, 22, 29]) {
    grid.pillar(x, z1, 2, 13, industrialPalette.trim);
    grid.pillar(x, z2, 2, 13, industrialPalette.trim);
  }

  for (const z of [5, 12, 19, 26, 30]) {
    grid.pillar(x1, z, 2, 13, industrialPalette.trim);
    grid.pillar(x2, z, 2, 13, industrialPalette.trim);
  }

  grid.lineX(x1, x2, 4, z1, industrialPalette.trim);
  grid.lineX(x1, x2, 11, z1, industrialPalette.trim);
  grid.lineX(x1, x2, 4, z2, industrialPalette.trim);
  grid.lineX(x1, x2, 11, z2, industrialPalette.trim);
  grid.lineZ(x1, 4, z1, z2, industrialPalette.trim);
  grid.lineZ(x2, 4, z1, z2, industrialPalette.trim);
}

function placeStarterFactoryAnnex(grid: SchematicBlockGrid): void {
  const x1 = 29;
  const x2 = 40;
  const z1 = 16;
  const z2 = 31;

  grid.fill(x1, 2, z1, x2, 8, z2, industrialPalette.wall);
  grid.clearBox(x1 + 1, 2, z1 + 1, x2 - 1, 7, z2 - 1);
  grid.fill(x1 + 1, 1, z1 + 1, x2 - 1, 1, z2 - 1, industrialPalette.floor);

  for (const [x, z] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]] as const) {
    grid.pillar(x, z, 2, 9, industrialPalette.trim);
  }

  placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, 32, 36, z1, 4, 6);
  placeIndustrialWindowPanelEastWest(grid, industrialPalette, x2, 20, 24, 4, 6);
  placeSteppedWarehouseRoof(grid, industrialPalette, x1, x2, z1, z2, 9);
}

function placeStarterFactoryWindows(grid: SchematicBlockGrid): void {
  placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, 4, 7, 5, 5, 9);
  placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, 22, 25, 5, 5, 9);

  for (const [x1, x2] of [[4, 7], [12, 15], [22, 25]] as const) {
    placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, x1, x2, 30, 5, 10);
  }

  for (const [z1, z2] of [[9, 12], [17, 20], [24, 27]] as const) {
    placeIndustrialWindowPanelEastWest(grid, industrialPalette, 1, z1, z2, 5, 9);
  }

  placeIndustrialWindowPanelEastWest(grid, industrialPalette, 29, 8, 11, 5, 9);
}

function placeStarterFactoryRoof(grid: SchematicBlockGrid): void {
  placeSawtoothRoof(grid, industrialPalette, 0, 30, 4, 31, 13, 7);

  // Vents sit on/near high sawtooth strips. These are deliberately chunky vanilla placeholders.
  placeRoofVent(grid, industrialPalette, 6, 19, 10);
  placeRoofVent(grid, industrialPalette, 13, 19, 20);
  placeRoofVent(grid, industrialPalette, 20, 19, 11);
  placeRoofVent(grid, industrialPalette, 27, 19, 23);
}

function placeStarterFactoryYard(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  placeIndustrialFence(grid, industrialPalette, 30, 1, 41, 14, 34, 38);

  // Loading yard details.
  placeStorageCluster(grid, industrialPalette, blockEntities, 33, 2, 6, "Yard input");
  placeStorageCluster(grid, industrialPalette, blockEntities, 37, 2, 9, "Yard output");

  // Small gantry/crane silhouette using only vanilla materials.
  for (const [x, z] of [[32, 3], [32, 12], [40, 3], [40, 12]] as const) {
    grid.pillar(x, z, 2, 7, industrialPalette.support);
  }

  grid.lineX(32, 40, 8, 3, industrialPalette.trim);
  grid.lineX(32, 40, 8, 12, industrialPalette.trim);
  grid.lineZ(36, 9, 3, 12, industrialPalette.trim);
  grid.pillar(36, 8, 5, 9, industrialPalette.bars);
  grid.set(36, 4, 8, industrialPalette.metal);

  for (const [x, z] of [[31, 2], [40, 2], [31, 13], [40, 13]] as const) {
    placeLanternPost(grid, x, z, 2, 4, industrialPalette.fence, industrialPalette.lamp);
  }
}

function placeStarterFactoryPipesAndMachines(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  placePipeRunX(grid, industrialPalette, 3, 27, 11, 4, [6, 13, 21, 27]);
  placePipeRunZ(grid, industrialPalette, 2, 10, 7, 28, [10, 18, 26]);
  placePipeRunZ(grid, industrialPalette, 28, 12, 8, 28, [13, 22]);

  // Interior catwalks: visible in layer view and useful if the build is pasted hollow.
  grid.fill(4, 8, 9, 27, 8, 10, industrialPalette.roofSlab);
  grid.fill(23, 8, 10, 24, 8, 25, industrialPalette.roofSlab);
  grid.lineX(4, 27, 9, 8, industrialPalette.bars);
  grid.lineX(4, 27, 9, 11, industrialPalette.bars);
  grid.lineZ(22, 9, 10, 25, industrialPalette.bars);
  grid.lineZ(25, 9, 10, 25, industrialPalette.bars);

  for (const x of [5, 11, 17, 23, 27]) {
    grid.pillar(x, 9, 2, 8, industrialPalette.support);
  }

  for (const z of [12, 16, 20, 24]) {
    grid.pillar(23, z, 2, 8, industrialPalette.support);
    grid.pillar(24, z, 2, 8, industrialPalette.support);
  }

  // Machine wall. These are vanilla placeholders for shafts/presses/cog assemblies.
  grid.fill(9, 2, 17, 22, 2, 20, industrialPalette.metal);
  grid.lineX(9, 22, 3, 18, industrialPalette.pipe);
  grid.set(11, 4, 18, industrialPalette.gear);
  grid.set(15, 4, 18, industrialPalette.gear);
  grid.set(20, 4, 18, industrialPalette.gear);
  grid.pillar(13, 18, 2, 6, industrialPalette.pipe);
  grid.pillar(18, 18, 2, 6, industrialPalette.pipe);

  placeStorageCluster(grid, industrialPalette, blockEntities, 31, 2, 25, "Annex storage");
}

function placeStarterFactorySignsAndMotifs(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  placeLoadingBayNorth(grid, industrialPalette, 11, 19, 5, 2, 8);
  placeCogwheelMotif(grid, industrialPalette, 15, 10, 5);
  placeCogwheelMotif(grid, industrialPalette, 8, 8, 30);
  placeCogwheelMotif(grid, industrialPalette, 22, 8, 30);
  placeChimneyStack(grid, industrialPalette, 3, 26, 2, 17);

  const sign = blockState("minecraft:oak_wall_sign" as MinecraftBlockName, { facing: "north", waterlogged: false });
  grid.set(21, 5, 4, sign);
  blockEntities.push({
    id: "minecraft:oak_wall_sign",
    kind: "sign",
    x: 21,
    y: 5,
    z: 4,
    text: ["SirioCraft", "Starter", "Factory"],
    label: "Factory sign",
  });
}

function generateStarterFactory(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 43, y: 27, z: 35 });
  const blockEntities: SchematicBlockEntity[] = [];

  placeStarterFactoryFoundation(grid);
  placeStarterFactoryHall(grid);
  placeStarterFactoryAnnex(grid);
  placeStarterFactoryWindows(grid);
  placeStarterFactoryRoof(grid);
  placeStarterFactoryYard(grid, blockEntities);
  placeStarterFactoryPipesAndMachines(grid, blockEntities);
  placeStarterFactorySignsAndMotifs(grid, blockEntities);

  return grid.toBuild({
    buildIdPrefix: "create_starter_factory",
    displayName: "Create-Style Starter Factory",
    generatorName: "factory",
    variant: "create_starter_factory",
    presetId: options.presetId ?? "create_starter_factory",
    ...getFactoryProfileSettings(options),
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "large_industrial_hall",
      "sawtooth_roof",
      "side_annex",
      "loading_bay",
      "yard_foundation",
      "chimney_stack",
      "roof_vents",
      "industrial_window_bands",
      "catwalks",
      "pipe_runs",
      "machine_wall_placeholders",
      "vanilla_cogwheel_motifs",
      "gantry_crane_placeholder",
      "labelled_storage_placeholders",
      "sign_text_metadata",
      ...createProfileFeatureFlags(options),
    ],
    blockEntities,
    placementWarnings: addIndustrialBuildWarning("Create-style starter factory", options),
  });
}

function placeStorageYardWarehouse(grid: SchematicBlockGrid): void {
  // Keep the warehouse secondary. The yard should be the hero of this preset.
  const x1 = 31;
  const x2 = 41;
  const z1 = 14;
  const z2 = 29;

  grid.fill(x1, 2, z1, x2, 7, z2, industrialPalette.wall);
  grid.clearBox(x1 + 1, 2, z1 + 1, x2 - 1, 6, z2 - 1);
  grid.fill(x1 + 1, 1, z1 + 1, x2 - 1, 1, z2 - 1, industrialPalette.floor);

  for (const [x, z] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]] as const) {
    grid.pillar(x, z, 2, 8, industrialPalette.trim);
  }

  grid.lineX(x1, x2, 4, z1, industrialPalette.trim);
  grid.lineX(x1, x2, 4, z2, industrialPalette.trim);
  grid.lineZ(x1, 4, z1, z2, industrialPalette.trim);
  grid.lineZ(x2, 4, z1, z2, industrialPalette.trim);

  placeLoadingBayNorth(grid, industrialPalette, 34, 39, z1, 2, 5);
  placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, 33, 35, z2, 4, 5);
  placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, 38, 40, z2, 4, 5);
  placeIndustrialWindowPanelEastWest(grid, industrialPalette, x1, 18, 22, 4, 5);
  placeIndustrialWindowPanelEastWest(grid, industrialPalette, x2, 18, 22, 4, 5);
  placeSteppedWarehouseRoof(grid, industrialPalette, x1, x2, z1, z2, 8);
}

function placeStorageYardPerimeter(grid: SchematicBlockGrid): void {
  grid.fill(0, 0, 0, 44, 0, 33, industrialPalette.foundation);
  grid.fill(1, 1, 1, 43, 1, 32, industrialPalette.road);

  // Open yard texture variation: loading lanes and storage pads.
  grid.fill(3, 1, 5, 30, 1, 12, industrialPalette.floor);
  grid.fill(3, 1, 15, 28, 1, 29, industrialPalette.road);
  grid.fill(31, 1, 13, 42, 1, 30, industrialPalette.floor);

  placeIndustrialFence(grid, industrialPalette, 1, 2, 43, 32, 17, 25);
  // The helper opens both long sides for the gate range. Close the rear so only the front reads as a yard entrance.
  grid.lineX(17, 25, 2, 32, industrialPalette.fence);

  for (const [x, z] of [[1, 2], [16, 2], [26, 2], [43, 2], [1, 32], [43, 32]] as const) {
    grid.pillar(x, z, 2, 4, industrialPalette.support);
  }

  grid.lineX(18, 24, 1, 1, industrialPalette.road);
  grid.lineX(17, 25, 1, 2, industrialPalette.road);
}

function placeStorageYardRailSiding(grid: SchematicBlockGrid): void {
  const rail = "minecraft:rail" as MinecraftBlockName;

  grid.fill(3, 1, 5, 30, 1, 9, industrialPalette.cracked);
  for (let x = 4; x <= 29; x += 1) {
    grid.set(x, 2, 6, rail);
    grid.set(x, 2, 8, rail);

    if (x % 4 === 0) {
      grid.set(x, 2, 7, industrialPalette.roofSlab);
    }
  }

  // Raised loading platform beside the siding.
  grid.fill(5, 2, 10, 29, 2, 13, industrialPalette.floor);
  grid.lineX(5, 29, 3, 10, industrialPalette.trim);
  grid.lineX(5, 29, 3, 13, industrialPalette.trim);
  for (const x of [5, 10, 15, 20, 25, 29]) {
    grid.pillar(x, 10, 2, 4, industrialPalette.support);
    grid.pillar(x, 13, 2, 4, industrialPalette.support);
  }
}

function placeStorageYardGantryCrane(grid: SchematicBlockGrid): void {
  // Taller, wider crane so the yard has a clear industrial landmark.
  for (const [x, z] of [[5, 4], [5, 15], [29, 4], [29, 15]] as const) {
    grid.pillar(x, z, 2, 9, industrialPalette.support);
  }

  grid.lineX(5, 29, 10, 4, industrialPalette.trim);
  grid.lineX(5, 29, 10, 15, industrialPalette.trim);
  grid.lineZ(5, 10, 4, 15, industrialPalette.trim);
  grid.lineZ(29, 10, 4, 15, industrialPalette.trim);
  grid.lineX(6, 28, 11, 9, industrialPalette.metal);
  grid.lineX(6, 28, 12, 9, industrialPalette.bars);

  // Trolley and hanging hook placeholder.
  grid.fill(17, 11, 8, 19, 12, 10, industrialPalette.metal);
  grid.pillar(18, 9, 5, 10, industrialPalette.bars);
  grid.set(18, 4, 9, industrialPalette.gear);
}

function placeStorageYardPipeAndMaterialRacks(grid: SchematicBlockGrid): void {
  // Pipe racks along the rear fence.
  for (const z of [25, 28]) {
    for (const x of [5, 12, 19, 26]) {
      grid.pillar(x, z, 2, 4, industrialPalette.support);
    }

    grid.lineX(5, 26, 4, z, industrialPalette.pipe);
    grid.lineX(5, 26, 5, z, industrialPalette.pipe);
  }

  // Timber/beam stack placeholders.
  for (const z of [18, 20, 22]) {
    grid.lineX(6, 16, 2, z, industrialPalette.roof);
    grid.lineX(6, 16, 3, z, industrialPalette.roof);
  }

  // Loose metal stock piles.
  grid.fill(21, 2, 17, 26, 2, 18, industrialPalette.metal);
  grid.fill(22, 3, 17, 25, 3, 17, industrialPalette.metal);
  grid.fill(22, 2, 21, 28, 2, 22, industrialPalette.pipe);
  grid.fill(24, 3, 21, 27, 3, 21, industrialPalette.pipe);
}

function placeStorageYardCargoStacks(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  placeStorageCluster(grid, industrialPalette, blockEntities, 7, 2, 16, "Inbound crates");
  placeStorageCluster(grid, industrialPalette, blockEntities, 12, 2, 16, "Outbound crates");
  placeStorageCluster(grid, industrialPalette, blockEntities, 23, 2, 24, "Bulk stone");
  placeStorageCluster(grid, industrialPalette, blockEntities, 35, 2, 9, "Warehouse loading");
  placeStorageCluster(grid, industrialPalette, blockEntities, 39, 2, 9, "Warehouse overflow");

  // Large crate stacks, deliberately more visible than individual barrels.
  const crate = blockState(industrialPalette.barrel, { facing: "up", open: false });
  for (const [x1, z1, x2, z2, height] of [
    [6, 23, 10, 25, 3],
    [13, 24, 17, 26, 2],
    [33, 24, 38, 26, 3],
  ] as const) {
    for (let y = 2; y < 2 + height; y += 1) {
      grid.fill(x1, y, z1, x2, y, z2, crate);
    }
  }

  blockEntities.push({ id: "minecraft:barrel", kind: "barrel", x: 6, y: 2, z: 23, label: "Large inbound cargo stack" });
  blockEntities.push({ id: "minecraft:barrel", kind: "barrel", x: 33, y: 2, z: 24, label: "Warehouse overflow cargo stack" });
}

function placeStorageYardLightsAndSign(grid: SchematicBlockGrid, blockEntities: SchematicBlockEntity[]): void {
  for (const [x, z] of [[3, 3], [15, 3], [27, 3], [41, 3], [3, 31], [16, 31], [29, 31], [41, 31], [30, 14]] as const) {
    placeLanternPost(grid, x, z, 2, 4, industrialPalette.support, industrialPalette.lamp);
  }

  placePipeRunX(grid, industrialPalette, 31, 42, 5, 31, [34, 39]);
  placeCogwheelMotif(grid, industrialPalette, 36, 5, 14);

  const sign = blockState("minecraft:oak_wall_sign" as MinecraftBlockName, { facing: "north", waterlogged: false });
  grid.set(36, 4, 13, sign);
  blockEntities.push({
    id: "minecraft:oak_wall_sign",
    kind: "sign",
    x: 36,
    y: 4,
    z: 13,
    text: ["Industrial", "Storage", "Yard"],
    label: "Storage yard sign",
  });
}

function generateIndustrialStorageYard(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 45, y: 22, z: 34 });
  const blockEntities: SchematicBlockEntity[] = [];

  placeStorageYardPerimeter(grid);
  placeStorageYardWarehouse(grid);
  placeStorageYardRailSiding(grid);
  placeStorageYardGantryCrane(grid);
  placeStorageYardPipeAndMaterialRacks(grid);
  placeStorageYardCargoStacks(grid, blockEntities);
  placeStorageYardLightsAndSign(grid, blockEntities);

  return grid.toBuild({
    buildIdPrefix: "industrial_storage_yard",
    displayName: "Industrial Storage Yard",
    generatorName: "factory",
    variant: "industrial_storage_yard",
    presetId: options.presetId ?? "industrial_storage_yard",
    ...getFactoryProfileSettings(options),
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "yard_first_layout",
      "secondary_warehouse",
      "fenced_perimeter",
      "front_gate",
      "rail_siding_placeholder",
      "raised_loading_platform",
      "tall_gantry_crane_placeholder",
      "pipe_and_material_racks",
      "large_cargo_stacks",
      "labelled_storage_placeholders",
      "yard_lighting",
      "sign_text_metadata",
      ...createProfileFeatureFlags(options),
    ],
    blockEntities,
    placementWarnings: addIndustrialBuildWarning("Industrial storage yard", options),
  });
}


function placeCompactFactoryShell(
  grid: SchematicBlockGrid,
  x1: number,
  x2: number,
  z1: number,
  z2: number,
  y2: number,
): void {
  grid.fill(x1, 2, z1, x2, y2, z2, industrialPalette.wall);
  grid.clearBox(x1 + 1, 2, z1 + 1, x2 - 1, y2 - 1, z2 - 1);
  grid.fill(x1 + 1, 1, z1 + 1, x2 - 1, 1, z2 - 1, industrialPalette.floor);

  for (const [x, z] of [[x1, z1], [x2, z1], [x1, z2], [x2, z2]] as const) {
    grid.pillar(x, z, 2, y2 + 1, industrialPalette.trim);
  }

  grid.lineX(x1, x2, 4, z1, industrialPalette.trim);
  grid.lineX(x1, x2, 4, z2, industrialPalette.trim);
  grid.lineZ(x1, 4, z1, z2, industrialPalette.trim);
  grid.lineZ(x2, 4, z1, z2, industrialPalette.trim);
}

function addIndustrialSign(
  grid: SchematicBlockGrid,
  blockEntities: SchematicBlockEntity[],
  x: number,
  y: number,
  z: number,
  text: string[],
  label: string,
): void {
  const sign = blockState("minecraft:oak_wall_sign" as MinecraftBlockName, { facing: "north", waterlogged: false });
  grid.set(x, y, z, sign);
  blockEntities.push({
    id: "minecraft:oak_wall_sign",
    kind: "sign",
    x,
    y,
    z,
    text,
    label,
  });
}

function addVanillaRailSiding(grid: SchematicBlockGrid, x1: number, x2: number, z: number): void {
  const rail = "minecraft:rail" as MinecraftBlockName;
  for (let x = x1; x <= x2; x += 1) {
    grid.set(x, 2, z, rail);
    grid.set(x, 2, z + 2, rail);
    if ((x - x1) % 4 === 0) {
      grid.set(x, 2, z + 1, industrialPalette.roofSlab);
    }
  }
}

function addIndustrialBuildWarning(label: string, options: GenerateStructureOptions): string[] {
  if (shouldUseCreateBlocks(options)) {
    return [
      `${label} uses the SirioCraft Create profile with selected Create block IDs.`,
      "Create belts/mechanical arms are still not emitted because their useful block states need a stricter resolver pass.",
      "fallbackToVanilla remains enabled so unsupported Create blocks can be replaced safely if the profile changes.",
    ];
  }

  return [
    `${label} uses vanilla-only industrial placeholders.`,
    "Use a siriocraft-create preset/profile to emit selected Create blocks for cogwheels, shafts, casings, and fluid pipes.",
  ];
}

function generateSmallWorkshop(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 31, y: 20, z: 25 });
  const blockEntities: SchematicBlockEntity[] = [];

  grid.fill(0, 0, 0, 30, 0, 24, industrialPalette.foundation);
  grid.fill(1, 1, 1, 29, 1, 23, industrialPalette.road);
  placeCompactFactoryShell(grid, 4, 21, 5, 19, 8);
  placeSteppedWarehouseRoof(grid, industrialPalette, 4, 21, 5, 19, 9);
  placeLoadingBayNorth(grid, industrialPalette, 9, 15, 5, 2, 5);
  placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, 5, 8, 19, 4, 6);
  placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, 15, 19, 19, 4, 6);
  placeIndustrialWindowPanelEastWest(grid, industrialPalette, 4, 9, 13, 4, 6);
  placeIndustrialWindowPanelEastWest(grid, industrialPalette, 21, 9, 13, 4, 6);

  placeChimneyStack(grid, industrialPalette, 18, 15, 2, 11);
  placePipeRunX(grid, industrialPalette, 5, 20, 7, 4, [8, 15]);
  placeCogwheelMotif(grid, industrialPalette, 15, 6, 5);
  placeRoofVent(grid, industrialPalette, 12, 13, 12);

  placeIndustrialFence(grid, industrialPalette, 22, 4, 29, 20, 24, 27);
  placeStorageCluster(grid, industrialPalette, blockEntities, 24, 2, 8, "Workshop input");
  placeStorageCluster(grid, industrialPalette, blockEntities, 24, 2, 15, "Workshop output");
  for (const [x, z] of [[23, 5], [29, 5], [23, 19], [29, 19]] as const) {
    placeLanternPost(grid, x, z, 2, 4, industrialPalette.support, industrialPalette.lamp);
  }

  addIndustrialSign(grid, blockEntities, 16, 5, 4, ["Small", "Workshop"], "Workshop sign");

  return grid.toBuild({
    buildIdPrefix: "small_workshop",
    displayName: "Small Industrial Workshop",
    generatorName: "factory",
    variant: "small_workshop",
    presetId: options.presetId ?? "small_workshop",
    ...getFactoryProfileSettings(options),
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "compact_industrial_shell",
      "workshop_yard",
      "loading_bay",
      "chimney_stack",
      "pipe_run",
      "window_bands",
      "vanilla_cogwheel_motif",
      "labelled_storage_placeholders",
      ...createProfileFeatureFlags(options),
    ],
    blockEntities,
    placementWarnings: addIndustrialBuildWarning("Small workshop", options),
  });
}

function generateMachineHouse(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 32, y: 22, z: 28 });
  const blockEntities: SchematicBlockEntity[] = [];

  grid.fill(0, 0, 0, 31, 0, 27, industrialPalette.foundation);
  grid.fill(1, 1, 1, 30, 1, 26, industrialPalette.floor);
  placeCompactFactoryShell(grid, 3, 27, 5, 22, 10);
  placeSawtoothRoof(grid, industrialPalette, 2, 28, 4, 23, 11, 6);

  for (const [x1, x2] of [[5, 8], [12, 15], [20, 24]] as const) {
    placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, x1, x2, 5, 5, 8);
    placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, x1, x2, 22, 5, 8);
  }
  placeCogwheelMotif(grid, industrialPalette, 11, 7, 5);
  placeCogwheelMotif(grid, industrialPalette, 18, 7, 5);
  placeCogwheelMotif(grid, industrialPalette, 23, 7, 22);
  placePipeRunX(grid, industrialPalette, 5, 26, 9, 4, [7, 14, 22]);
  placePipeRunZ(grid, industrialPalette, 4, 8, 7, 20, [10, 17]);
  placeRoofVent(grid, industrialPalette, 8, 17, 14);
  placeRoofVent(grid, industrialPalette, 19, 17, 12);
  placeChimneyStack(grid, industrialPalette, 23, 17, 2, 13);

  // Machine bed placeholders.
  grid.fill(8, 2, 12, 23, 2, 16, industrialPalette.metal);
  grid.lineX(8, 23, 3, 14, industrialPalette.pipe);
  for (const x of [9, 14, 19, 23]) {
    grid.pillar(x, 14, 2, 5, industrialPalette.pipe);
    grid.set(x, 6, 14, industrialPalette.gear);
  }
  placeStorageCluster(grid, industrialPalette, blockEntities, 5, 2, 19, "Machine house storage");
  addIndustrialSign(grid, blockEntities, 16, 5, 4, ["Machine", "House"], "Machine house sign");

  return grid.toBuild({
    buildIdPrefix: "machine_house",
    displayName: "Machine House",
    generatorName: "factory",
    variant: "machine_house",
    presetId: options.presetId ?? "machine_house",
    ...getFactoryProfileSettings(options),
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "machine_hall",
      "sawtooth_roof",
      "pipe_network",
      "machine_bed_placeholders",
      "chimney_stack",
      "roof_vents",
      "vanilla_cogwheel_motifs",
      "sign_text_metadata",
      ...createProfileFeatureFlags(options),
    ],
    blockEntities,
    placementWarnings: addIndustrialBuildWarning("Machine house", options),
  });
}

function generateFactoryWithYard(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 48, y: 27, z: 36 });
  const blockEntities: SchematicBlockEntity[] = [];

  grid.fill(0, 0, 0, 47, 0, 35, industrialPalette.foundation);
  grid.fill(1, 1, 1, 46, 1, 34, industrialPalette.road);
  grid.fill(2, 1, 5, 29, 1, 31, industrialPalette.floor);
  grid.fill(31, 1, 3, 45, 1, 29, industrialPalette.road);

  placeCompactFactoryShell(grid, 3, 29, 6, 31, 11);
  placeSawtoothRoof(grid, industrialPalette, 2, 30, 5, 32, 12, 7);
  placeLoadingBayNorth(grid, industrialPalette, 12, 20, 6, 2, 7);
  for (const [x1, x2] of [[5, 8], [14, 17], [23, 26]] as const) {
    placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, x1, x2, 31, 5, 9);
  }
  for (const z of [10, 17, 24]) {
    placeIndustrialWindowPanelEastWest(grid, industrialPalette, 3, z, z + 3, 5, 9);
  }

  placeChimneyStack(grid, industrialPalette, 5, 26, 2, 16);
  placePipeRunX(grid, industrialPalette, 5, 28, 10, 5, [8, 16, 24]);
  placePipeRunZ(grid, industrialPalette, 28, 11, 9, 29, [12, 21, 28]);
  placeRoofVent(grid, industrialPalette, 11, 18, 13);
  placeRoofVent(grid, industrialPalette, 21, 18, 23);
  placeCogwheelMotif(grid, industrialPalette, 16, 9, 6);

  placeIndustrialFence(grid, industrialPalette, 31, 3, 45, 31, 35, 40);
  grid.lineX(35, 40, 2, 31, industrialPalette.fence);
  placeStorageCluster(grid, industrialPalette, blockEntities, 34, 2, 8, "Yard inbound");
  placeStorageCluster(grid, industrialPalette, blockEntities, 40, 2, 11, "Yard outbound");
  placeStorageCluster(grid, industrialPalette, blockEntities, 36, 2, 23, "Bulk supplies");
  for (const [x, z] of [[33, 5], [43, 5], [33, 29], [43, 29]] as const) {
    placeLanternPost(grid, x, z, 2, 4, industrialPalette.support, industrialPalette.lamp);
  }
  // Yard gantry.
  for (const [x, z] of [[33, 15], [33, 26], [44, 15], [44, 26]] as const) {
    grid.pillar(x, z, 2, 7, industrialPalette.support);
  }
  grid.lineX(33, 44, 8, 15, industrialPalette.trim);
  grid.lineX(33, 44, 8, 26, industrialPalette.trim);
  grid.lineZ(39, 9, 15, 26, industrialPalette.metal);
  grid.pillar(39, 22, 4, 8, industrialPalette.bars);

  addIndustrialSign(grid, blockEntities, 22, 5, 5, ["Factory", "With Yard"], "Factory with yard sign");

  return grid.toBuild({
    buildIdPrefix: "factory_with_yard",
    displayName: "Factory With Yard",
    generatorName: "factory",
    variant: "factory_with_yard",
    presetId: options.presetId ?? "factory_with_yard",
    ...getFactoryProfileSettings(options),
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "factory_hall",
      "large_fenced_yard",
      "loading_bay",
      "yard_gantry_placeholder",
      "storage_clusters",
      "sawtooth_roof",
      "chimney_stack",
      "pipe_runs",
      "roof_vents",
      ...createProfileFeatureFlags(options),
    ],
    blockEntities,
    placementWarnings: addIndustrialBuildWarning("Factory with yard", options),
  });
}

function generateRailLoadingFactory(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 52, y: 24, z: 31 });
  const blockEntities: SchematicBlockEntity[] = [];

  grid.fill(0, 0, 0, 51, 0, 30, industrialPalette.foundation);
  grid.fill(1, 1, 1, 50, 1, 29, industrialPalette.road);
  grid.fill(4, 1, 12, 47, 1, 28, industrialPalette.floor);
  placeCompactFactoryShell(grid, 5, 46, 13, 27, 9);
  placeSteppedWarehouseRoof(grid, industrialPalette, 5, 46, 13, 27, 10);

  addVanillaRailSiding(grid, 3, 48, 5);
  grid.fill(5, 2, 8, 46, 2, 11, industrialPalette.floor);
  grid.lineX(5, 46, 3, 8, industrialPalette.trim);
  grid.lineX(5, 46, 3, 11, industrialPalette.trim);
  for (const x of [5, 12, 19, 26, 33, 40, 46]) {
    grid.pillar(x, 8, 2, 4, industrialPalette.support);
    grid.pillar(x, 11, 2, 4, industrialPalette.support);
  }

  for (const [x1, x2] of [[8, 12], [17, 21], [26, 30], [35, 40]] as const) {
    placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, x1, x2, 27, 4, 7);
  }
  placeLoadingBayNorth(grid, industrialPalette, 20, 30, 13, 2, 6);
  placePipeRunX(grid, industrialPalette, 7, 44, 8, 12, [13, 24, 36, 43]);
  placeCogwheelMotif(grid, industrialPalette, 38, 6, 13);
  placeRoofVent(grid, industrialPalette, 14, 15, 20);
  placeRoofVent(grid, industrialPalette, 35, 15, 20);

  placeStorageCluster(grid, industrialPalette, blockEntities, 8, 3, 9, "Rail loading crates");
  placeStorageCluster(grid, industrialPalette, blockEntities, 35, 3, 9, "Outbound freight");
  placeStorageCluster(grid, industrialPalette, blockEntities, 42, 2, 17, "Warehouse freight");
  addIndustrialSign(grid, blockEntities, 31, 5, 12, ["Rail", "Loading", "Factory"], "Rail loading factory sign");

  return grid.toBuild({
    buildIdPrefix: "rail_loading_factory",
    displayName: "Rail Loading Factory",
    generatorName: "factory",
    variant: "rail_loading_factory",
    presetId: options.presetId ?? "rail_loading_factory",
    ...getFactoryProfileSettings(options),
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "long_factory_hall",
      "rail_siding_placeholder",
      "raised_loading_platform",
      "loading_bay",
      "warehouse_roof",
      "pipe_run",
      "cargo_clusters",
      "vanilla_rail_detail",
      ...createProfileFeatureFlags(options),
    ],
    blockEntities,
    placementWarnings: addIndustrialBuildWarning("Rail loading factory", options),
  });
}

function generateWarehouseSmall(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 32, y: 18, z: 26 });
  const blockEntities: SchematicBlockEntity[] = [];

  grid.fill(0, 0, 0, 31, 0, 25, industrialPalette.foundation);
  grid.fill(1, 1, 1, 30, 1, 24, industrialPalette.road);
  placeCompactFactoryShell(grid, 4, 27, 5, 20, 7);
  placeSteppedWarehouseRoof(grid, industrialPalette, 4, 27, 5, 20, 8);
  placeLoadingBayNorth(grid, industrialPalette, 12, 19, 5, 2, 5);
  placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, 6, 9, 20, 4, 5);
  placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, 14, 17, 20, 4, 5);
  placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, 22, 25, 20, 4, 5);
  placeStorageCluster(grid, industrialPalette, blockEntities, 7, 2, 14, "Warehouse row one");
  placeStorageCluster(grid, industrialPalette, blockEntities, 14, 2, 14, "Warehouse row two");
  placeStorageCluster(grid, industrialPalette, blockEntities, 21, 2, 14, "Warehouse row three");
  for (const [x, z] of [[3, 3], [28, 3], [3, 22], [28, 22]] as const) {
    placeLanternPost(grid, x, z, 2, 4, industrialPalette.support, industrialPalette.lamp);
  }
  addIndustrialSign(grid, blockEntities, 20, 5, 4, ["Small", "Warehouse"], "Small warehouse sign");

  return grid.toBuild({
    buildIdPrefix: "warehouse_small",
    displayName: "Small Warehouse",
    generatorName: "factory",
    variant: "warehouse_small",
    presetId: options.presetId ?? "warehouse_small",
    ...getFactoryProfileSettings(options),
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "compact_warehouse",
      "loading_bay",
      "storage_rows",
      "warehouse_roof",
      "window_bands",
      "yard_lighting",
      "labelled_storage_placeholders",
      ...createProfileFeatureFlags(options),
    ],
    blockEntities,
    placementWarnings: addIndustrialBuildWarning("Small warehouse", options),
  });
}

function generatePipeworksYard(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const grid = new SchematicBlockGrid({ x: 44, y: 20, z: 29 });
  const blockEntities: SchematicBlockEntity[] = [];

  grid.fill(0, 0, 0, 43, 0, 28, industrialPalette.foundation);
  grid.fill(1, 1, 1, 42, 1, 27, industrialPalette.road);
  placeIndustrialFence(grid, industrialPalette, 1, 2, 42, 27, 17, 25);
  grid.lineX(17, 25, 2, 27, industrialPalette.fence);

  // Service hut.
  placeCompactFactoryShell(grid, 3, 14, 5, 17, 6);
  placeSteppedWarehouseRoof(grid, industrialPalette, 3, 14, 5, 17, 7);
  placeIndustrialWindowPanelNorthSouth(grid, industrialPalette, 6, 9, 17, 4, 5);
  placeLoadingBayNorth(grid, industrialPalette, 7, 11, 5, 2, 4);

  // Pipe racks and overhead utility runs.
  for (const z of [6, 10, 14, 20, 24]) {
    for (const x of [18, 25, 32, 39]) {
      grid.pillar(x, z, 2, 5, industrialPalette.support);
    }
    grid.lineX(18, 39, 5, z, industrialPalette.pipe);
    grid.lineX(18, 39, 6, z, industrialPalette.pipe);
  }
  placePipeRunX(grid, industrialPalette, 15, 41, 8, 4, [18, 28, 38]);
  placePipeRunZ(grid, industrialPalette, 41, 8, 4, 25, [8, 15, 22]);
  placeCogwheelMotif(grid, industrialPalette, 11, 5, 5);
  placeStorageCluster(grid, industrialPalette, blockEntities, 20, 2, 17, "Pipe fittings");
  placeStorageCluster(grid, industrialPalette, blockEntities, 30, 2, 17, "Valve crates");

  for (const [x, z] of [[3, 3], [17, 3], [29, 3], [41, 3], [3, 26], [17, 26], [29, 26], [41, 26]] as const) {
    placeLanternPost(grid, x, z, 2, 4, industrialPalette.support, industrialPalette.lamp);
  }
  addIndustrialSign(grid, blockEntities, 12, 4, 4, ["Pipeworks", "Yard"], "Pipeworks yard sign");

  return grid.toBuild({
    buildIdPrefix: "pipeworks_yard",
    displayName: "Pipeworks Yard",
    generatorName: "factory",
    variant: "pipeworks_yard",
    presetId: options.presetId ?? "pipeworks_yard",
    ...getFactoryProfileSettings(options),
    prompt: options.prompt,
    command: options.command,
    minecraftVersion: options.minecraftVersion,
    features: [
      "open_pipe_yard",
      "service_hut",
      "pipe_racks",
      "overhead_pipe_runs",
      "utility_gate",
      "yard_lighting",
      "storage_clusters",
      "vanilla_cogwheel_motif",
      ...createProfileFeatureFlags(options),
    ],
    blockEntities,
    placementWarnings: addIndustrialBuildWarning("Pipeworks yard", options),
  });
}

function getFactoryVariant(options: GenerateStructureOptions): string {
  return String(options.variant ?? options.presetId ?? "create_starter_factory");
}

export function generateFactory(options: GenerateStructureOptions): GeneratedSchematicBuild {
  industrialPalette = resolveIndustrialPalette(options);
  const variant = getFactoryVariant(options);

  if (isStorageYard(options) || variant === "industrial_storage_yard") {
    return generateIndustrialStorageYard(options);
  }

  if (variant === "small_workshop") {
    return generateSmallWorkshop(options);
  }

  if (variant === "machine_house") {
    return generateMachineHouse(options);
  }

  if (variant === "factory_with_yard") {
    return generateFactoryWithYard(options);
  }

  if (variant === "rail_loading_factory") {
    return generateRailLoadingFactory(options);
  }

  if (variant === "warehouse_small") {
    return generateWarehouseSmall(options);
  }

  if (variant === "pipeworks_yard") {
    return generatePipeworksYard(options);
  }

  return generateStarterFactory(options);
}
