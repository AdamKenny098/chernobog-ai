import fs from "node:fs";
import path from "node:path";
import type {
  V6ReadinessArea,
  V6ReadinessCheck,
  V6ReadinessReport,
  V6ReadinessReportOptions,
  V6ReadinessSummary,
} from "./v6ReadinessTypes";

const REQUIRED_FILES: Array<{ path: string; area: V6ReadinessArea; title: string }> = [
  { path: "lib/modules/vault-brain/memoryTypes.ts", area: "structured-memory", title: "Memory types exist" },
  { path: "lib/modules/vault-brain/memoryStatus.ts", area: "structured-memory", title: "Memory statuses exist" },
  { path: "lib/modules/vault-brain/memoryStore.ts", area: "structured-memory", title: "Structured memory store exists" },
  { path: "lib/modules/vault-brain/structuredRecall.ts", area: "recall-answering", title: "Approved structured recall exists" },
  { path: "lib/modules/vault-brain/vaultOnlyAnswerMode.ts", area: "recall-answering", title: "Vault-only answer mode exists" },
  { path: "lib/modules/vault-brain/projectProfileStore.ts", area: "project-state", title: "Project profile store exists" },
  { path: "lib/modules/vault-brain/projectMemoryScope.ts", area: "project-state", title: "Project memory scope resolver exists" },
  { path: "lib/modules/vault-brain/memoryReview.ts", area: "structured-memory", title: "Memory review flow exists" },
  { path: "lib/modules/vault-brain/memoryCorrections.ts", area: "structured-memory", title: "Memory correction audit exists" },
  { path: "lib/modules/vault-brain/codeSummaryMemory.ts", area: "code-summary", title: "Source code summary memory exists" },
  { path: "lib/modules/vault-brain/currentStateBriefing.ts", area: "briefing", title: "Current state briefing exists" },
  { path: "lib/modules/vault-brain/trustActionTypes.ts", area: "governance", title: "Trust action types exist" },
  { path: "lib/modules/vault-brain/trustDecision.ts", area: "governance", title: "Trust decision evaluator exists" },
  { path: "lib/modules/vault-brain/chernobogIncFoundation.ts", area: "inc-foundation", title: "Chernobog Inc foundation exists" },
  { path: "lib/modules/vault-brain/chernobogIncProposals.ts", area: "inc-foundation", title: "Chernobog Inc proposal store exists" },
  { path: "lib/modules/vault-brain/chernobogMissionTypes.ts", area: "missions", title: "Mission types exist" },
  { path: "lib/modules/vault-brain/chernobogMissionStore.ts", area: "missions", title: "Mission store exists" },
  { path: "lib/modules/vault-brain/controlledExecutionTypes.ts", area: "controlled-execution", title: "Controlled execution types exist" },
  { path: "lib/modules/vault-brain/controlledExecutionStore.ts", area: "controlled-execution", title: "Controlled execution store exists" },
  { path: "lib/modules/vault-brain/commands.ts", area: "command-bridge", title: "Vault brain command bridge exists" },
  { path: "lib/modules/vault-brain/index.ts", area: "command-bridge", title: "Vault brain export bridge exists" },
];

const REQUIRED_API_ROUTES = [
  "app/api/vault/recall/route.ts",
  "app/api/vault/answer/route.ts",
  "app/api/vault/briefing/route.ts",
  "app/api/governance/trust/evaluate/route.ts",
  "app/api/chernobog-inc/structure/route.ts",
  "app/api/chernobog-inc/proposals/route.ts",
  "app/api/chernobog-inc/missions/route.ts",
  "app/api/chernobog-inc/missions/checkpoint/route.ts",
  "app/api/chernobog-inc/missions/status/route.ts",
  "app/api/chernobog-inc/execution/plans/route.ts",
  "app/api/chernobog-inc/execution/checkpoint/route.ts",
  "app/api/chernobog-inc/execution/dry-run/route.ts",
  "app/api/chernobog-inc/readiness/route.ts",
];

const COMMAND_BRIDGE_REQUIREMENTS = [
  { name: "structured memory commands", detector: "isStructuredMemoryCommand", executor: "executeStructuredMemoryCommand" },
  { name: "project memory profile commands", detector: "isProjectMemoryProfileCommand", executor: "executeProjectMemoryProfileCommand" },
  { name: "vault-only answer commands", detector: "isVaultOnlyAnswerCommand", executor: "executeVaultOnlyAnswerCommand" },
  { name: "memory correction commands", detector: "isMemoryCorrectionCommand", executor: "executeMemoryCorrectionCommand" },
  { name: "code-summary commands", detector: "isCodeSummaryMemoryCommand", executor: "executeCodeSummaryMemoryCommand" },
  { name: "current state briefing commands", detector: "isCurrentStateBriefingCommand", executor: "executeCurrentStateBriefingCommand" },
  { name: "governance commands", detector: "isGovernanceCommand", executor: "executeGovernanceCommand" },
  { name: "Chernobog Inc commands", detector: "isChernobogIncCommand", executor: "executeChernobogIncCommand" },
  { name: "mission commands", detector: "isChernobogMissionCommand", executor: "executeChernobogMissionCommand" },
  { name: "controlled execution commands", detector: "isControlledExecutionCommand", executor: "executeControlledExecutionCommand" },
  { name: "V6 readiness commands", detector: "isV6ReadinessCommand", executor: "executeV6ReadinessCommand" },
];

