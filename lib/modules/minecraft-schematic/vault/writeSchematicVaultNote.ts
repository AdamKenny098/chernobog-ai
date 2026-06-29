import { promises as fs } from "fs";
import path from "path";

import type { SchematicBuildReport, SchematicMetadata } from "../types";

function yamlEscape(value: string | undefined | null): string {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

function frontMatter(metadata: SchematicMetadata, report: SchematicBuildReport): string {
  const tags = ["chernobog", "minecraft-schematic", "siriocraft", ...report.tags]
    .map((tag) => tag.toLowerCase().replace(/[^a-z0-9_-]+/g, "-"))
    .filter(Boolean);

  return [
    "---",
    `title: "${yamlEscape(report.title)}"`,
    `build_id: "${yamlEscape(metadata.buildId)}"`,
    `generated_at: "${yamlEscape(metadata.generatedAt)}"`,
    `generator: "${yamlEscape(String(metadata.generatorName))}"`,
    `variant: "${yamlEscape(String(metadata.variant))}"`,
    metadata.presetId ? `preset: "${yamlEscape(metadata.presetId)}"` : "preset: null",
    metadata.profile ? `profile: "${yamlEscape(metadata.profile)}"` : "profile: null",
    `validation: "${metadata.validation.ok ? "passed" : "failed"}"`,
    `report_status: "${report.status}"`,
    `block_count: ${metadata.blockCount}`,
    `size: "${metadata.size.x}x${metadata.size.y}x${metadata.size.z}"`,
    "tags:",
    ...Array.from(new Set(tags)).map((tag) => `  - ${tag}`),
    "---",
  ].join("\n");
}

function bulletList(values: string[], emptyText: string): string {
  if (!values.length) {
    return `- ${emptyText}`;
  }

  return values.map((value) => `- ${value}`).join("\n");
}

function codeList(values: string[], emptyText: string): string {
  if (!values.length) {
    return `- ${emptyText}`;
  }

  return values.map((value) => `- \`${value}\``).join("\n");
}

function table(headers: string[], rows: string[][]): string {
  if (!rows.length) {
    return "No rows recorded.";
  }

  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, "\\|")).join(" | ")} |`),
  ].join("\n");
}

function warningSection(metadata: SchematicMetadata, report: SchematicBuildReport): string {
  const errors = [
    ...metadata.validation.errors,
    ...(metadata.shapeValidation?.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => `${issue.category}: ${issue.message}`) ?? []),
  ];

  return [
    "## Validation",
    "",
    `- Schematic validation: **${metadata.validation.ok ? "passed" : "failed"}**`,
    `- Shape validation: **${metadata.shapeValidation ? (metadata.shapeValidation.valid ? "passed" : "failed") : "not recorded"}**`,
    `- Report status: **${report.status}**`,
    "",
    "### Errors",
    "",
    bulletList(errors, "No errors recorded."),
    "",
    "### Warnings",
    "",
    bulletList(report.warningSummary, "No warnings recorded."),
  ].join("\n");
}

function blockEntitySection(metadata: SchematicMetadata, report: SchematicBuildReport): string {
  const entities = metadata.blockEntities ?? [];

  return [
    "## Block Entities",
    "",
    `- Total: **${report.blockEntitySummary.total}**`,
    `- NBT written: **${report.blockEntitySummary.nbtWritten}**`,
    `- Metadata-only: **${report.blockEntitySummary.metadataOnly}**`,
    "",
    "### Labels / Text",
    "",
    bulletList(report.blockEntitySummary.labels, "No labelled block entities recorded."),
    "",
    "### Entity Records",
    "",
    entities.length
      ? table(
          ["Kind", "Block", "Position", "Status", "Label/Text"],
          entities.map((entity) => [
            entity.kind,
            `\`${entity.id}\``,
            `${entity.x}, ${entity.y}, ${entity.z}`,
            entity.nbtStatus ?? "unrecorded",
            entity.label ?? entity.text?.join(" / ") ?? "",
          ]),
        )
      : "No block entities recorded.",
  ].join("\n");
}

function outputSection(metadata: SchematicMetadata, report: SchematicBuildReport): string {
  return [
    "## Output Files",
    "",
    table(
      ["Kind", "Path"],
      report.outputSummary.map((file) => [file.label, `\`${file.path}\``]),
    ),
    "",
    `- Review route: \`${report.reviewRoute}\``,
    `- Command: \`${metadata.command}\``,
  ].join("\n");
}

function paletteSection(metadata: SchematicMetadata, report: SchematicBuildReport): string {
  return [
    "## Palette",
    "",
    `- Total palette entries: **${metadata.palette.length}**`,
    "",
    table(
      ["Block", "Role"],
      report.paletteSummary.map((entry) => [`\`${entry.block}\``, entry.role]),
    ),
  ].join("\n");
}

