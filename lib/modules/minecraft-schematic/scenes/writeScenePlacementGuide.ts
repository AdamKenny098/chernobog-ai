import type { SchematicScenePlan, SceneStructurePlan } from "./types";

function formatStructureLine(structure: SceneStructurePlan): string {
  const dependencyText = structure.dependencies.length ? ` Dependencies: ${structure.dependencies.join(", ")}.` : "";
  return `- **${structure.displayName}** (${structure.schematicName}) — origin x:${structure.origin.x}, z:${structure.origin.z}, size ${structure.size.x}x${structure.size.z}, facing ${structure.orientation}.${dependencyText}`;
}

export function writeScenePlacementGuide(plan: SchematicScenePlan): string {
  const pasteOrder = [...plan.structures].sort((left, right) => left.priority - right.priority);
  return [
    `# ${plan.id} Placement Guide`,
    "",
    `Prompt: ${plan.prompt}`,
    "",
    "## Scene Summary",
    "",
    `- Scene type: ${plan.sceneType}`,
    `- Scale: ${plan.scale}`,
    `- Biome hint: ${plan.biomeHint}`,
    `- Style profile: ${plan.styleProfile}`,
    `- Purpose: ${plan.purpose}`,
    "",
    "## Paste Order",
    "",
    ...pasteOrder.map((structure, index) => `${index + 1}. ${structure.schematicName} — ${structure.displayName}`),
    "",
    "## Structure Layout",
    "",
    ...plan.structures.map(formatStructureLine),
    "",
    "## Roads",
    "",
    ...plan.roads.map((road) => `- ${road.id}: ${road.fromStructureId} → ${road.toStructureId}, width ${road.width}, role ${road.materialRole}`),
    "",
    "## Zones",
    "",
    ...plan.zones.map((zone) => `- ${zone.label}: ${zone.kind}, x:${zone.bounds.min.x}..${zone.bounds.max.x}, z:${zone.bounds.min.z}..${zone.bounds.max.z}`),
    "",
    "## Terrain Preparation",
    "",
    `- Recommended paste origin: x:${plan.terrain.recommendedPasteOrigin.x}, y:${plan.terrain.recommendedPasteOrigin.y}, z:${plan.terrain.recommendedPasteOrigin.z}`,
    `- Foundation depth: ${plan.terrain.foundationDepth}`,
    `- Flattening bounds: x:${plan.terrain.terrainFlatteningBounds.min.x}..${plan.terrain.terrainFlatteningBounds.max.x}, z:${plan.terrain.terrainFlatteningBounds.min.z}..${plan.terrain.terrainFlatteningBounds.max.z}`,
    `- Support stilts: ${plan.terrain.supportStilts ? "yes" : "no"}`,
    `- Basement fill: ${plan.terrain.basementFill ? "yes" : "no"}`,
    "",
    "## Biome Dressing Hints",
    "",
    ...plan.terrain.biomeDressingHints.map((hint) => `- ${hint}`),
    "",
    "## Warnings",
    "",
    ...plan.warnings.map((warning) => `- ${warning}`),
    "",
  ].join("\n");
}
