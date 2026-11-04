/**
 * LOCAL OWNER TOOL - run on the same Chernobog instance/data directory as the
 * mobile API server. Never expose this command as an HTTP endpoint.
 *
 * npx tsx scripts/oh6c-mobile-recovery.ts --list
 * npx tsx scripts/oh6c-mobile-recovery.ts --create DEVICE_ID
 */
import {
  createPersonalAssistanceMobileRecovery,
  listPersonalAssistanceMobileDevices,
} from "../packages/personal-assistance/src/mobile/store";
import { personalAssistanceDatabasePath } from "../packages/personal-assistance/src/persistence";

function main(): void {
  const action = process.argv[2];
  if (action !== "--list" && action !== "--create") {
    console.log("Usage: npx tsx scripts/oh6c-mobile-recovery.ts --list");
    console.log("       npx tsx scripts/oh6c-mobile-recovery.ts --create DEVICE_ID");
    process.exitCode = 2;
    return;
  }

  console.log(`PA database: ${personalAssistanceDatabasePath}`);
  if (action === "--list") {
    const devices = listPersonalAssistanceMobileDevices();
    if (devices.length === 0) {
      console.log("No enrolled mobile devices in this database.");
    }
    for (const d of devices) {
      console.log(`${d.deviceId} | ${d.status} | ${d.displayName} | ${d.platform}`);
    }
    return;
  }
  const deviceId = process.argv[3];
  if (!deviceId || process.argv.length !== 4) {
    throw new Error("Provide exactly one device ID from --list.");
  }
  const challenge = createPersonalAssistanceMobileRecovery(deviceId);
  console.log("\nLOCAL OWNER-APPROVED CREDENTIAL RECOVERY");
  console.log(`Device: ${challenge.deviceId}`);
  console.log(`Expires: ${challenge.expiresAt}`);
  console.log(`Recovery code: ${challenge.recoveryCode}`);
  console.log("Enter the recovery code into the existing Android installation.");
  console.log("Treat this code as a secret. It expires after 10 minutes and works once.");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
