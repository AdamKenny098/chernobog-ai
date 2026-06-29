import type { MinecraftBlueprint } from "../types/blueprint";

export interface TowerGeneratorOptions {
  variant: string;
  theme: string;
  roofType: string;
  radius: number;
  height: number;
  floors: number;
  features: string[];
  seed: number;
}

/**
 * Adapter between the safe blueprint layer and your deterministic tower builder.
 *
 * If your existing generateTower function has a different option shape, keep this
 * file and adjust only this adapter. Do not let AI output leak into generateTower.
 */
export function blueprintToTowerOptions(blueprint: MinecraftBlueprint): TowerGeneratorOptions {
  return {
    variant: blueprint.theme,
    theme: blueprint.theme,
    roofType: blueprint.roofType,
    radius: blueprint.dimensions.radius,
    height: blueprint.dimensions.height,
    floors: blueprint.dimensions.floors,
    features: blueprint.features,
    seed: blueprint.seed,
  };
}
