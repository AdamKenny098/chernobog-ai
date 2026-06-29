export type Milestone6FinalStatus = {
  milestone: "Milestone 6";
  codename: "Chernobog Build Department";
  status: "complete_candidate";
  estimatedCompletionPercent: number;
  completed: string[];
  finalCommandSet: string[];
  recommendedSirioCraftWorkflow: string[];
  knownLimitations: string[];
  nextMilestoneCandidates: string[];
};

export function getMilestone6FinalStatus(): Milestone6FinalStatus {
  return {
    milestone: "Milestone 6",
    codename: "Chernobog Build Department",
    status: "complete_candidate",
    estimatedCompletionPercent: 100,
    completed: [
      "Create mechanical graph spine",
      "Create graph to .schem export",
      "Create machine polish",
      "Scene planner core",
      "Scene pack filesystem contract",
      "Real multi-schematic pack compiler",
      "Quality-preserving pack compiler",
      "Pack review and safe repair",
      "Vanilla preview / Schemat.io compatibility export",
      "Build Department command layer",
      "Final command/documentation pass",
    ],
    finalCommandSet: [
      "build department status",
      "build department plan create factory yard with train platform",
      "build department generate create factory yard with train platform",
      "build department full pipeline create factory yard with train platform",
      "build department review latest",
      "build department repair latest",
      "build department preview latest",
      "schematic pack latest",
      "schematic review pack latest",
      "schematic repair pack latest",
      "schematic preview pack latest",
      "milestone 6 status",
    ],
    recommendedSirioCraftWorkflow: [
      "Run build department status.",
      "Run build department full pipeline create factory yard with train platform.",
      "Inspect the generated pack folder.",
      "Use vanilla-preview schematics for browser viewing.",
      "Use original schematics in a Create-enabled Minecraft instance.",
      "Run build department review latest after every full pipeline export.",
      "Run build department repair latest only for metadata/latest-pointer drift.",
      "Commit generated metadata/docs that are useful, but avoid committing large test exports unless intentionally archiving a release pack.",
    ],
    knownLimitations: [
      "Build Department roles are deterministic orchestration layers, not autonomous multi-agent workers yet.",
      "Safe repair refreshes metadata and latest pointers only; it does not regenerate one failed structure yet.",
      "Road/path modules still use simpler fallback geometry than major buildings.",
      "Vanilla previews are not final build files. They are browser-viewer compatibility artifacts.",
      "Create/modded schematics should be validated in a Create-enabled Minecraft instance.",
      "Scene generation is deterministic but not yet terrain-aware at paste time beyond metadata and placement guidance.",
    ],
    nextMilestoneCandidates: [
      "M7-A: structure-level regenerate/repair commands",
      "M7-B: dedicated road/path/yards generator",
      "M7-C: real Build Department role separation with planner/architect/compiler files owning independent policies",
      "M7-D: litematic export or conversion support",
      "M7-E: in-app pack review UI",
      "M7-F: SirioCraft spawn/faction pack presets",
    ],
  };
}

export function renderMilestone6FinalStatus(): string {
  const status = getMilestone6FinalStatus();

  return [
    "Milestone 6 final status",
    "",
    `Codename: ${status.codename}`,
    `Status: ${status.status}`,
    `Completion: ${status.estimatedCompletionPercent}%`,
    "",
    "Completed:",
    ...status.completed.map((item) => `- ${item}`),
    "",
    "Final command set:",
    ...status.finalCommandSet.map((command) => `- ${command}`),
    "",
    "Recommended SirioCraft workflow:",
    ...status.recommendedSirioCraftWorkflow.map((step, index) => `${index + 1}. ${step}`),
    "",
    "Known limitations:",
    ...status.knownLimitations.map((limitation) => `- ${limitation}`),
    "",
    "Next milestone candidates:",
    ...status.nextMilestoneCandidates.map((candidate) => `- ${candidate}`),
  ].join("\n");
}
