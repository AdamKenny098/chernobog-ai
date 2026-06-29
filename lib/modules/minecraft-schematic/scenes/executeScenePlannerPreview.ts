import { planSceneLayout } from "./planSceneLayout";
import { writeScenePlacementGuide } from "./writeScenePlacementGuide";
import type { SceneBiomeHint, SceneScale, SceneType, SchematicScenePlan } from "./types";

export type ScenePlannerPreviewResult = {
  ok: true;
  kind: "scene_planner_preview";
  plan: SchematicScenePlan;
  placementGuideMarkdown: string;
  summary: string;
};

export type ScenePlannerPreviewOptions = {
  prompt: string;
  sceneType?: SceneType;
  biomeHint?: SceneBiomeHint;
  scale?: SceneScale;
};

export function executeScenePlannerPreview(options: ScenePlannerPreviewOptions): ScenePlannerPreviewResult {
  const plan = planSceneLayout(options);
  const placementGuideMarkdown = writeScenePlacementGuide(plan);
  return {
    ok: true,
    kind: "scene_planner_preview",
    plan,
    placementGuideMarkdown,
    summary: [
      `Scene plan generated: ${plan.id}`,
      `Type: ${plan.sceneType}`,
      `Biome: ${plan.biomeHint}`,
      `Scale: ${plan.scale}`,
      `Structures: ${plan.structures.length}`,
      `Roads: ${plan.roads.length}`,
      `Zones: ${plan.zones.length}`,
      `Planned output root: ${plan.exports.outputRoot}`,
    ].join("\n"),
  };
}