const INDEX_EXPORT_REQUIREMENTS = [
  "memoryTypes",
  "memoryStatus",
  "memoryStore",
  "structuredRecall",
  "vaultOnlyAnswerMode",
  "projectProfileStore",
  "memoryReview",
  "memoryCorrections",
  "codeSummaryMemory",
  "currentStateBriefing",
  "trustDecision",
  "chernobogIncFoundation",
  "chernobogMissionStore",
  "controlledExecutionStore",
  "v6ReadinessReport",
];

const PACKAGE_SCRIPT_REQUIREMENTS = [
  "chernobog:v5.6.2:verify",
  "chernobog:v5.6.3:verify",
  "chernobog:v5.6.4:verify",
  "chernobog:v5.6.5:verify",
  "chernobog:v5.6.6:verify",
  "chernobog:v5.6.7:verify",
  "chernobog:v5.6.8:verify",
  "chernobog:v5.6.9:verify",
  "chernobog:v5.7:verify",
  "chernobog:v5.8:verify",
  "chernobog:v5.9:verify",
  "chernobog:v5.9.5:verify",
  "chernobog:v5.9.6:verify",
];

function resolveRoot(rootDir: string | undefined): string {
  return path.resolve(rootDir ?? process.cwd());
}

function readText(rootDir: string, relativePath: string): string | undefined {
  const fullPath = path.join(rootDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    return undefined;
  }

  return fs.readFileSync(fullPath, "utf8");
}

function fileExists(rootDir: string, relativePath: string): boolean {
  return fs.existsSync(path.join(rootDir, relativePath));
}

function check(args: {
  id: string;
  area: V6ReadinessArea;
  title: string;
  status: V6ReadinessCheck["status"];
  required?: boolean;
  details: string;
  remediation?: string;
}): V6ReadinessCheck {
  return {
    required: args.required ?? true,
    ...args,
  };
}

function summarize(checks: V6ReadinessCheck[]): V6ReadinessSummary {
  const pass = checks.filter((item) => item.status === "pass").length;
  const warn = checks.filter((item) => item.status === "warn").length;
  const fail = checks.filter((item) => item.status === "fail").length;
  return {
    total: checks.length,
    pass,
    warn,
    fail,
    requiredFailures: checks.filter((item) => item.required && item.status === "fail").length,
    optionalWarnings: checks.filter((item) => !item.required && item.status === "warn").length,
  };
}

function addRequiredFileChecks(rootDir: string, checks: V6ReadinessCheck[]): void {
  for (const file of REQUIRED_FILES) {
    const exists = fileExists(rootDir, file.path);
    checks.push(check({
      id: `file:${file.path}`,
      area: file.area,
      title: file.title,
      status: exists ? "pass" : "fail",
      details: exists ? `${file.path} exists.` : `${file.path} is missing.`,
      remediation: exists ? undefined : `Restore or apply the milestone that provides ${file.path}.`,
    }));
  }
}

function addApiRouteChecks(rootDir: string, checks: V6ReadinessCheck[]): void {
  for (const route of REQUIRED_API_ROUTES) {
    const source = readText(rootDir, route);
    const ok = Boolean(source && source.includes("NextResponse") && (source.includes("export async function GET") || source.includes("export async function POST")));
    checks.push(check({
      id: `api:${route}`,
      area: "api-routes",
      title: `API route exists: ${route}`,
      status: ok ? "pass" : "fail",
      details: ok ? `${route} exists and exports a route handler.` : `${route} is missing or does not look like a Next route handler.`,
      remediation: ok ? undefined : `Restore ${route} from the relevant milestone package.`,
    }));
  }
}

