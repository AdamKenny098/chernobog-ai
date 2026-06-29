import type { CreateBlockStateProperties, CreateNodeKind } from "./types";

export const CREATE_NAMESPACE = "create";

export const CREATE_BLOCK_IDS = {
  shaft: "create:shaft",
  cogwheel: "create:cogwheel",
  largeCogwheel: "create:large_cogwheel",
  gearbox: "create:gearbox",
  belt: "create:belt",
  depot: "create:depot",
  chute: "create:chute",
  andesiteFunnel: "create:andesite_funnel",
  brassFunnel: "create:brass_funnel",
  mechanicalPress: "create:mechanical_press",
  mechanicalMixer: "create:mechanical_mixer",
  basin: "create:basin",
  waterWheel: "create:water_wheel",
  largeWaterWheel: "create:large_water_wheel",
  andesiteCasing: "create:andesite_casing",
  brassCasing: "create:brass_casing",
  fluidPipe: "create:fluid_pipe",
  railwayCasing: "create:railway_casing",
  metalGirder: "create:metal_girder",
  track: "create:track",
} as const;

export type CreateKnownBlockId = (typeof CREATE_BLOCK_IDS)[keyof typeof CREATE_BLOCK_IDS];

export const CREATE_REQUIRED_BLOCK_IDS: CreateKnownBlockId[] = [
  CREATE_BLOCK_IDS.shaft,
  CREATE_BLOCK_IDS.cogwheel,
  CREATE_BLOCK_IDS.largeCogwheel,
  CREATE_BLOCK_IDS.gearbox,
  CREATE_BLOCK_IDS.belt,
  CREATE_BLOCK_IDS.depot,
  CREATE_BLOCK_IDS.chute,
  CREATE_BLOCK_IDS.andesiteFunnel,
  CREATE_BLOCK_IDS.brassFunnel,
  CREATE_BLOCK_IDS.mechanicalPress,
  CREATE_BLOCK_IDS.mechanicalMixer,
  CREATE_BLOCK_IDS.basin,
  CREATE_BLOCK_IDS.waterWheel,
  CREATE_BLOCK_IDS.largeWaterWheel,
  CREATE_BLOCK_IDS.andesiteCasing,
  CREATE_BLOCK_IDS.brassCasing,
  CREATE_BLOCK_IDS.fluidPipe,
  CREATE_BLOCK_IDS.railwayCasing,
  CREATE_BLOCK_IDS.metalGirder,
  CREATE_BLOCK_IDS.track,
];

export function getCreateBlockIdForNodeKind(kind: CreateNodeKind): CreateKnownBlockId | undefined {
  switch (kind) {
    case "power_source":
    case "water_wheel":
      return CREATE_BLOCK_IDS.waterWheel;
    case "shaft":
      return CREATE_BLOCK_IDS.shaft;
    case "cogwheel":
      return CREATE_BLOCK_IDS.cogwheel;
    case "large_cogwheel":
      return CREATE_BLOCK_IDS.largeCogwheel;
    case "gearbox":
      return CREATE_BLOCK_IDS.gearbox;
    case "belt":
      return CREATE_BLOCK_IDS.belt;
    case "depot":
      return CREATE_BLOCK_IDS.depot;
    case "chute":
      return CREATE_BLOCK_IDS.chute;
    case "funnel":
      return CREATE_BLOCK_IDS.andesiteFunnel;
    case "mechanical_press":
      return CREATE_BLOCK_IDS.mechanicalPress;
    case "mechanical_mixer":
      return CREATE_BLOCK_IDS.mechanicalMixer;
    case "basin":
      return CREATE_BLOCK_IDS.basin;
    case "trackside_foundation":
      return CREATE_BLOCK_IDS.railwayCasing;
    case "decorative":
      return CREATE_BLOCK_IDS.andesiteCasing;
    default:
      return undefined;
  }
}

export function createAxisProperties(axis: "x" | "y" | "z"): CreateBlockStateProperties {
  return { axis };
}

export function createFacingProperties(facing: string): CreateBlockStateProperties {
  return { facing };
}

export function isCreateBlockId(blockId: string): boolean {
  return blockId.startsWith(`${CREATE_NAMESPACE}:`);
}
