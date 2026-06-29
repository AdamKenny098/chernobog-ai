import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getMilestone6FinalStatus, renderMilestone6FinalStatus } from "./milestone6FinalStatus";

function toRel(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

async function writeText(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

function renderCommandReference(): string {
  const status = getMilestone6FinalStatus();

  return [
    "# Minecraft Schematic Generator — Milestone 6 Command Reference",
    "",
    "## Build Department",
    "",
    "```txt",
    "build department status",
    "build department plan create factory yard with train platform",
    "build department generate create factory yard with train platform",
    "build department full pipeline create factory yard with train platform",
    "build department review latest",
    "build department repair latest",
    "build department preview latest",
    "```",
    "",
    "## Pack Commands",
    "",
    "```txt",
    "schematic pack latest",
    "schematic review pack latest",
    "schematic repair pack latest",
    "schematic preview pack latest",
    "```",
    "",
    "## Create Machine Commands",
    "",
    "```txt",
    "generate create press line",
    "generate create mixer station",
    "generate create water wheel power test",
    "```",
    "",
    "## Final Status",
    "",
    "```txt",
    "milestone 6 status",
    "schematic milestone 6 status",
    "build department milestone status",
    "```",
    "",
    "## Recommended SirioCraft Workflow",
    "",
    ...status.recommendedSirioCraftWorkflow.map((step, index) => `${index + 1}. ${step}`),
    "",
  ].join("\n");
}

function renderValidationChecklist(): string {
  return [
    "# Milestone 6 Validation Checklist",
    "",
    "## Build",
    "",
    "- [ ] `npm run build` passes.",
    "- [ ] Dev server starts without module resolution errors.",
    "",
    "## Create Machines",
    "",
    "- [ ] `generate create press line` creates a schematic.",
    "- [ ] `generate create mixer station` creates a schematic.",
    "- [ ] `generate create water wheel power test` creates a schematic.",
    "",
    "## Scene Packs",
    "",
    "- [ ] `build department full pipeline create factory yard with train platform` completes.",
    "- [ ] Latest pack folder exists under `exports/schematic-packs/`.",
    "- [ ] `pack.json` exists.",
    "- [ ] `placement-guide.md` exists.",
    "- [ ] `metadata/generation-report.json` exists.",
    "- [ ] Real schematics exist under `schematics/`.",
    "",
    "## Review / Repair",
    "",
    "- [ ] `build department review latest` returns a score and flags.",
    "- [ ] `build department repair latest` refreshes metadata without changing schematic block data.",
    "- [ ] `metadata/review-report.json` exists.",
    "- [ ] `metadata/repair-report.json` exists after repair.",
    "",
    "## Preview Export",
    "",
    "- [ ] `build department preview latest` creates `vanilla-preview/`.",
    "- [ ] `.preview.schem` files exist.",
    "- [ ] At least one `.preview.schem` opens in Schemat.io.",
    "- [ ] Original Create schematics remain unchanged.",
    "",
    "## Final Status",
    "",
    "- [ ] `milestone 6 status` returns the final command set and known limitations.",
    "",
  ].join("\n");
}

function renderArchitectureNote(): string {
  return [
    "# Milestone 6 Architecture Note",
    "",
    "Milestone 6 establishes the first usable Chernobog Build Department.",
    "",
    "The core rule is:",
    "",
    "> AI or department commands may plan and orchestrate, but deterministic compilers place final blocks.",
    "",
    "## Layers",
    "",
    "1. Create support models mechanical graphs.",
    "2. Create graph compiler turns machine graphs into schematics.",
    "3. Scene planner creates deterministic layout, roads, zones, terrain metadata, and paste order.",
    "4. Pack compiler exports multiple schematics into a coherent pack.",
    "5. Quality routing delegates major buildings to the best individual generators.",
    "6. Review and repair inspect packs and repair metadata drift.",
    "7. Vanilla preview exporter creates browser-viewer sidecars.",
    "8. Build Department wraps the workflow into readable commands.",
    "",
    "## What Milestone 6 is not",
    "",
    "- It is not fully autonomous multi-agent construction.",
    "- It is not final visual quality for every structure category.",
    "- It is not a replacement for Create-enabled Minecraft validation.",
    "",
    "## What Milestone 6 proves",
    "",
    "- Chernobog can generate individual modded schematics.",
    "- Chernobog can generate multi-schematic packs.",
    "- Chernobog can preserve individual-generator quality inside packs.",
    "- Chernobog can review, repair, and preview packs.",
    "- Chernobog can expose the workflow through a Build Department interface.",
    "",
  ].join("\n");
}

export type Milestone6DocsResult = {
  ok: boolean;
  files: string[];
  summary: string;
};

export async function writeMilestone6Docs(): Promise<Milestone6DocsResult> {
  const root = path.join(process.cwd(), "docs", "minecraft-schematic", "milestone-6");
  const statusPath = path.join(root, "final-status.md");
  const commandReferencePath = path.join(root, "command-reference.md");
  const validationChecklistPath = path.join(root, "validation-checklist.md");
  const architectureNotePath = path.join(root, "architecture-note.md");

  await writeText(statusPath, `# ${getMilestone6FinalStatus().codename}\n\n${renderMilestone6FinalStatus()}\n`);
  await writeText(commandReferencePath, renderCommandReference());
  await writeText(validationChecklistPath, renderValidationChecklist());
  await writeText(architectureNotePath, renderArchitectureNote());

  const files = [
    toRel(statusPath),
    toRel(commandReferencePath),
    toRel(validationChecklistPath),
    toRel(architectureNotePath),
  ];

  return {
    ok: true,
    files,
    summary: [
      "Milestone 6 documentation written",
      "",
      "Files:",
      ...files.map((file) => `- ${file}`),
    ].join("\n"),
  };
}
