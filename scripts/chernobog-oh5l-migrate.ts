import fs from "node:fs";
import { previewLegacyNotes, applyLegacyPlan, type LegacyPlan } from "../packages/vault/src/oh5/migration";
import { defaultOH5BDatabasePath } from "../packages/vault/src/oh5/store";
import { defaultObsidianRoot } from "../packages/vault/src/oh5/layout";

// Usage: npx tsx scripts/chernobog-oh5l-migrate.ts preview <project-id> <relative-note.md>...
// Usage: npx tsx scripts/chernobog-oh5l-migrate.ts apply <plan.json> <digest> --owner-confirmed
const [, , mode, ...args] = process.argv;
if (mode === "preview") {
  const [projectId, ...paths] = args;
  const plan = previewLegacyNotes(defaultObsidianRoot(), projectId, paths);
  // Plan is written outside the vault; the script never prints note bodies.
  const filename = `OH5L-preview-${plan.id}.json`;
  fs.writeFileSync(filename, JSON.stringify(plan, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  console.log(`PLAN_FILE=${filename}`);
  console.log(`PROJECT=${plan.projectId} NOTES=${plan.items.length} DIGEST=${plan.digest}`);
  console.log("DRY RUN ONLY. No imported memory or legacy note changed.");
} else if (mode === "apply") {
  const [filename, digest, flag] = args;
  if (flag !== "--owner-confirmed") throw new Error("Owner must explicitly confirm preview");
  const plan = JSON.parse(fs.readFileSync(filename, "utf8")) as LegacyPlan;
  // This CLI is local-only. Do not expose it through unauthenticated HTTP or model/tool actions.
  const result = applyLegacyPlan(plan, digest, true, defaultOH5BDatabasePath());
  console.log(`IMPORTED=${result.imported} DUPLICATES=${result.duplicates} RAW_ONLY=true`);
} else {
  throw new Error("Usage: preview <registered-project> <note.md>... | apply <plan.json> <digest> --owner-confirmed");
}