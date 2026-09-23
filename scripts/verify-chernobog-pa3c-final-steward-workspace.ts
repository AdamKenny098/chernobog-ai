import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const assert = (ok: unknown, message: string) => {
  if (!ok) throw new Error(`FAIL ${message}`);
  console.log(`PASS ${message}`);
};

const view = read("components/chernobog-ui/command-center/CommandCenterView.tsx");
const ui = read("components/chernobog-ui/command-center/StewardAttentionSurface.tsx");

assert(view.includes("<StewardAttentionSurface />"), "final workspace remains in the live Command Center");
assert(ui.includes("includeClosed=true"), "reads closed and active responsibilities from PA-3A1");
assert(ui.includes("Audit history") && ui.includes("history"), "shows canonical per-item audit history");
assert(ui.includes("Evidence (") && ui.includes("observedAt"), "shows evidence metadata");
assert(ui.includes("Why this is surfaced") && ui.includes("Latest recorded rationale"), "shows provenance/rationale");
assert(ui.includes("Search responsibilities, source, state, suggested action"), "has text search");
assert(ui.includes("priorityFilter") && ui.includes("sourceFilter"), "has priority and source filters");
for (const g of ["all-active","needs-user","waiting-external","scheduled","delegated","closed"]) {
  assert(ui.includes(`"${g}"`), `has ${g} grouping`);
}
assert(ui.includes('type="datetime-local"') && ui.includes('method: "PATCH"'), "supports governed due-time updates");
assert(ui.includes("Overdue") && ui.includes("overdue"), "shows overdue attention");
assert(ui.includes("Reopen to triaged") && ui.includes('resolved: ["triaged"]') && ui.includes('dismissed: ["triaged"]'), "reopens closed work through triaged only");
assert(ui.includes("Scheduled (ledger)") && ui.includes("does not create a calendar event"), "does not conflate ledger state with calendar execution");
assert(ui.includes("Do Not Disturb is active") && ui.includes("Busy mode is active") && ui.includes("Away mode is active"), "uses PA-1A attention for presentation");
assert(ui.includes('"steward.attention-ui"') && ui.includes("/transition"), "mutations remain audited PA-3A1 transitions");
assert(ui.includes("initialTimer") && ui.includes("setInterval") && ui.includes("4_000"), "keeps effect-safe restrained live sync");
assert(!/toolGateway|grantPermission|sendMessage|cognition\/attentionQueue|cognition\/initiativeQueue/.test(ui), "adds no tool authority or duplicate cognition queue");
console.log("\nPA-3C FINAL Steward Workspace verifier: PASS");