function blockRegistrySection(metadata: SchematicMetadata, report: SchematicBuildReport): string {
  const registry = metadata.blockRegistryReport;
  const summary = report.blockRegistrySummary;

  if (!registry || !summary) {
    return [
      "## Block Registry",
      "",
      "- No block registry report recorded.",
    ].join("\n");
  }

  return [
    "## Block Registry",
    "",
    `- Profile: \`${registry.profileId}\``,
    `- Allow modded blocks: **${registry.allowModdedBlocks ? "true" : "false"}**`,
    `- Fallback to vanilla: **${registry.fallbackToVanilla ? "true" : "false"}**`,
    `- Allowed namespaces: ${registry.allowedNamespaces.map((namespace) => `\`${namespace}\``).join(", ")}`,
    `- Blocks checked: **${registry.totalBlocksChecked}**`,
    `- Palette entries checked: **${registry.totalPaletteEntriesChecked}**`,
    `- Replaced blocks: **${summary.changedBlocks}**`,
    `- Fallback replacements: **${summary.fallbackBlocks}**`,
    `- Unsupported blocks: **${summary.unsupportedBlocks}**`,
    "",
    "### Supported Modded Blocks",
    "",
    codeList(registry.supportedModdedBlocks, "No modded blocks supported by this profile."),
    "",
    "### Replacements",
    "",
    registry.replacements.length
      ? table(
          ["Original", "Replacement", "Context", "Reason"],
          registry.replacements.slice(0, 40).map((replacement) => [
            `\`${replacement.original}\``,
            `\`${replacement.replacement}\``,
            replacement.context,
            replacement.reason,
          ]),
        )
      : "No fallback replacements recorded.",
    "",
    "### Unsupported Blocks",
    "",
    registry.unsupportedBlocks.length
      ? table(
          ["Block", "Reason"],
          registry.unsupportedBlocks.map((entry) => [`\`${entry.block}\``, entry.reason]),
        )
      : "No unsupported blocks recorded.",
  ].join("\n");
}

export function renderSchematicVaultNote(metadata: SchematicMetadata): string {
  const report: SchematicBuildReport = metadata.buildReport ?? {
    title: metadata.displayName ?? metadata.buildId,
    status: metadata.validation.ok ? "passed" : "failed",
    sirioCraftUseCase: "General SirioCraft build asset.",
    suggestedPlacement: "Place on prepared terrain and inspect before live use.",
    recommendedNextAction: "Review in Chernobog, then paste into a test world.",
    qualityNotes: [],
    knownLimitations: [],
    warningSummary: metadata.validation.warnings,
    paletteSummary: metadata.palette.slice(0, 16).map((block) => ({ block, role: "palette" })),
    blockEntitySummary: {
      total: metadata.blockEntities?.length ?? 0,
      nbtWritten: metadata.blockEntityExport?.nbtWritten ?? 0,
      metadataOnly: metadata.blockEntityExport?.metadataOnly ?? 0,
      labels: [],
    },
    blockRegistrySummary: metadata.blockRegistryReport
      ? {
          profileId: metadata.blockRegistryReport.profileId,
          allowModdedBlocks: metadata.blockRegistryReport.allowModdedBlocks,
          fallbackToVanilla: metadata.blockRegistryReport.fallbackToVanilla,
          changedBlocks: metadata.blockRegistryReport.changedBlocks,
          fallbackBlocks: metadata.blockRegistryReport.fallbackBlocks,
          unsupportedBlocks: metadata.blockRegistryReport.unsupportedBlocks.length,
        }
      : undefined,
    outputSummary: [
      { kind: "schem", label: "Schematic", path: metadata.outputPaths.schemPath },
      { kind: "metadata", label: "Metadata JSON", path: metadata.outputPaths.metadataJsonPath },
      { kind: "debug", label: "Debug JSON", path: metadata.outputPaths.debugJsonPath },
      { kind: "vault-note", label: "Vault Note", path: metadata.outputPaths.vaultNotePath },
    ],
    reviewRoute: `/review/schematic/${metadata.buildId}`,
    tags: [String(metadata.generatorName), String(metadata.variant)],
  };

  return [
    frontMatter(metadata, report),
    "",
    `# ${report.title}`,
    "",
    `Generated by Chernobog for the SirioCraft schematic library.` ,
    "",
    "## Summary",
    "",
    `- Build ID: \`${metadata.buildId}\``,
    `- Generated: ${metadata.generatedAt}`,
    `- Generator: \`${metadata.generatorName}\``,
    `- Variant: \`${metadata.variant}\``,
    metadata.presetId ? `- Preset: \`${metadata.presetId}\`` : "- Preset: not recorded",
    metadata.profile ? `- Profile: \`${metadata.profile}\`` : "- Profile: not recorded",
    `- Size: **${metadata.size.x} x ${metadata.size.y} x ${metadata.size.z}**`,
    `- Block count: **${metadata.blockCount}**`,
    `- Minecraft version: \`${metadata.minecraftVersion}\``,
    "",
    "## SirioCraft Use Case",
    "",
    report.sirioCraftUseCase,
    "",
    "## Suggested Placement",
    "",
    report.suggestedPlacement,
    "",
    "## Recommended Next Action",
    "",
    report.recommendedNextAction,
    "",
    "## Features",
    "",
    codeList(metadata.features ?? [], "No feature metadata recorded."),
    "",
    "## Quality Notes",
    "",
    bulletList(report.qualityNotes, "No quality notes recorded."),
    "",
    "## Known Limitations",
    "",
    bulletList(report.knownLimitations, "No known limitations recorded."),
    "",
    warningSection(metadata, report),
    "",
    blockEntitySection(metadata, report),
    "",
    paletteSection(metadata, report),
    "",
    blockRegistrySection(metadata, report),
    "",
    outputSection(metadata, report),
    "",
    "## Manual Follow-Up Notes",
    "",
    "- Paste into a test world before live use.",
    "- Blend terrain around the footprint.",
    "- Add player-facing details after placement if this becomes a permanent SirioCraft asset.",
    "",
  ].join("\n");
}

export async function writeSchematicVaultNote(
  metadata: SchematicMetadata,
  absoluteVaultNotePath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(absoluteVaultNotePath), { recursive: true });
  await fs.writeFile(absoluteVaultNotePath, renderSchematicVaultNote(metadata), "utf8");
}
