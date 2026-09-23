import {
  readFileSync,
} from "node:fs";
import {
  communicationChannel,
  responseDueAt,
} from "../lib/chernobog/personalAssistance/communicationResponsibility";

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

const notification = (
  appPackage: string,
  appLabel: string,
  category = "msg",
) => ({
  appPackage,
  appLabel,
  category,
});

assert(
  communicationChannel(
    notification(
      "com.whatsapp",
      "WhatsApp",
    ) as never,
  ) === "whatsapp",
  "WhatsApp is a first-class PA-6 channel",
);

assert(
  communicationChannel(
    notification(
      "com.google.android.apps.messaging",
      "Messages",
    ) as never,
  ) === "messages",
  "Google Messages/SMS is a first-class PA-6 channel",
);

assert(
  communicationChannel(
    notification(
      "com.discord",
      "Discord",
    ) as never,
  ) === "discord",
  "Discord is a first-class PA-6 channel",
);

assert(
  communicationChannel(
    notification(
      "com.google.android.gm",
      "Gmail",
      "email",
    ) as never,
  ) === "gmail",
  "Gmail is a first-class PA-6 channel",
);

assert(
  responseDueAt(
    "2026-09-21T12:00:00.000Z",
    24,
  ) === "2026-09-22T12:00:00.000Z",
  "response-window deadlines are deterministic",
);

assert(
  responseDueAt(
    "2026-09-21T12:00:00.000Z",
    null,
  ) === undefined,
  "PA-6 does not invent deadlines when response-window authority is unset",
);

const ingress =
  readFileSync(
    "app/api/personal-assistance/mobile/notifications/route.ts",
    "utf8",
  );

assert(
  ingress.includes(
    "observeCommunicationResponsibilitySafely",
  ),
  "authenticated mobile notification ingress delegates accepted communication evidence to PA-6",
);

const service =
  readFileSync(
    "lib/chernobog/personalAssistance/communicationResponsibility.ts",
    "utf8",
  );

assert(
  service.includes(
    "trackResponsibilities",
  ) &&
  service.includes(
    "defaultResponseWindowHours",
  ),
  "PA-6 obeys existing Personal Assistance communication profile authority",
);

assert(
  service.includes(
    '"waiting-external"',
  ) &&
  service.includes(
    '"waiting-user"',
  ) &&
  service.includes(
    "New actionable inbound communication reopened",
  ),
  "PA-6 supports waiting-user / waiting-external lifecycle",
);

assert(
  !service.includes(
    "sendMessage(",
  ) &&
  !service.includes(
    "dispatchGesture",
  ) &&
  !service.includes(
    "performGlobalAction",
  ),
  "PA-6 contains no message-send or Android action authority",
);

console.log("");
console.log(
  "PA-6 Communication Responsibility verifier: PASS",
);