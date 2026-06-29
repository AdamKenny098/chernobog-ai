import { getLatestScenePack } from "../packs";
import type { BuildDepartmentRoleStatus, BuildDepartmentStatus } from "./types";

export function getBuildDepartmentRoles(): BuildDepartmentRoleStatus[] {
  return [
    {
      role: "planner",
      label: "Build Planner",
      status: "online",
      responsibility: "Interprets build prompts into deterministic scene intent, biome hints, and scale.",
      backedBy: ["planSceneLayout", "executeScenePlannerPreview"],
    },
    {
      role: "architect",
      label: "Build Architect",
      status: "online",
      responsibility: "Creates structure layout, roads, zones, paste order, and terrain placement notes.",
      backedBy: ["SchematicScenePlan", "writeScenePlacementGuide"],
    },
    {
      role: "compiler",
      label: "Build Compiler",
      status: "online",
      responsibility: "Compiles scene structures into real .schem files using the best available generator path.",
      backedBy: ["exportCompiledScenePlanPack", "compileScenePlanStructures", "M6-F.1 quality routing"],
    },
    {
      role: "inspector",
      label: "Build Inspector",
      status: "online",
      responsibility: "Reviews latest scene packs for missing schematics, fallback geometry, metadata drift, and Create preview limitations.",
      backedBy: ["reviewLatestScenePack", "writeLatestScenePackReview"],
    },
    {
      role: "repairer",
      label: "Build Repairer",
      status: "limited",
      responsibility: "Performs safe metadata/latest-pointer repair. It does not yet regenerate individual bad structures.",
      backedBy: ["repairLatestScenePack"],
    },
    {
      role: "exporter",
      label: "Build Exporter",
      status: "online",
      responsibility: "Exports pack folders, metadata, placement guides, vault notes, and vanilla preview sidecars.",
      backedBy: ["exportScenePlanPack", "exportLatestVanillaPreviewPack"],
    },
  ];
}

export async function getBuildDepartmentStatus(): Promise<BuildDepartmentStatus> {
  const latestPack = await getLatestScenePack();

  return {
    ok: true,
    milestone: "M6-I",
    estimatedMilestoneCompletionPercent: 92,
    roles: getBuildDepartmentRoles(),
    latestPack,
    warnings: [
      "Build Department is deterministic orchestration, not autonomous agents yet.",
      "Repairer is metadata-safe only until structure-level regeneration lands.",
      "Vanilla previews are for browser viewers only; original schematics remain the real Create/server files.",
    ],
    nextRecommendedAction: latestPack
      ? "Run build department review latest, then build department preview latest if browser preview files are needed."
      : "Run build department generate create factory yard with train platform.",
  };
}
