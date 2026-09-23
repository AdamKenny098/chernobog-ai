import {
  readFileSync,
} from "node:fs";
import {
  resolve,
} from "node:path";

const root =
  process.cwd();

function read(
  relativePath: string,
): string {
  return readFileSync(
    resolve(
      root,
      relativePath,
    ),
    "utf8",
  );
}

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

const view =
  read(
    "components/chernobog-ui/command-center/CommandCenterView.tsx",
  );

const surface =
  read(
    "components/chernobog-ui/command-center/StewardAttentionSurface.tsx",
  );

assert(
  view.includes(
    'import { StewardAttentionSurface } from "./StewardAttentionSurface";',
  ),
  "live Command Center imports Steward attention surface",
);

assert(
  view.includes(
    "<StewardAttentionSurface />",
  ),
  "live Command Center renders Steward attention surface",
);

assert(
  surface.includes(
    '"/api/personal-assistance/responsibilities"',
  ),
  "surface reads canonical PA-3A1 responsibility ledger",
);

assert(
  surface.includes(
    '"/api/personal-assistance/attention"',
  ),
  "surface reads canonical PA-1A attention state",
);

assert(
  surface.includes(
    "/transition",
  ),
  "surface submits responsibility state transitions through PA-3A1 API",
);

assert(
  surface.includes(
    '"steward.attention-ui"',
  ),
  "surface identifies Steward UI actor in responsibility audit",
);

for (
  const state of [
    '"resolved"',
    '"dismissed"',
    '"waiting-external"',
    '"waiting-user"',
  ]
) {
  assert(
    surface.includes(
      state,
    ),
    `surface exposes governed ${state} transition`,
  );
}

assert(
  surface.includes(
    "requiresHuman",
  ) &&
    surface.includes(
      "waiting-user",
    ),
  "surface identifies responsibilities requiring the user",
);

assert(
  surface.includes(
    "suggestedAction",
  ) &&
    surface.includes(
      "confidence",
    ) &&
    surface.includes(
      "evidence",
    ),
  "surface exposes actionable responsibility context",
);

assert(
  surface.includes(
    "setInterval",
  ) &&
    surface.includes(
      "4_000",
    ),
  "surface refreshes live state without aggressive polling",
);

assert(
  surface.includes(
    "setTimeout",
  ) &&
    surface.includes(
      "initialTimer",
    ) &&
    surface.includes(
      "clearTimeout",
    ),
  "surface defers initial client sync outside synchronous effect execution",
);

assert(
  !surface.includes(
    "/api/tools",
  ) &&
    !surface.includes(
      "tool-gateway",
    ) &&
    !surface.includes(
      "grantPermission",
    ),
  "surface adds no tool execution or permission-grant path",
);

assert(
  !surface.includes(
    "cognition/attentionQueue",
  ) &&
    !surface.includes(
      "cognition/initiativeQueue",
    ),
  "surface does not duplicate responsibilities into cognition queues",
);

console.log("");
console.log(
  "PA-3C1 Steward Attention Surface verifier: PASS",
);
