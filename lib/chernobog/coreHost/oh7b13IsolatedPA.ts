/**
 * OH-7B13: existing PA SQLite and Android outbox lifecycle in a disposable
 * headless-host fixture only. No new queue and no production activation.
 */
import { existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { BackgroundAdapter } from "./backgroundLifecycle";

export interface OH7B13IsolatedPersonalAssistanceOptions {
  dataRoot: string;
  hasOwnership: () => boolean;
}

export function createOH7B13IsolatedPersonalAssistanceAdapters(
  options: OH7B13IsolatedPersonalAssistanceOptions,
): readonly BackgroundAdapter[] {
  const root = path.resolve(options.dataRoot);
  const temporary = realpathSync(tmpdir());
  if (!existsSync(root) || !realpathSync(root).startsWith(temporary + path.sep) ||
      !existsSync(path.join(root, ".oh7b3-fixture"))) {
    throw new Error("OH7B13 PA requires disposable OH7B3-marked fixture storage");
  }
  if (path.resolve(process.env.CHERNOBOG_DATA_DIR ?? "") !== root) {
    throw new Error("OH7B13 PA fixture differs from configured data directory");
  }

  let started = false;
  let androidStarted = false;

  return [
    {
      id: "personalAssistance",
      async start() {
        if (!options.hasOwnership()) throw new Error("OH7B13 PA ownership denied");
        if (started) throw new Error("OH7B13 PA already started");
        // Imports are intentionally deferred until after fixture validation
        // and ownership checks; these accepted stores initialize SQLite tables.
        const pa = await import("@chernobog/personal-assistance");
        pa.getPersonalAssistanceProfile();
        pa.getPersonalAttentionSnapshot();
        started = true;
      },
      async stop() {
        if (!started) return;
        started = false;
        const persistence = await import("../../../packages/personal-assistance/src/persistence");
        persistence.closePersonalAssistancePersistence();
      },
    },
    {
      id: "androidDelivery",
      async start() {
        if (!started || !options.hasOwnership()) {
          throw new Error("OH7B13 Android delivery requires PA and ownership");
        }
        if (androidStarted) throw new Error("OH7B13 Android delivery already started");
        const { liveAndroidReminderDeliveryService } =
          await import("@chernobog/personal-assistance/reminders/androidDelivery");
        // Construct the EXISTING OH6G delivery outbox and claim tables,
        // but do not claim, send, authorize, or acknowledge a reminder.
        await liveAndroidReminderDeliveryService();
        androidStarted = true;
      },
      stop() {
        androidStarted = false;
      },
    },
  ];
}