function addCommandBridgeChecks(rootDir: string, checks: V6ReadinessCheck[]): void {
  const source = readText(rootDir, "lib/modules/vault-brain/commands.ts") ?? "";

  for (const requirement of COMMAND_BRIDGE_REQUIREMENTS) {
    const hasDetector = source.includes(requirement.detector);
    const hasExecutor = source.includes(requirement.executor);
    checks.push(check({
      id: `command:${requirement.detector}`,
      area: "command-bridge",
      title: `Command bridge routes ${requirement.name}`,
      status: hasDetector && hasExecutor ? "pass" : "fail",
      details: hasDetector && hasExecutor
        ? `commands.ts references ${requirement.detector} and ${requirement.executor}.`
        : `commands.ts is missing ${!hasDetector ? requirement.detector : requirement.executor}.`,
      remediation: hasDetector && hasExecutor
        ? undefined
        : "Re-run the relevant milestone apply script, or patch commands.ts to import and route the missing command module.",
    }));
  }
}

function addIndexExportChecks(rootDir: string, checks: V6ReadinessCheck[]): void {
  const source = readText(rootDir, "lib/modules/vault-brain/index.ts") ?? "";

  for (const moduleName of INDEX_EXPORT_REQUIREMENTS) {
    const hasExport = source.includes(`./${moduleName}`);
    checks.push(check({
      id: `index-export:${moduleName}`,
      area: "command-bridge",
      title: `Index exports ${moduleName}`,
      status: hasExport ? "pass" : "fail",
      details: hasExport ? `index.ts exports ${moduleName}.` : `index.ts does not export ${moduleName}.`,
      remediation: hasExport ? undefined : `Add export * from "./${moduleName}"; to lib/modules/vault-brain/index.ts.`,
    }));
  }
}

function addBoundaryChecks(rootDir: string, checks: V6ReadinessCheck[]): void {
  const controlledTypes = readText(rootDir, "lib/modules/vault-brain/controlledExecutionTypes.ts") ?? "";
  const missionTypes = readText(rootDir, "lib/modules/vault-brain/chernobogMissionTypes.ts") ?? "";
  const incFoundation = readText(rootDir, "lib/modules/vault-brain/chernobogIncFoundation.ts") ?? "";
  const vaultOnly = readText(rootDir, "lib/modules/vault-brain/vaultOnlyAnswerMode.ts") ?? "";
  const briefing = readText(rootDir, "lib/modules/vault-brain/currentStateBriefing.ts") ?? "";

  const boundaryChecks: Array<{
    id: string;
    area: V6ReadinessArea;
    title: string;
    source: string;
    requiredFragments: string[];
    remediation: string;
  }> = [
    {
      id: "boundary:controlled-execution-no-tools",
      area: "controlled-execution",
      title: "Controlled execution still blocks tool/autonomous execution",
      source: controlledTypes,
      requiredFragments: ["executionAllowed: false", "toolExecutionAllowed: false", "autonomousExecutionAllowed: false", "dryRunOnly: true"],
      remediation: "Restore V5.9.5 controlled execution boundary fields as literal false values.",
    },
    {
      id: "boundary:missions-status-flow",
      area: "missions",
      title: "Mission status flow exists",
      source: missionTypes,
      requiredFragments: ["proposed", "approved", "in_progress", "needs_review", "completed", "rejected"],
      remediation: "Restore mission status definitions from V5.9.",
    },
    {
      id: "boundary:inc-roles-no-tools",
      area: "inc-foundation",
      title: "Chernobog Inc roles remain non-executing",
      source: incFoundation,
      requiredFragments: ["mayExecuteTools: false"],
      remediation: "Restore V5.8 role boundary: roles may not execute tools.",
    },
    {
      id: "boundary:vault-only-approved-memory",
      area: "recall-answering",
      title: "Vault-only answer mode remains approved-only",
      source: vaultOnly,
      requiredFragments: ["approvedOnly: true", "allowRawMemory: false", "allowCandidateMemory: false", "allowOutsideModelMemory: false"],
      remediation: "Restore V5.6.6 vault-only answer policy boundaries.",
    },
    {
      id: "boundary:briefing-approved-only",
      area: "briefing",
      title: "Current state briefings remain approved-only",
      source: briefing,
      requiredFragments: ["approvedOnly: true", "allowRawMemory: false", "allowCandidateMemory: false", "allowOutsideModelMemory: false"],
      remediation: "Restore V5.6.9 briefing policy boundaries.",
    },
  ];

  for (const boundary of boundaryChecks) {
    const missing = boundary.requiredFragments.filter((fragment) => !boundary.source.includes(fragment));
    checks.push(check({
      id: boundary.id,
      area: boundary.area,
      title: boundary.title,
      status: missing.length === 0 ? "pass" : "fail",
      details: missing.length === 0
        ? "Required boundary fragments are present."
        : `Missing boundary fragment(s): ${missing.join(", ")}.`,
      remediation: missing.length === 0 ? undefined : boundary.remediation,
    }));
  }
}

