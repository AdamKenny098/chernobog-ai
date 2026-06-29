import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  exportCompiledScenePlanPack,
  exportLatestVanillaPreviewPack,
  repairLatestScenePack,
  writeLatestScenePackReview,
} from "../packs";
import { executeScenePlannerPreview, writeScenePlacementGuide } from "../scenes";
import { getBuildDepartmentStatus } from "./buildDepartmentStatus";
import {
  renderBuildDepartmentCommandResult,
} from "./renderBuildDepartmentSummary";
import type {
  BuildDepartmentAction,
  BuildDepartmentCommandResult,
  BuildDepartmentGenerateResult,
  BuildDepartmentPlanResult,
} from "./types";

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "build-department-plan";
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function toRel(absolutePath: string): string {
  return path.relative(process.cwd(), absolutePath).replace(/\\/g, "/");
}

async function writePlanArtifacts(result: ReturnType<typeof executeScenePlannerPreview>): Promise<{
  planPath: string;
  placementGuidePath: string;
}> {
  const planRoot = path.join(process.cwd(), "exports", "build-department", "plans", result.plan.id);
  const planPath = path.join(planRoot, "plan.json");
  const placementGuidePath = path.join(planRoot, "placement-guide.md");

  await mkdir(planRoot, { recursive: true });
  await writeJson(planPath, result.plan);
  await writeFile(placementGuidePath, writeScenePlacementGuide(result.plan), "utf8");
  await writeJson(path.join(process.cwd(), "exports", "build-department", "latest-plan.json"), {
    planId: result.plan.id,
    prompt: result.plan.prompt,
    sceneType: result.plan.sceneType,
    biomeHint: result.plan.biomeHint,
    scale: result.plan.scale,
    structureCount: result.plan.structures.length,
    planPath: toRel(planPath),
    placementGuidePath: toRel(placementGuidePath),
  });

  return {
    planPath: toRel(planPath),
    placementGuidePath: toRel(placementGuidePath),
  };
}

export async function planBuildDepartmentProject(prompt: string): Promise<BuildDepartmentPlanResult> {
  const preview = executeScenePlannerPreview({
    prompt,
  });

  // Preserve a readable ID when the user uses the department command wrapper.
  preview.plan.id = `${slug(preview.plan.sceneType)}-${new Date().toISOString().replace(/[:.]/g, "-")}`;

  const paths = await writePlanArtifacts(preview);

  const partial: BuildDepartmentPlanResult = {
    ok: true,
    action: "plan",
    plan: preview.plan,
    planPath: paths.planPath,
    placementGuidePath: paths.placementGuidePath,
    summary: "",
  };

  return {
    ...partial,
    summary: renderBuildDepartmentCommandResult(partial),
  };
}

export async function generateBuildDepartmentProject(
  prompt: string,
  options: { includeReview?: boolean; includePreview?: boolean; fullPipeline?: boolean } = {},
): Promise<BuildDepartmentGenerateResult> {
  const preview = executeScenePlannerPreview({
    prompt,
  });

  const pack = await exportCompiledScenePlanPack(preview.plan, {
    writeLatest: true,
  });

  const review = options.includeReview || options.fullPipeline
    ? await writeLatestScenePackReview()
    : undefined;

  const vanillaPreview = options.includePreview || options.fullPipeline
    ? await exportLatestVanillaPreviewPack()
    : undefined;

  const partial: BuildDepartmentGenerateResult = {
    ok: pack.ok,
    action: options.fullPipeline ? "full_pipeline" : "generate",
    pack,
    review,
    preview: vanillaPreview,
    summary: "",
  };

  return {
    ...partial,
    summary: renderBuildDepartmentCommandResult(partial),
  };
}

export async function runBuildDepartmentAction(
  action: BuildDepartmentAction,
  prompt: string,
): Promise<BuildDepartmentCommandResult> {
  if (action === "status") {
    const status = await getBuildDepartmentStatus();
    const result: BuildDepartmentCommandResult = {
      ok: status.ok,
      action: "status",
      status,
      summary: "",
    };

    return {
      ...result,
      summary: renderBuildDepartmentCommandResult(result),
    };
  }

  if (action === "plan") {
    return planBuildDepartmentProject(prompt);
  }

  if (action === "generate") {
    return generateBuildDepartmentProject(prompt, {
      includeReview: true,
    });
  }

  if (action === "full_pipeline") {
    return generateBuildDepartmentProject(prompt, {
      fullPipeline: true,
    });
  }

  if (action === "review") {
    const review = await writeLatestScenePackReview();
    const result: BuildDepartmentCommandResult = {
      ok: review.ok,
      action: "review",
      review,
      summary: "",
    };

    return {
      ...result,
      summary: renderBuildDepartmentCommandResult(result),
    };
  }

  if (action === "repair") {
    const repair = await repairLatestScenePack();
    const result: BuildDepartmentCommandResult = {
      ok: repair.ok,
      action: "repair",
      repair,
      summary: "",
    };

    return {
      ...result,
      summary: renderBuildDepartmentCommandResult(result),
    };
  }

  if (action === "preview") {
    const preview = await exportLatestVanillaPreviewPack();
    const result: BuildDepartmentCommandResult = {
      ok: preview.ok,
      action: "preview",
      preview,
      summary: "",
    };

    return {
      ...result,
      summary: renderBuildDepartmentCommandResult(result),
    };
  }

  const status = await getBuildDepartmentStatus();

  return {
    ok: false,
    action: "status",
    status,
    summary: `Unknown Build Department action: ${action}`,
  };
}
