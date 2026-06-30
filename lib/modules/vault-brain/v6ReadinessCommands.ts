import type { VaultBrainCommandResult } from "./types";
import {
  formatV6ReadinessReport,
  generateV6ReadinessReport,
  writeV6ReadinessReportFile,
} from "./v6ReadinessReport";

function normalize(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function wantsPersistedReport(command: string): boolean {
  return /\b(write|save|persist)\b/i.test(command);
}

export function isV6ReadinessCommand(command: string): boolean {
  const normalized = normalize(command);
  return (
    /^show v6 readiness$/i.test(normalized) ||
    /^show v6 readiness report$/i.test(normalized) ||
    /^generate v6 readiness report$/i.test(normalized) ||
    /^write v6 readiness report$/i.test(normalized) ||
    /^save v6 readiness report$/i.test(normalized) ||
    /^show integration hardening status$/i.test(normalized) ||
    /^show v6 integration status$/i.test(normalized) ||
    /^show v6 readiness policy$/i.test(normalized)
  );
}

function formatPolicy(): string {
  return [
    "V5.9.6 — V6 Readiness & Integration Hardening Policy",
    "",
    "This milestone is verification and reporting only.",
    "It does not add new assistant capabilities.",
    "It does not execute tools.",
    "It does not execute missions.",
    "It does not enable autonomous action.",
    "It checks whether the V5.6 → V5.9.5 stack is coherent enough to proceed to V6.0.",
  ].join("\n");
}

export async function executeV6ReadinessCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (/^show v6 readiness policy$/i.test(normalized)) {
    return {
      ok: true,
      title: "V6 Readiness Policy",
      message: formatPolicy(),
      data: {
        readinessOnly: true,
        addsNewCapabilities: false,
        executesTools: false,
        executesMissions: false,
        allowsAutonomy: false,
      },
    };
  }

  const report = generateV6ReadinessReport();
  let writtenPath: string | undefined;
  if (wantsPersistedReport(normalized)) {
    writtenPath = writeV6ReadinessReportFile(report);
  }

  const message = writtenPath
    ? `${formatV6ReadinessReport(report)}\n\nSaved report: ${writtenPath}`
    : formatV6ReadinessReport(report);

  return {
    ok: report.ok,
    title: report.ok ? "V6 Readiness Passed" : "V6 Readiness Failed",
    message,
    data: {
      report,
      writtenPath,
    },
  };
}
