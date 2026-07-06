// lib/modules/minecraft-schematic/block-registry/blockRegistry.selftest.ts

import {
  createBlockVersionLimitReport,
  isBlockAllowedInVersion,
  resolveBlockForVersion,
} from "./index";

export function runMinecraftBlockRegistrySelfTest(
  targetMinecraftVersion = "1.8.8",
): string {
  const lines: string[] = [];

  const testBlocks = [
    "minecraft:stone_bricks",
    "minecraft:lantern",
    "minecraft:deepslate_bricks",
    "minecraft:copper_block",
    "minecraft:chain",
    "minecraft:campfire",
    "minecraft:cherry_planks",
  ];

  const report = createBlockVersionLimitReport({
    blockIds: testBlocks,
    targetMinecraftVersion,
  });

  lines.push("Minecraft block registry self-test");
  lines.push("==================================");
  lines.push(`Target version: ${report.targetMinecraftVersion}`);
  lines.push(`Checked blocks: ${report.checkedBlockCount}`);
  lines.push("");

  lines.push("Direct checks:");
  lines.push(
    `- stone_bricks allowed in ${targetMinecraftVersion}: ${isBlockAllowedInVersion(
      "minecraft:stone_bricks",
      targetMinecraftVersion,
    )}`,
  );
  lines.push(
    `- lantern allowed in ${targetMinecraftVersion}: ${isBlockAllowedInVersion(
      "minecraft:lantern",
      targetMinecraftVersion,
    )}`,
  );
  lines.push("");

  lines.push("Resolution examples:");
  for (const blockId of testBlocks) {
    const resolution = resolveBlockForVersion(blockId, targetMinecraftVersion);
    lines.push(
      `- ${blockId} -> ${resolution.resolvedBlockId} | allowed=${resolution.allowed} | substituted=${resolution.substituted} | omitted=${resolution.omitted}`,
    );
  }

  lines.push("");
  lines.push("Report:");
  lines.push(`- Allowed: ${report.allowedBlocks.join(", ") || "none"}`);
  lines.push(
    `- Substituted: ${
      report.substitutedBlocks
        .map((item) => `${item.from} -> ${item.to}`)
        .join(", ") || "none"
    }`,
  );
  lines.push(`- Omitted: ${report.omittedBlocks.join(", ") || "none"}`);
  lines.push(
    `- Incompatible: ${
      report.incompatibleBlocks
        .map((item) => `${item.blockId}: ${item.reason}`)
        .join(", ") || "none"
    }`,
  );

  return lines.join("\n");
}
