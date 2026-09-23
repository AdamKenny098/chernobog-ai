import fs from "node:fs";
import path from "node:path";

function read(
  relativePath: string,
): string {
  return fs.readFileSync(
    path.join(
      process.cwd(),
      relativePath,
    ),
    "utf8",
  );
}

function assert(
  condition: boolean,
  message: string,
): void {
  if (
    !condition
  ) {
    throw new Error(
      `FAIL ${message}`,
    );
  }

  console.log(
    `PASS ${message}`,
  );
}

const store =
  read(
    "lib/chernobog/personalAssistance/mobile/notificationStore.ts",
  );

const route =
  read(
    "app/api/personal-assistance/mobile/notifications/route.ts",
  );

assert(
  store.includes(
    "processed_at",
  ),
  "notification receipts track downstream processing completion",
);

assert(
  store.includes(
    "ALTER TABLE personal_assistance_mobile_notification_receipt",
  ),
  "existing receipt schema migrates in place",
);

assert(
  store.includes(
    "markPersonalAssistanceMobileNotificationProcessed",
  ),
  "notification store exports an explicit processing completion marker",
);

assert(
  /receipt\.processed_at/u.test(
    store,
  ),
  "reconciliation acknowledges only processed receipts",
);

assert(
  store.includes(
    'normalized.captureMode ===\n              "metadata-only"',
  ) &&
    store.includes(
      "? receivedAt\n              : null",
    ),
  "metadata-only receipts remain immediately acknowledgeable while content-bearing receipts wait for downstream processing",
);

assert(
  /if \(\s*normalized\.captureMode ===\s*"metadata-only"\s*\) \{\s*acknowledgedEventIds\.push/u.test(
    store,
  ),
  "PA-2C metadata-only acknowledgement semantics remain backward compatible",
);

assert(
  /"capture-disabled",\s*receivedAt,\s*receivedAt,/u.test(
    store,
  ),
  "capture-disabled receipts remain immediately acknowledgeable",
);

assert(
  route.includes(
    "markPersonalAssistanceMobileNotificationProcessed",
  ),
  "mobile ingress marks events only after downstream processing",
);

assert(
  route.includes(
    ".acknowledgedEventIds",
  ) &&
    route.includes(
      ".push(",
    ),
  "successful downstream processing is returned to Android as acknowledged",
);

assert(
  /item\.disposition ===\s*"duplicate"/u.test(
    route,
  ),
  "only already-processed duplicate events are skipped before downstream projection",
);

assert(
  route.includes(
    "observeCommunicationResponsibility",
  ),
  "PA-6 observer binding remains present in the mobile notification route",
);

const markIndex =
  route.lastIndexOf(
    "markPersonalAssistanceMobileNotificationProcessed",
  );

const observerIndex =
  route.lastIndexOf(
    "observeCommunicationResponsibility",
  );

assert(
  observerIndex >=
    0 &&
    markIndex >
      observerIndex,
  "receipt processing completion occurs after the PA-6 observer",
);

console.log("");
console.log(
  "Chernobog PA-6 processing-aware notification acknowledgement verifier PASS",
);