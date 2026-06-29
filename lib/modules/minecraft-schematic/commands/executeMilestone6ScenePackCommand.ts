import { executeScenePlannerPreview } from "../scenes";
import {
  exportCompiledScenePlanPack,
  getLatestScenePack,
  renderCompiledScenePackSummary,
} from "../packs";
import type { Milestone6ScenePackParsedCommand } from "./parseMilestone6ScenePackCommand";

export type Milestone6ScenePackExecutionResult = {
  ok: boolean;
  kind: "milestone6_scene_pack_result";
  summary: string;
  data?: unknown;
};

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
