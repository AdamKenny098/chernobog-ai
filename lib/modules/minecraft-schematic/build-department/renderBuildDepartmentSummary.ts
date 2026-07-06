import type {
  BuildDepartmentCommandResult,
  BuildDepartmentGenerateResult,
  BuildDepartmentPlanResult,
  BuildDepartmentPreviewResult,
  BuildDepartmentRepairResult,
  BuildDepartmentReviewResult,
  BuildDepartmentStatus,
} from "./types";

export function renderBuildDepartmentStatus(status: BuildDepartmentStatus): string {
  return [
    "Build Department status",
    "",
    `Milestone: ${status.milestone}`,
    `Estimated Milestone 6 completion: ${status.estimatedMilestoneCompletionPercent}%`,
    "",
    "Roles:",
    ...status.roles.map((role) => `- ${role.label}: ${role.status} — ${role.responsibility}`),
    "",
    "Latest pack:",
    status.latestPack
      ? `- ${status.latestPack.packId} (${status.latestPack.status}) — ${status.latestPack.generatedSchematicCount}/${status.latestPack.structureCount} schematics generated`
      : "- none",
    "",
    "Warnings:",
    ...status.warnings.map((warning) => `- ${warning}`),
    "",
    `Next recommended action: ${status.nextRecommendedAction}`,
  ].join("\n");
}

export function renderBuildDepartmentPlan(result: BuildDepartmentPlanResult): string {
  return [
    "Build Department plan created",
    "",
    `Plan ID: ${result.plan.id}`,
    `Scene type: ${result.plan.sceneType}`,
    `Biome: ${result.plan.biomeHint}`,
    `Scale: ${result.plan.scale}`,
    `Structures planned: ${result.plan.structures.length}`,
    `Roads planned: ${result.plan.roads.length}`,
    `Zones planned: ${result.plan.zones.length}`,
    "",
    "Files:",
    `- Plan JSON: ${result.planPath}`,
    `- Placement Guide: ${result.placementGuidePath}`,
    "",
    "Planned structures:",
    ...[...result.plan.structures]
    .sort((left, right) => left.priority - right.priority)
    .map((structure) => `- ${structure.schematicName} — ${structure.displayName}`),
    "",
    "Next action:",
    `- build department generate ${result.plan.prompt}`,
  ].join("\n");
}

export function renderBuildDepartmentGenerate(result: BuildDepartmentGenerateResult): string {
  const lines = [
    result.action === "full_pipeline"
      ? "Build Department full pipeline complete"
      : "Build Department generation complete",
    "",
    `Pack ID: ${result.pack.packId}`,
    `Status: ${result.pack.status}`,
    `Scene type: ${result.pack.manifest.sceneType}`,
    `Biome: ${result.pack.manifest.biomeHint}`,
    `Scale: ${result.pack.manifest.scale}`,
    `Generated schematics: ${result.pack.manifest.generatedSchematicCount}/${result.pack.manifest.structureCount}`,
    "",
    "Files:",
    `- Pack JSON: ${result.pack.paths.packJson}`,
    `- Placement Guide: ${result.pack.paths.placementGuide}`,
    `- Schematics Folder: ${result.pack.paths.schematicsDirectory}`,
    `- Metadata Folder: ${result.pack.paths.metadataDirectory}`,
  ];

  if (result.review) {
    lines.push(
      "",
      "Inspection:",
      `- Score: ${result.review.score}/100`,
      `- Flags: ${result.review.qualityFlags.length ? result.review.qualityFlags.join(", ") : "none"}`,
    );
  }

  if (result.preview) {
    lines.push(
      "",
      "Vanilla preview:",
      `- Status: ${result.preview.status}`,
      `- Preview schematics: ${result.preview.generatedPreviewCount}/${result.preview.structureCount}`,
      `- Preview root: ${result.preview.previewRoot ?? "unknown"}`,
    );
  }

  lines.push(
    "",
    "Next recommended action:",
    result.review
      ? "- Address review flags or continue to final SirioCraft documentation."
      : "- build department review latest",
  );

  return lines.join("\n");
}

export function renderBuildDepartmentReview(result: BuildDepartmentReviewResult): string {
  return [
    "Build Department review complete",
    "",
    result.review.summary,
  ].join("\n");
}

export function renderBuildDepartmentRepair(result: BuildDepartmentRepairResult): string {
  return [
    "Build Department repair complete",
    "",
    result.repair.summary,
  ].join("\n");
}

export function renderBuildDepartmentPreview(result: BuildDepartmentPreviewResult): string {
  return [
    "Build Department preview export complete",
    "",
    result.preview.summary,
  ].join("\n");
}

export function renderBuildDepartmentCommandResult(result: BuildDepartmentCommandResult): string {
  switch (result.action) {
    case "status":
      return renderBuildDepartmentStatus(result.status);
    case "plan":
      return renderBuildDepartmentPlan(result);
    case "generate":
    case "full_pipeline":
      return renderBuildDepartmentGenerate(result);
    case "review":
      return renderBuildDepartmentReview(result);
    case "repair":
      return renderBuildDepartmentRepair(result);
    case "preview":
      return renderBuildDepartmentPreview(result);
    default:
      return "Unknown Build Department result.";
  }
}
