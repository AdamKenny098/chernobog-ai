export const V6_READINESS_CHECK_STATUSES = ["pass", "warn", "fail"] as const;

export type V6ReadinessCheckStatus =
  (typeof V6_READINESS_CHECK_STATUSES)[number];

export const V6_READINESS_AREAS = [
  "structured-memory",
  "recall-answering",
  "project-state",
  "code-summary",
  "briefing",
  "governance",
  "inc-foundation",
  "missions",
  "controlled-execution",
  "command-bridge",
  "api-routes",
  "package-scripts",
  "v6-readiness",
] as const;

export type V6ReadinessArea = (typeof V6_READINESS_AREAS)[number];

export type V6ReadinessCheck = {
  id: string;
  area: V6ReadinessArea;
  title: string;
  status: V6ReadinessCheckStatus;
  required: boolean;
  details: string;
  remediation?: string;
};

export type V6ReadinessSummary = {
  total: number;
  pass: number;
  warn: number;
  fail: number;
  requiredFailures: number;
  optionalWarnings: number;
};

export type V6ReadinessReport = {
  ok: boolean;
  version: "v5.9.6";
  title: "V6 Readiness & Integration Hardening";
  generatedAt: string;
  rootDir: string;
  summary: V6ReadinessSummary;
  checks: V6ReadinessCheck[];
  failures: V6ReadinessCheck[];
  warnings: V6ReadinessCheck[];
  nextRecommendedMilestone: "V6.0 — Chernobog Personal Intelligence System";
  boundary: {
    addsNewCapabilities: false;
    executesTools: false;
    executesMissions: false;
    allowsAutonomy: false;
    readinessOnly: true;
  };
};

export type V6ReadinessReportOptions = {
  rootDir?: string;
  includePackageScriptChecks?: boolean;
};
