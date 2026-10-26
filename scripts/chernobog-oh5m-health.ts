import { defaultOH5BDatabasePath } from "../packages/vault/src/oh5/store";
import { inspectOH5Database, snapshotOH5Database, rehearseOH5Recovery } from "../packages/vault/src/oh5/resilience";
import path from "node:path";
const [mode, ...args] = process.argv.slice(2);
async function run(): Promise<void> {
  const live = defaultOH5BDatabasePath();
  if (mode === "inspect") {
    const report = inspectOH5Database(live);
    console.log(JSON.stringify(report, null, 2));
    if (!report.healthy) process.exitCode = 1;
  } else if (mode === "backup") {
    const dest = args[0] ? path.resolve(args[0]) : path.resolve(".chernobog/backups/oh5");
    const result = await snapshotOH5Database(live, dest);
    console.log(JSON.stringify(result, null, 2));
  } else if (mode === "rehearse") {
    if (args.length !== 2) throw new Error("Usage: rehearse <backup.sqlite> <sha256>");
    const result = rehearseOH5Recovery(path.resolve(args[0]), args[1]);
    console.log(JSON.stringify(result, null, 2));
    if (!result.healthy) process.exitCode = 1;
  } else { throw new Error("Usage: inspect | backup [directory] | rehearse <backup.sqlite> <sha256>"); }
}
run().catch(e => { console.error(e instanceof Error ? e.message : "Health operation failed"); process.exitCode = 1; });