import {
  readdir,
  readFile,
  writeFile,
  mkdir,
} from "node:fs/promises";
import {
  spawnSync,
} from "node:child_process";
import path from "node:path";

const root = process.cwd();
const scriptsDir =
  path.join(
    root,
    "scripts",
  );

const phaseIds = [
  "11a",
  "11b",
  "11c",
  "11d",
  "11e",
  "11f",
  "11g",
  "11h",
  "11i",
  "11j",
];

const supportedExtensions =
  new Set([
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
  ]);

function scoreVerifier(name) {
  const lower =
    name.toLowerCase();

  let score = 0;

  if (
    lower.includes(
      "full-acceptance",
    )
  ) {
    score += 1200;
  }

  if (
    lower.includes(
      "full-integration",
    )
  ) {
    score += 1100;
  }

  if (
    lower.includes(
      "acceptance",
    )
  ) {
    score += 1000;
  }

  if (
    lower.includes(
      "integration",
    )
  ) {
    score += 800;
  }

  if (
    lower.includes(
      "final",
    )
  ) {
    score += 700;
  }

  const letter =
    lower.match(
      /-11[a-j]-([a-z])(?:-|\.|_)/,
    )?.[1];

  if (letter) {
    score +=
      letter.charCodeAt(0) -
      "a".charCodeAt(0);
  }

  return score;
}

function run(
  command,
  args,
  label,
) {
  console.log("");
  console.log(
    "=".repeat(68),
  );
  console.log(label);
  console.log(
    `${command} ${args.join(" ")}`,
  );
  console.log(
    "=".repeat(68),
  );

  const result =
    spawnSync(
      command,
      args,
      {
        cwd: root,
        stdio: "inherit",
        shell:
          process.platform ===
          "win32",
      },
    );

  if (
    result.error ||
    result.status !== 0
  ) {
    throw new Error(
      `${label} failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
}

function runVerifier(
  verifier,
  label,
) {
  const extension =
    path.extname(
      verifier,
    ).toLowerCase();

  if (
    extension === ".ts" ||
    extension === ".tsx"
  ) {
    run(
      "npx",
      [
        "tsx",
        path.join(
          "scripts",
          verifier,
        ),
      ],
      label,
    );
    return;
  }

  run(
    "node",
    [
      path.join(
        "scripts",
        verifier,
      ),
    ],
    label,
  );
}

const allFiles =
  await readdir(
    scriptsDir,
  );

const verifierFiles =
  allFiles
    .filter(
      (name) =>
        supportedExtensions.has(
          path.extname(
            name,
          ).toLowerCase(),
        ),
    )
    .filter(
      (name) =>
        name
          .toLowerCase()
          .startsWith(
            "verify-chernobog-phase11-",
          ),
    )
    .sort();

const selected = [];

for (const phase of phaseIds) {
  const candidates =
    verifierFiles.filter(
      (name) => {
        const lower =
          name.toLowerCase();

        return (
          lower.startsWith(
            `verify-chernobog-phase11-${phase}-`,
          ) ||
          lower.startsWith(
            `verify-chernobog-phase11-${phase}.`,
          )
        );
      },
    );

  if (
    candidates.length === 0
  ) {
    throw new Error(
      `No verifier found for ${phase.toUpperCase()}. Full Phase 11 acceptance requires 11A through 11J coverage.`,
    );
  }

  candidates.sort(
    (a, b) =>
      scoreVerifier(b) -
        scoreVerifier(a) ||
      b.localeCompare(a),
  );

  selected.push({
    phase:
      phase.toUpperCase(),
    verifier:
      candidates[0],
    discovered:
      candidates.length,
  });
}

console.log(
  "Chernobog Phase 11 - Full Acceptance Suite",
);
console.log(
  "==========================================",
);
console.log(
  `Repository: ${root}`,
);
console.log("");
console.log(
  "Selected strongest verifier per architecture block:",
);

for (const item of selected) {
  console.log(
    `- ${item.phase}: ${item.verifier} (${item.discovered} verifier(s) discovered)`,
  );
}

const startedAt =
  new Date();

for (const item of selected) {
  runVerifier(
    item.verifier,
    `${item.phase} acceptance`,
  );
}

runVerifier(
  "verify-chernobog-phase11-full-system-acceptance.ts",
  "Cross-phase full-system acceptance",
);

run(
  "npm",
  [
    "run",
    "typecheck",
  ],
  "Repository typecheck",
);

const packageJson =
  JSON.parse(
    await readFile(
      path.join(
        root,
        "package.json",
      ),
      "utf8",
    ),
  );

let buildRun = false;

if (
  packageJson.scripts &&
  typeof packageJson.scripts.build ===
    "string"
) {
  run(
    "npm",
    [
      "run",
      "build",
    ],
    "Production build",
  );

  buildRun = true;
}

const completedAt =
  new Date();

const report = {
  phase:
    "11",
  name:
    "Cognitive Architecture",
  status:
    "passed",
  startedAt:
    startedAt.toISOString(),
  completedAt:
    completedAt.toISOString(),
  selectedVerifiers:
    selected,
  crossPhaseVerifier:
    "scripts/verify-chernobog-phase11-full-system-acceptance.ts",
  typecheck:
    "passed",
  productionBuild:
    buildRun
      ? "passed"
      : "not-configured",
};

const reportDir =
  path.join(
    root,
    ".chernobog",
    "acceptance",
  );

await mkdir(
  reportDir,
  {
    recursive: true,
  },
);

const reportPath =
  path.join(
    reportDir,
    "phase11-latest.json",
  );

await writeFile(
  reportPath,
  `${JSON.stringify(
    report,
    null,
    2,
  )}\n`,
  "utf8",
);

console.log("");
console.log(
  "==========================================",
);
console.log(
  "PASS Phase 11 Cognitive Architecture COMPLETE",
);
console.log(
  `Acceptance report: ${path.relative(root, reportPath)}`,
);
