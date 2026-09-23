import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";
import {
  parseAlkimiiMobileRoster,
} from "../lib/chernobog/personalAssistance/workSchedule/mobileRoster";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `FAIL ${message}`,
    );
  }

  console.log(
    `PASS ${message}`,
  );
}

async function main() {
  const shifts =
    parseAlkimiiMobileRoster(
      [
        "My Schedule",
        "Roster",
        "Monday 21 September",
        "09:00 - 17:00",
        "Tuesday 22 September",
        "12:00",
        "20:00",
      ],
      {
        timeZone:
          "Europe/Dublin",
        observedAt:
          "2026-09-20T20:00:00.000Z",
      },
    );

  assert(
    shifts.length ===
      2,
    "mobile roster parser extracts range and split-time Alkimii shift cards",
  );

  assert(
    shifts[0].date ===
      "2026-09-21" &&
    shifts[1].date ===
      "2026-09-22",
    "mobile roster parser resolves year-relative Alkimii dates correctly",
  );

  const liveRoster =
    parseAlkimiiMobileRoster(
      [
        "My shifts",
        "20 \u2013 26 Sep",
        "Sun",
        "20",
        "07:00 - 17:25",
        "The Granville Hotel",
        "Porters",
        "Normal",
        "Next Shift",
        "Mon",
        "21",
        "14:00 - 18:00",
        "The Granville Hotel",
        "Porters",
        "Normal",
        "Tue",
        "22",
        "07:00 - 16:00",
        "The Granville Hotel",
        "Porters",
        "Normal",
        "Wed",
        "23",
        "14:00 - 21:00",
        "The Granville Hotel",
        "Porters",
        "Normal",
        "Thu",
        "24",
        "07:00 - 16:00",
        "The Granville Hotel",
        "Porters",
        "Normal",
        "Sat",
        "26",
        "14:00 - 22:00",
        "The Granville Hotel",
        "Porters",
        "Normal",
      ],
      {
        timeZone:
          "Europe/Dublin",
        observedAt:
          "2026-09-20T22:02:35.000Z",
      },
    );

  assert(
    liveRoster.length ===
      6,
    "mobile roster parser extracts all six shifts from the real Alkimii accessibility node shape",
  );

  assert(
    liveRoster.map(
      (
        shift,
      ) =>
        shift.date,
    ).join(",") ===
      "2026-09-20,2026-09-21,2026-09-22,2026-09-23,2026-09-24,2026-09-26",
    "split weekday/day accessibility nodes resolve to the correct roster dates",
  );

  assert(
    liveRoster[1].date ===
      "2026-09-21" &&
    liveRoster[1].startAt ===
      "2026-09-21T13:00:00.000Z" &&
    liveRoster[1].endAt ===
      "2026-09-21T17:00:00.000Z",
    "live Monday 14:00-18:00 shift is interpreted in Europe/Dublin daylight time",
  );

  const overnight =
    parseAlkimiiMobileRoster(
      [
        "My Schedule",
        "Roster",
        "23/09/2026",
        "22:00 - 06:00",
      ],
      {
        timeZone:
          "Europe/Dublin",
        observedAt:
          "2026-09-20T20:00:00.000Z",
      },
    )[0];

  assert(
    Date.parse(
      overnight.endAt,
    ) >
      Date.parse(
        overnight.startAt,
      ),
    "mobile roster parser handles overnight shifts",
  );

  let rejected =
    false;

  try {
    parseAlkimiiMobileRoster(
      [
        "News",
        "Welcome to Alkimii",
      ],
      {
        timeZone:
          "Europe/Dublin",
      },
    );
  } catch {
    rejected =
      true;
  }

  assert(
    rejected,
    "non-roster text cannot establish an authoritative work schedule",
  );

  const route =
    readFileSync(
      resolve(
        "app/api/personal-assistance/mobile/work-schedule/alkimii-roster/route.ts",
      ),
      "utf8",
    );

  assert(
    route.includes(
      "authenticatePersonalAssistanceMobileRequest",
    ) &&
    route.includes(
      '"com.alkimii.connect.app"',
    ),
    "mobile roster API requires enrolled-device authentication and exact Alkimii package identity",
  );

  const service =
    readFileSync(
      resolve(
        "mobile/android-companion/app/src/main/java/ai/chernobog/companion/AlkimiiRosterAccessibilityService.kt",
      ),
      "utf8",
    );

  assert(
    service.includes(
      "com.alkimii.connect.app",
    ) ||
    service.includes(
      "ALKIMII_PACKAGE",
    ),
    "Android accessibility bridge is scoped to Alkimii",
  );

  assert(
    service.includes(
      "hasWeekRange",
    ) &&
    service.includes(
      "hasSplitWeekdayDay",
    ) &&
    service.includes(
      "Roster candidate rejected:",
    ),
    "Android roster gate accepts the real Alkimii week-range and split weekday/day accessibility shape",
  );

  assert(
    service.includes(
      "scheduleCapture()",
    ) &&
    service.includes(
      "captureScheduled",
    ) &&
    service.includes(
      "chernobog_alkimii_roster_v2",
    ),
    "Android roster bridge throttles captures without starvation and forces a fresh post-upgrade roster observation",
  );

  assert(
    service.includes(
      "SecureCredentialStore(",
    ) &&
    service.includes(
      ".savedEndpoint()",
    ) &&
    service.includes(
      ".savedToken()",
    ) &&
    !service.includes(
      "Class.forName(",
    ),
    "Android roster bridge reads the accepted encrypted enrollment store directly without reflection",
  );

  assert(
    service.includes(
      "ChernobogPA4",
    ) &&
    service.includes(
      "Alkimii roster upload accepted.",
    ) &&
    !service.includes(
      'Log.i(TAG, "Bearer'
    ),
    "Android roster bridge exposes safe success/failure diagnostics without logging credentials",
  );

  assert(
    !service.includes(
      "performAction(",
    ) &&
    !service.includes(
      "dispatchGesture(",
    ) &&
    !service.includes(
      "performGlobalAction(",
    ),
    "Android accessibility bridge has no click, gesture, or global-action execution path",
  );

  const config =
    readFileSync(
      resolve(
        "mobile/android-companion/app/src/main/res/xml/alkimii_roster_accessibility_service.xml",
      ),
      "utf8",
    );

  assert(
    config.includes(
      'android:packageNames="com.alkimii.connect.app"',
    ) &&
    config.includes(
      'android:canPerformGestures="false"',
    ),
    "Android accessibility metadata enforces package scoping and no gesture authority",
  );

  const manifest =
    readFileSync(
      resolve(
        "mobile/android-companion/app/src/main/AndroidManifest.xml",
      ),
      "utf8",
    );

  assert(
    manifest.includes(
      "AlkimiiRosterAccessibilityService",
    ) &&
    manifest.includes(
      "android.permission.BIND_ACCESSIBILITY_SERVICE",
    ),
    "Android manifest registers the user-enabled scoped accessibility service",
  );

  console.log("");
  console.log(
    "PA-4 Alkimii Mobile Roster Bridge verifier: PASS",
  );
}

void main().catch(
  (
    error,
  ) => {
    console.error(
      error,
    );
    process.exitCode =
      1;
  },
);
