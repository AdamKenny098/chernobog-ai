import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

async function main() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "chernobog-oh6c-"));
  const previous = process.env.CHERNOBOG_DATA_DIR;
  // Windows keeps SQLite files locked while any open connection exists.
  // Keep the close handle outside the test body so a failed assertion cannot
  // skip it and have EBUSY hide the actual test failure.
  let closePersistence: (() => void) | undefined;
  let testFailure: unknown = null;
  process.env.CHERNOBOG_DATA_DIR = dir;
  try {
    const pa = await import("../packages/personal-assistance/src/mobile/store");
    const persistence = await import("../packages/personal-assistance/src/persistence");
    closePersistence = persistence.closePersonalAssistancePersistence;

    const enrollment = pa.createPersonalAssistanceMobileEnrollment();
    const installed = pa.enrollPersonalAssistanceMobileDevice({
      pairingCode: enrollment.pairingCode,
      installationId: "oh6c-test-installation-42",
      displayName: "OH6C temporary device",
    });
    const oldToken = installed.token;
    const deviceId = installed.device.deviceId;

    assert.equal(pa.authenticatePersonalAssistanceMobileToken(oldToken).deviceId, deviceId);
    const recovery = pa.createPersonalAssistanceMobileRecovery(deviceId);
    assert.ok(recovery.recoveryCode.length >= 32);
    console.log("PASS recovery code minted for an active enrolled device");

    const input = {
      recoveryCode: recovery.recoveryCode,
      deviceId,
      installationId: installed.device.installationId,
    };
    assert.throws(
      () => pa.recoverPersonalAssistanceMobileDevice({ ...input, installationId: "another-installation" }),
      /invalid/i,
    );
    assert.throws(
      () => pa.recoverPersonalAssistanceMobileDevice({ ...input, recoveryCode: "x".repeat(43) }),
      /invalid/i,
    );
    assert.equal(pa.authenticatePersonalAssistanceMobileToken(oldToken).deviceId, deviceId);
    console.log("PASS wrong code or installation ID cannot rotate a credential");

    const rotated = pa.recoverPersonalAssistanceMobileDevice(input);
    assert.equal(rotated.device.deviceId, deviceId);
    assert.equal(rotated.device.installationId, installed.device.installationId);
    assert.notEqual(rotated.token, oldToken);
    assert.equal(pa.authenticatePersonalAssistanceMobileToken(rotated.token).deviceId, deviceId);
    assert.throws(() => pa.authenticatePersonalAssistanceMobileToken(oldToken), /invalid/i);
    console.log("PASS atomic rotation keeps device identity; invalidates original bearer");

    assert.throws(() => pa.recoverPersonalAssistanceMobileDevice(input), /consumed/i);
    const expired = pa.createPersonalAssistanceMobileRecovery(deviceId, {
      now: new Date("2026-01-01T00:00:00Z"),
    });
    assert.throws(() => pa.recoverPersonalAssistanceMobileDevice({ ...input, recoveryCode: expired.recoveryCode }), /expired/i);
    console.log("PASS recovery codes are one-time and time-limited");

    pa.revokePersonalAssistanceMobileDevice(deviceId);
    assert.throws(() => pa.createPersonalAssistanceMobileRecovery(deviceId), /active/i);
    assert.throws(() => pa.authenticatePersonalAssistanceMobileToken(rotated.token), /revoked/i);
    console.log("PASS revoked devices are not eligible for recovery");

    const root = process.cwd();
    const route = await readFile(path.join(root, "app/api/personal-assistance/mobile/notifications/route.ts"), "utf8");
    assert.match(route, /communication\.outcome === "failed"/);
    const failing = route.indexOf('communication.outcome === "failed"');
    // Do not depend on CRLF vs LF or exact indentation in Windows checkouts.
    const markMatch = /markPersonalAssistanceMobileNotificationProcessed\s*\(\s*device\s*,/u.exec(route);
    const marked = markMatch?.index ?? -1;
    assert.ok(failing >= 0 && marked > failing);
    console.log("PASS PA-6 communication failure blocks receipt acknowledgement");

    const kotlin = path.join(root, "mobile/android-companion/app/src/main/java/ai/chernobog/companion");
    const viewModel = await readFile(path.join(kotlin,"CompanionViewModel.kt"),"utf8");
    const secureStore = await readFile(path.join(kotlin,"SecureCredentialStore.kt"),"utf8");
    const screen = await readFile(path.join(kotlin,"CompanionScreen.kt"),"utf8");
    const client = await readFile(path.join(kotlin,"ChernobogApiClient.kt"),"utf8");
    assert.match(viewModel,/fun recoverEnrollment\(\)/);
    assert.match(viewModel,/credentialStore\.saveEnrollment\(record\)/);
    assert.match(screen,/RECOVER DEVICE - PRESERVE SPOOL/);
    assert.match(client,/\/api\/personal-assistance\/mobile\/recover/);
    assert.match(secureStore,/fun saveEnrollment\(/);
    assert.doesNotMatch(viewModel.slice(viewModel.indexOf("fun recoverEnrollment()"),viewModel.indexOf("fun refreshSessionIfEnrolled()")),/clearEnrollment|rotateInstallationId|deleteAll/);
    console.log("PASS Android recovery path preserves local installation identity and offline spool");

  } catch (error) {
    testFailure = error;
    throw error;
  } finally {
    let cleanupFailure: unknown = null;
    try {
      closePersistence?.();
    } catch (error) {
      cleanupFailure = error;
    }
    if (previous === undefined) delete process.env.CHERNOBOG_DATA_DIR;
    else process.env.CHERNOBOG_DATA_DIR = previous;
    try {
      // Retry for transient Windows filesystem/antivirus handle delays.
      await rm(dir, { recursive: true, force: true, maxRetries: 12, retryDelay: 200 });
    } catch (error) {
      cleanupFailure ??= error;
    }
    if (cleanupFailure !== null) {
      if (testFailure !== null) {
        // Do not mask the primary assertion error with a cleanup exception.
        console.error("OH-6C temporary test database cleanup warning:", cleanupFailure);
      } else {
        throw cleanupFailure;
      }
    }
  }
  console.log("\nOH-6C isolated recovery and acknowledgement verifier: PASS");
}

main().catch(error => {console.error(error);process.exitCode=1;});
