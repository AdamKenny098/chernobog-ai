import type { GeneratedSchematicBuild } from "../types";
import {
  applyVersionSafePaletteIntentToBuild,
  createVersionSafePaletteIntentReport,
} from "./applyVersionSafePaletteIntentToBuild";

function makeFixture(): GeneratedSchematicBuild {
  return {
    buildId: "schematic-9c-selftest",
    displayName: "Schematic 9C Self Test",
    generatorName: "house",
    variant: "default",
    prompt: "selftest",
    command: "selftest",
    minecraftVersion: "1.20.1",
    targetMinecraftVersion: "1.8.8",
    generatedAt: new Date(0).toISOString(),
    size: { x: 3, y: 3, z: 3 },
    palette: ["minecraft:deepslate_bricks", "minecraft:lantern", "minecraft:stone"],
    blocks: [
      { x: 0, y: 0, z: 0, block: "minecraft:deepslate_bricks" },
      { x: 1, y: 0, z: 0, block: "minecraft:lantern" },
      { x: 2, y: 0, z: 0, block: "minecraft:stone" },
    ],
    blockCount: 3,
  };
}

export function runVersionSafePaletteIntentSelfTest(): string[] {
  const fixture = makeFixture();
  const report = createVersionSafePaletteIntentReport(fixture);
  const patched = applyVersionSafePaletteIntentToBuild(fixture);

  const lines = [
    "Schematic 9C version-safe palette intent self-test",
    "=================================================",
    `Target version: ${fixture.targetMinecraftVersion}`,
    `Report produced: ${report ? "yes" : "no"}`,
    `Original palette entries: ${fixture.palette.length}`,
    `Patched palette entries: ${patched.palette.length}`,
    `Original block count: ${fixture.blockCount}`,
    `Patched block count: ${patched.blockCount}`,
    `Feature marker present: ${patched.features?.includes("version_safe_palette_9c") ? "yes" : "no"}`,
    `Warnings added: ${patched.placementWarnings?.length ?? 0}`,
    `Unresolved warnings: ${patched.unsupportedBlockWarnings?.length ?? 0}`,
  ];

  if (!report) {
    lines.push("FAIL: expected a report for a build with targetMinecraftVersion.");
  } else {
    lines.push(`Replacements: ${report.replacements.length}`);
    lines.push(`Omissions: ${report.omissions.length}`);
    lines.push(`Unresolved: ${report.unresolvedBlocks.length}`);
  }

  if (!patched.features?.includes("version_safe_palette_9c")) {
    lines.push("FAIL: missing version_safe_palette_9c feature marker.");
  } else {
    lines.push("PASS: 9C pass runs and annotates the build.");
  }

  return lines;
}
