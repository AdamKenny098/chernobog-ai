import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8",
  );
}

function pass(message: string): void {
  console.log(`PASS ${message}`);
}

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(`FAIL ${message}`);
  }

  pass(message);
}

const scheduler =
  read(
    "mobile/android-companion/app/src/main/java/ai/chernobog/companion/NotificationSyncScheduler.kt",
  );

const worker =
  read(
    "mobile/android-companion/app/src/main/java/ai/chernobog/companion/NotificationSyncWorker.kt",
  );

const panel =
  read(
    "mobile/android-companion/app/src/main/java/ai/chernobog/companion/NotificationAccessPanel.kt",
  );

assert(
  scheduler.includes(
    '"chernobog-notification-sync-v2"',
  ),
  "notification sync uses a fresh v2 unique-work identity",
);

assert(
  scheduler.includes(
    '"chernobog-notification-sync"',
  ),
  "legacy poisoned unique-work identity is retained for cancellation",
);

assert(
  scheduler.includes(
    "ExistingWorkPolicy.KEEP",
  ),
  "normal notification scheduling preserves single-worker KEEP semantics",
);

assert(
  scheduler.includes(
    "ExistingWorkPolicy.REPLACE",
  ),
  "explicit recovery scheduling can replace a backoffed worker",
);

assert(
  scheduler.includes(
    "fun enqueueContinuation",
  ) &&
    scheduler.includes(
      ".enqueue(",
    ),
  "healthy backlog continuation is scheduled without WorkManager retry backoff",
);

assert(
  worker.includes(
    "MAX_BATCHES_PER_RUN",
  ) &&
    worker.includes(
      "BATCH_SIZE",
    ),
  "worker remains bounded per execution",
);

assert(
  worker.includes(
    "NotificationSyncScheduler",
  ) &&
    worker.includes(
      ".enqueueContinuation(",
    ),
  "remaining healthy backlog creates a continuation",
);

assert(
  !worker.includes(
    "return if (\n            dao.count() > 0\n        ) {\n            Result.retry()",
  ),
  "healthy backlog no longer maps to Result.retry",
);

assert(
  worker.includes(
    "Result.retry()",
  ),
  "genuine transport failures retain WorkManager retry",
);

assert(
  worker.includes(
    "offlineSpoolUploadEnabled",
  ),
  "worker honors offline spool upload policy",
);

assert(
  worker.includes(
    "Mutex()",
  ) &&
    worker.includes(
      "syncMutex.withLock",
    ),
  "notification workers are serialized inside the app process",
);

assert(
  panel.includes(
    ".enqueueRecovery(",
  ),
  "CHECK ACCESS + SYNC uses the explicit recovery path",
);

console.log("");
console.log("Chernobog PA-2 notification sync drain verifier PASS");