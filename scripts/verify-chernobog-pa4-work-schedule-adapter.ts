import {
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  parseAlkimiiCsv,
} from "../lib/chernobog/personalAssistance/workSchedule/alkimii";
import {
  WorkScheduleStore,
} from "../lib/chernobog/personalAssistance/workSchedule/store";
import type {
  WorkScheduleSnapshot,
  WorkScheduleSignal,
} from "../lib/chernobog/personalAssistance/workSchedule/types";

function pass(
  message: string,
) {
  console.log(
    `PASS ${message}`,
  );
}

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `FAIL ${message}`,
    );
  }

  pass(
    message,
  );
}

async function main() {
  const csvA =
  [
    "Shift ID,Date,Start,Finish,Department,Role,Location,Status",
    "a1,21/09/2026,09:00,17:00,Support,Agent,Cork,Normal",
    "a2,22/09/2026,12:00,20:00,Support,Agent,Cork,Normal",
  ].join("\n");

const csvB =
  [
    "Shift ID,Date,Start,Finish,Department,Role,Location,Status",
    "a1,21/09/2026,10:00,18:00,Support,Agent,Cork,Normal",
    "a3,23/09/2026,09:00,17:00,Support,Agent,Cork,Training",
  ].join("\n");

const parsed =
  parseAlkimiiCsv(
    csvA,
    "Europe/Dublin",
  );

assert(
  parsed.length ===
    2,
  "Alkimii CSV parser normalizes two shifts",
);

assert(
  parsed[0].source ===
    "alkimii" &&
  parsed[0].startAt.endsWith(
    "Z",
  ),
  "Alkimii parser emits canonical UTC timestamps with source provenance",
);

const directory =
  await mkdtemp(
    path.join(
      os.tmpdir(),
      "chernobog-pa4-",
    ),
  );

try {
  const store =
    new WorkScheduleStore(
      directory,
    );

  const snapshotA:
    WorkScheduleSnapshot = {
    schemaVersion: 1,
    snapshotId:
      "schedule-a",
    source:
      "alkimii",
    importedAt:
      "2026-09-20T20:00:00.000Z",
    observedAt:
      "2026-09-20T20:00:00.000Z",
    timeZone:
      "Europe/Dublin",
    shifts:
      parsed,
  };

  const first =
    await store.importSnapshot(
      snapshotA,
    );

  assert(
    first.disposition ===
      "baseline" &&
    first.changes.length ===
      0,
    "first authoritative import establishes a baseline without false change alerts",
  );

  const parsedB =
    parseAlkimiiCsv(
      csvB,
      "Europe/Dublin",
    );

  const snapshotB:
    WorkScheduleSnapshot = {
    ...snapshotA,
    snapshotId:
      "schedule-b",
    importedAt:
      "2026-09-20T20:05:00.000Z",
    observedAt:
      "2026-09-20T20:05:00.000Z",
    shifts:
      parsedB,
  };

  const second =
    await store.importSnapshot(
      snapshotB,
    );

  assert(
    second.disposition ===
      "updated" &&
    second.changes.some(
      (change) =>
        change.kind ===
        "changed",
    ) &&
    second.changes.some(
      (change) =>
        change.kind ===
        "removed",
    ) &&
    second.changes.some(
      (change) =>
        change.kind ===
        "added",
    ),
    "schedule reconciliation detects changed, removed and added shifts",
  );

  const signal:
    WorkScheduleSignal = {
    eventId:
      "alkimii-test-event-001",
    source:
      "alkimii",
    observedAt:
      "2026-09-20T20:10:00.000Z",
    confidence:
      0.92,
    reason:
      "test roster update",
    appPackage:
      "com.alkimii.mobile",
    appLabel:
      "Alkimii",
  };

  assert(
    await store.observeSignal(
      signal,
    ),
    "first Alkimii notification signal is accepted",
  );

  assert(
    !(
      await store.observeSignal(
        signal,
      )
    ),
    "replayed Alkimii notification signal is idempotent",
  );

  const state =
    await store.read();

  assert(
    state.pendingRefresh &&
    state.latestSignal
      ?.eventId ===
      signal.eventId,
    "notification evidence marks the authoritative snapshot for refresh",
  );

  const route =
    await readFile(
      path.join(
        process.cwd(),
        "app",
        "api",
        "personal-assistance",
        "mobile",
        "notifications",
        "route.ts",
      ),
      "utf8",
    );

  assert(
    route.includes(
      "observeAlkimiiScheduleNotificationSafely",
    ),
    "accepted mobile notification ingress is bound to the Alkimii schedule observer",
  );

  const commandView =
    await readFile(
      path.join(
        process.cwd(),
        "components",
        "chernobog-ui",
        "command-center",
        "CommandCenterView.tsx",
      ),
      "utf8",
    );

  assert(
    commandView.includes(
      "<WorkScheduleSurface />",
    ),
    "Work Schedule surface is bound to the live Command Center",
  );

  const surface =
    await readFile(
      path.join(
        process.cwd(),
        "components",
        "chernobog-ui",
        "command-center",
        "WorkScheduleSurface.tsx",
      ),
      "utf8",
    );

  assert(
    surface.includes(
      "Import CSV",
    ) &&
    surface.includes(
      "does not scrape",
    ) &&
    surface.includes(
      "create calendar",
    ),
    "UI exposes Alkimii CSV import while preserving PA-4 execution boundaries",
  );

  const service =
    await readFile(
      path.join(
        process.cwd(),
        "lib",
        "chernobog",
        "personalAssistance",
        "workSchedule",
        "service.ts",
      ),
      "utf8",
    );

  assert(
    service.includes(
      'type:\n            "work-schedule"',
    ) &&
    service.includes(
      '"waiting-user"',
    ) &&
    service.includes(
      "publishChernobogEventSafely",
    ),
    "authoritative schedule changes project into PA-3A1 and the Event Spine without new task authority",
  );

  console.log("");
  console.log(
    "PA-4 Work Schedule Adapter verifier: PASS",
  );
} finally {
  await rm(
    directory,
    {
      recursive:
        true,
      force:
        true,
    },
  );
}

}

void main().catch(
  (error) => {
    console.error(
      error,
    );
    process.exitCode =
      1;
  },
);
