/**
 * OH-7B14: real Personal Assistance / Android bootstrap adapters.
 *
 * These adapters reuse the accepted OH6 PA database and Android outbox.
 * They are *not* an entrypoint: B14 never obtains authority or starts them.
 * They must only be constructed after a B13 lease has been acquired and
 * production storage paths have been verified by the host.
 */
import path from "node:path";
import type { BackgroundAdapter } from "./backgroundLifecycle";

export interface OH7B14PersonalAssistanceOptions {
  readonly dataRoot: string;
  readonly assertOwned: () => void;
  /** Test-only dependency injection; default loaders import accepted modules. */
  readonly initializePA?: () => Promise<void>;
  readonly closePA?: () => Promise<void>;
  readonly initializeAndroid?: () => Promise<void>;
}

export function createOH7B14PersonalAssistanceAdapters(
  options: OH7B14PersonalAssistanceOptions,
): readonly BackgroundAdapter[] {
  const root = path.resolve(options.dataRoot);
  if (!path.isAbsolute(options.dataRoot) || root === path.parse(root).root ||
      path.resolve(process.env.CHERNOBOG_DATA_DIR ?? "") !== root) {
    throw new Error("OH7B14 Personal Assistance requires exact configured absolute data root");
  }

  const initializePA = options.initializePA ?? (async () => {
    const pa = await import("@chernobog/personal-assistance");
    pa.getPersonalAssistanceProfile();
    pa.getPersonalAttentionSnapshot();
  });
  const closePA = options.closePA ?? (async () => {
    const { closePersonalAssistancePersistence } =
      await import("../../../packages/personal-assistance/src/persistence");
    closePersonalAssistancePersistence();
  });
  const initializeAndroid = options.initializeAndroid ?? (async () => {
    const { liveAndroidReminderDeliveryService } =
      await import("@chernobog/personal-assistance/reminders/androidDelivery");
    // Initializes accepted delivery state, but does not send or acknowledge.
    await liveAndroidReminderDeliveryService();
  });
  let paStarted = false;
  let androidStarted = false;

  return [
    {
      id: "personalAssistance",
      async start() {
        options.assertOwned();
        if (paStarted) throw new Error("OH7B14 PA already started");
        // Initialization can open SQLite; check ownership immediately before.
        try {
          await initializePA();
          // Do not advertise readiness if lease disappeared during initialization.
          options.assertOwned();
          paStarted = true;
        } catch (error) {
          // SQLite may have opened before initialization failed.
          await closePA().catch(() => {});
          throw error;
        }
      },
      async stop() {
        if (!paStarted) return;
        paStarted = false;
        await closePA();
      },
    },
    {
      id: "androidDelivery",
      async start() {
        options.assertOwned();
        if (!paStarted || androidStarted) {
          throw new Error("OH7B14 Android requires active PA and no duplicate startup");
        }
        await initializeAndroid();
        options.assertOwned();
        androidStarted = true;
      },
      stop() {
        androidStarted = false;
      },
    },
  ];
}
