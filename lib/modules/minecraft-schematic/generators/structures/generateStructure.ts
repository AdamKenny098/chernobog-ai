import { getSirioCraftPreset } from "../../presets/siriocraft";
import type { GeneratedSchematicBuild, SchematicGeneratorName, SchematicVariant, TowerVariant } from "../../types";
import { generateTower } from "../tower/generateTower";
import { generateBridge } from "./generateBridge";
import { generateFactory } from "./generateFactory";
import { generateGatehouse } from "./generateGatehouse";
import { generateHouse } from "./generateHouse";
import { generateRuinedOutpost } from "./generateRuinedOutpost";
import { generateTrainStation } from "./generateTrainStation";

type GenerateStructureOptions = {
  generator: SchematicGeneratorName;
  variant: SchematicVariant;
  presetId?: string;
  prompt: string;
  command: string;
  minecraftVersion?: string;
};

function withPresetMetadata(build: GeneratedSchematicBuild, options: GenerateStructureOptions): GeneratedSchematicBuild {
  const preset = options.presetId ? getSirioCraftPreset(options.presetId) : undefined;

  if (!preset) {
    return build;
  }

  return {
    ...build,
    displayName: preset.displayName,
    presetId: preset.id,
    profile: preset.profile,
    allowModdedBlocks: preset.allowModdedBlocks,
    fallbackToVanilla: preset.fallbackToVanilla,
  };
}

export function generateStructure(options: GenerateStructureOptions): GeneratedSchematicBuild {
  const sharedOptions = {
    prompt: options.prompt,
    command: options.command,
    presetId: options.presetId,
    minecraftVersion: options.minecraftVersion,
  };

  if (options.generator === "tower") {
    const build = generateTower({
      variant: options.variant as TowerVariant,
      prompt: options.prompt,
      command: options.command,
      minecraftVersion: options.minecraftVersion,
    });

    return withPresetMetadata(
      {
        ...build,
        features: [
          ...(build.features ?? []),
          "tower_shell",
          "vertical_silhouette",
          "battlements",
          "windows",
          "theme_variation",
        ],
      },
      options,
    );
  }

  if (options.generator === "house") {
    return withPresetMetadata(generateHouse({ ...sharedOptions, variant: options.variant }), options);
  }

  if (options.generator === "bridge") {
    return withPresetMetadata(generateBridge({ ...sharedOptions, ruined: options.variant === "ruined_bridge" }), options);
  }

  if (options.generator === "gatehouse") {
    return withPresetMetadata(generateGatehouse(sharedOptions), options);
  }

  if (options.generator === "factory") {
    return withPresetMetadata(generateFactory({ ...sharedOptions, variant: options.variant }), options);
  }

  if (options.generator === "train_station") {
    return withPresetMetadata(generateTrainStation(sharedOptions), options);
  }

  if (options.generator === "outpost") {
    return withPresetMetadata(generateRuinedOutpost(sharedOptions), options);
  }

  return withPresetMetadata(generateHouse(sharedOptions), options);
}