function addPackageScriptChecks(rootDir: string, checks: V6ReadinessCheck[], enabled: boolean): void {
  if (!enabled) {
    checks.push(check({
      id: "package-scripts:skipped",
      area: "package-scripts",
      title: "Package script checks skipped",
      status: "warn",
      required: false,
      details: "Package script checks were not requested.",
    }));
    return;
  }

  const packageJson = readText(rootDir, "package.json");
  if (!packageJson) {
    checks.push(check({
      id: "package-scripts:package-json",
      area: "package-scripts",
      title: "package.json exists",
      status: "fail",
      details: "package.json is missing.",
      remediation: "Run from the repository root.",
    }));
    return;
  }

  let scripts: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(packageJson) as { scripts?: Record<string, unknown> };
    scripts = parsed.scripts ?? {};
  } catch {
    checks.push(check({
      id: "package-scripts:parse",
      area: "package-scripts",
      title: "package.json parses",
      status: "fail",
      details: "package.json could not be parsed as JSON.",
      remediation: "Fix package.json syntax.",
    }));
    return;
  }

  for (const scriptName of PACKAGE_SCRIPT_REQUIREMENTS) {
    const exists = typeof scripts[scriptName] === "string";
    checks.push(check({
      id: `package-script:${scriptName}`,
      area: "package-scripts",
      title: `package script exists: ${scriptName}`,
      status: exists ? "pass" : "warn",
      required: scriptName === "chernobog:v5.9.6:verify",
      details: exists ? `${scriptName} exists.` : `${scriptName} is not present in package.json scripts.`,
      remediation: exists ? undefined : `Add ${scriptName} if you want one-command milestone verification.`,
    }));
  }
}

export function generateV6ReadinessReport(
  options: V6ReadinessReportOptions = {}
): V6ReadinessReport {
  const rootDir = resolveRoot(options.rootDir);
  const checks: V6ReadinessCheck[] = [];

  addRequiredFileChecks(rootDir, checks);
  addApiRouteChecks(rootDir, checks);
  addCommandBridgeChecks(rootDir, checks);
  addIndexExportChecks(rootDir, checks);
  addBoundaryChecks(rootDir, checks);
  addPackageScriptChecks(rootDir, checks, options.includePackageScriptChecks ?? true);

  const summary = summarize(checks);
  const failures = checks.filter((item) => item.status === "fail");
  const warnings = checks.filter((item) => item.status === "warn");

  return {
    ok: summary.requiredFailures === 0,
    version: "v5.9.6",
    title: "V6 Readiness & Integration Hardening",
    generatedAt: new Date().toISOString(),
    rootDir,
    summary,
    checks,
    failures,
    warnings,
    nextRecommendedMilestone: "V6.0 — Chernobog Personal Intelligence System",
    boundary: {
      addsNewCapabilities: false,
      executesTools: false,
      executesMissions: false,
      allowsAutonomy: false,
      readinessOnly: true,
    },
  };
}

function lineForCheck(check: V6ReadinessCheck): string {
  const label = check.status.toUpperCase().padEnd(4, " ");
  return `${label} ${check.area} — ${check.title}\n     ${check.details}${check.remediation ? `\n     Fix: ${check.remediation}` : ""}`;
}

export function formatV6ReadinessReport(report: V6ReadinessReport): string {
  const header = [
    "Chernobog V5.9.6 — V6 Readiness Report",
    `Generated: ${report.generatedAt}`,
    `Root: ${report.rootDir}`,
    `Status: ${report.ok ? "READY" : "NOT READY"}`,
    `Checks: ${report.summary.pass} passed, ${report.summary.warn} warning(s), ${report.summary.fail} failed`,
    "",
    "Boundary:",
    "- Readiness only: yes",
    "- Adds new capabilities: no",
    "- Executes tools: no",
    "- Executes missions: no",
    "- Allows autonomy: no",
    "",
  ];

  const failures = report.failures.length > 0
    ? ["Required failures:", ...report.failures.map(lineForCheck), ""]
    : ["Required failures: none", ""];

  const warnings = report.warnings.length > 0
    ? ["Warnings:", ...report.warnings.map(lineForCheck), ""]
    : ["Warnings: none", ""];

  const allChecks = ["All checks:", ...report.checks.map(lineForCheck), ""];

  return [
    ...header,
    ...failures,
    ...warnings,
    ...allChecks,
    `Next recommended milestone: ${report.nextRecommendedMilestone}`,
  ].join("\n");
}

export function writeV6ReadinessReportFile(
  report: V6ReadinessReport,
  rootDir = process.cwd()
): string {
  const outDir = path.join(rootDir, "vault", "chernobog", "system", "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "v6-readiness-report.md");
  fs.writeFileSync(outPath, `${formatV6ReadinessReport(report)}\n`, "utf8");
  return outPath;
}
