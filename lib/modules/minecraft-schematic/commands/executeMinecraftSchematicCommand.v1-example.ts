import { createBuildBrief } from "../ai/createBuildBrief";
import { createBlueprint } from "../ai/createBlueprint";
import { repairBlueprint } from "../ai/repairBlueprint";
import { blueprintToTowerOptions } from "../ai/blueprintToTowerOptions";
import type { BlueprintTraceMetadata } from "../types/blueprint";
import type { MinecraftSchematicParsedCommand } from "./parseMinecraftSchematicCommand.v1-example";

// Adjust these imports to match your existing Milestone 3 filenames/signatures.
// import { generateTower } from "../builders/generateTower";
// import { exportSchem } from "../export/exportSchem";
// import { writeSchematicMetadata } from "../metadata/writeSchematicMetadata";
// import { writeVaultNote } from "../metadata/writeVaultNote";
// import { validateLatestSchematic } from "./executeValidateLatestSchematicCommand";

export async function executeMinecraftSchematicCommand(command: MinecraftSchematicParsedCommand) {
  switch (command.kind) {
    case "schematic_status":
      return {
        ok: true,
        message: "Minecraft schematic generator online. V1.0 blueprint layer available.",
      };

    case "schematic_help":
      return {
        ok: true,
        message: [
          "Commands:",
          "- generate minecraft schematic: ruined snowy watchtower",
          "- generate minecraft schematic: dark wizard tower",
          "- generate minecraft schematic: small medieval tower with lanterns",
          "- schematic show latest",
          "- schematic validate latest",
        ].join("\n"),
      };

    case "schematic_show_latest":
      return {
        ok: true,
        message: "Show latest should read exports/schematics/latest.json and display schematic + metadata paths.",
      };

    case "schematic_validate_latest":
      return {
        ok: true,
        message: "Validate latest should call your existing latest schematic validation command.",
      };

    case "schematic_generate": {
      const buildBrief = createBuildBrief(command.prompt);
      const candidateBlueprint = createBlueprint(buildBrief);
      const repaired = repairBlueprint(candidateBlueprint);
      const towerOptions = blueprintToTowerOptions(repaired.blueprint);

      /**
       * Integration point:
       *
       * const grid = generateTower(towerOptions);
       * const validation = validateShapeAwareGrid(grid);
       * const outputPaths = await exportSchem(grid, repaired.blueprint);
       * await writeSchematicMetadata({ ...trace, outputPaths });
       * await writeVaultNote(trace);
       */

      const trace: BlueprintTraceMetadata = {
        originalPrompt: command.prompt,
        buildBrief,
        candidateBlueprint,
        finalBlueprint: repaired.blueprint,
        repairedFields: repaired.validation.repairedFields,
        validationWarnings: repaired.validation.warnings,
        rejectedFields: repaired.validation.rejectedFields,
        outputPaths: {},
      };

      return {
        ok: true,
        message: [
          "AI-controlled schematic blueprint created.",
          "",
          `Prompt: ${command.prompt}`,
          `Generator: ${repaired.blueprint.generator}`,
          `Theme: ${repaired.blueprint.theme}`,
          `Roof: ${repaired.blueprint.roofType}`,
          `Features: ${repaired.blueprint.features.join(", ")}`,
          `Size: r${repaired.blueprint.dimensions.radius} h${repaired.blueprint.dimensions.height} floors${repaired.blueprint.dimensions.floors}`,
          `Repair strategy: ${repaired.repairStrategy}`,
          "",
          "Tower options ready for deterministic generator:",
          JSON.stringify(towerOptions, null, 2),
          "",
          "Trace metadata:",
          JSON.stringify(trace, null, 2),
        ].join("\n"),
        data: {
          trace,
          towerOptions,
        },
      };
    }

    default:
      return {
        ok: false,
        message: "Unknown minecraft schematic command.",
      };
  }
}
