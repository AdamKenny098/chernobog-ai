import { runBuildDepartmentAction } from "../build-department";
import { renderMilestone6FinalStatus, writeMilestone6Docs } from "../finalization";
import {
  exportCompiledScenePlanPack,
  exportLatestVanillaPreviewPack,
  getLatestScenePack,
  renderCompiledScenePackSummary,
  renderPackRepairSummary,
  renderPackReviewSummary,
  repairLatestScenePack,
  writeLatestScenePackReview,
} from "../packs";
import { executeScenePlannerPreview } from "../scenes";

import type {
  Milestone6BuildDepartmentParsedCommand,
  Milestone6FinalizationParsedCommand,
  Milestone6PackReviewParsedCommand,
  Milestone6PreviewParsedCommand,
  Milestone6ScenePackParsedCommand,
} from "./parseMilestone6CompatibilityCommands";

type Milestone6CompatibilityResult<K extends string> = {
  ok: boolean;
  kind: K;
  summary: string;
  data?: unknown;
};

export type Milestone6BuildDepartmentExecutionResult =
  Milestone6CompatibilityResult<"milestone6_build_department_result">;

export type Milestone6FinalizationExecutionResult =
  Milestone6CompatibilityResult<"milestone6_finalization_result">;

export type Milestone6PackReviewExecutionResult =
  Milestone6CompatibilityResult<"milestone6_pack_review_result">;

export type Milestone6PreviewExecutionResult =
  Milestone6CompatibilityResult<"milestone6_preview_pack_result">;

export type Milestone6ScenePackExecutionResult =
  Milestone6CompatibilityResult<"milestone6_scene_pack_result">;

export async function executeMilestone6BuildDepartmentCommand(
  command: Milestone6BuildDepartmentParsedCommand,
): Promise<Milestone6BuildDepartmentExecutionResult> {
  const result = await runBuildDepartmentAction(command.action, command.prompt);

  return {
    ok: result.ok,
    kind: "milestone6_build_department_result",
    summary: result.summary,
    data: result,
  };
}

export async function executeMilestone6FinalizationCommand(
  command: Milestone6FinalizationParsedCommand,
): Promise<Milestone6FinalizationExecutionResult> {
  if (command.action === "write_docs") {
    const docs = await writeMilestone6Docs();

    return {
      ok: docs.ok,
      kind: "milestone6_finalization_result",
      summary: docs.summary,
      data: docs,
    };
  }

  return {
    ok: true,
    kind: "milestone6_finalization_result",
    summary: renderMilestone6FinalStatus(),
  };
}

export async function executeMilestone6PackReviewCommand(
  command: Milestone6PackReviewParsedCommand,
): Promise<Milestone6PackReviewExecutionResult> {
  if (command.action === "repair") {
    const repair = await repairLatestScenePack();

    return {
      ok: repair.ok,
      kind: "milestone6_pack_review_result",
      summary: renderPackRepairSummary(repair),
      data: repair.data,
    };
  }

  const review = await writeLatestScenePackReview();

  return {
    ok: review.ok,
    kind: "milestone6_pack_review_result",
    summary: renderPackReviewSummary(review),
    data: review,
  };
}

export async function executeMilestone6PreviewCommand(
  _command: Milestone6PreviewParsedCommand,
): Promise<Milestone6PreviewExecutionResult> {
  const result = await exportLatestVanillaPreviewPack();

  return {
    ok: result.ok,
    kind: "milestone6_preview_pack_result",
    summary: result.summary,
    data: result.data,
  };
}

export async function executeMilestone6ScenePackCommand(
  command: Milestone6ScenePackParsedCommand,
): Promise<Milestone6ScenePackExecutionResult> {
  if (command.action === "latest") {
    const latest = await getLatestScenePack();

    if (!latest) {
      return {
        ok: false,
        kind: "milestone6_scene_pack_result",
        summary: "No latest schematic pack found.",
      };
    }

    return {
      ok: true,
      kind: "milestone6_scene_pack_result",
      summary: [
        "Latest schematic pack",
        "",
        `Pack ID: ${latest.packId}`,
        `Status: ${latest.status}`,
        `Output root: ${latest.outputRoot}`,
        `Scene type: ${latest.sceneType}`,
        `Biome: ${latest.biomeHint}`,
        `Scale: ${latest.scale}`,
        `Structures: ${latest.structureCount}`,
        `Generated schematics: ${latest.generatedSchematicCount}`,
        `Pack JSON: ${latest.packJson}`,
      ].join("\n"),
      data: latest,
    };
  }

  const preview = executeScenePlannerPreview({
    prompt: command.prompt,
  });

  const exported = await exportCompiledScenePlanPack(preview.plan, {
    writeLatest: true,
  });

  return {
    ok: exported.ok,
    kind: "milestone6_scene_pack_result",
    summary: renderCompiledScenePackSummary(exported),
    data: exported,
  };
}