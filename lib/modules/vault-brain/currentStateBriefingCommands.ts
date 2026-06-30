import type { VaultBrainCommandResult } from "./types";
import {
  formatCurrentStateBriefing,
  generateCurrentStateBriefing,
  getCurrentStateBriefingPolicy,
} from "./currentStateBriefing";

function normalize(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function stripProjectTarget(command: string): string | undefined {
  const patterns = [
    /^brief me on\s+(.+)$/i,
    /^generate project briefing\s+(.+)$/i,
    /^show project briefing\s+(.+)$/i,
    /^project briefing\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    const value = match?.[1]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

function stripVersionTarget(command: string): string | undefined {
  const patterns = [
    /^show version briefing\s+(.+)$/i,
    /^generate version briefing\s+(.+)$/i,
    /^version briefing\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    const value = match?.[1]?.trim();
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function isCurrentStateBriefingCommand(command: string): boolean {
  const normalized = normalize(command);

  return (
    /^show current state briefing$/i.test(normalized) ||
    /^generate current state briefing$/i.test(normalized) ||
    /^generate current milestone briefing$/i.test(normalized) ||
    /^show current milestone briefing$/i.test(normalized) ||
    /^brief me$/i.test(normalized) ||
    /^brief me on\s+.+$/i.test(normalized) ||
    /^generate project briefing\s+.+$/i.test(normalized) ||
    /^show project briefing\s+.+$/i.test(normalized) ||
    /^project briefing\s+.+$/i.test(normalized) ||
    /^show version briefing\s+.+$/i.test(normalized) ||
    /^generate version briefing\s+.+$/i.test(normalized) ||
    /^version briefing\s+.+$/i.test(normalized) ||
    /^show briefing policy$/i.test(normalized) ||
    /^show current state briefing policy$/i.test(normalized)
  );
}

export async function executeCurrentStateBriefingCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (/^show (current state )?briefing policy$/i.test(normalized)) {
    const policy = getCurrentStateBriefingPolicy();
    return {
      ok: true,
      title: "Current State Briefing Policy",
      message: [
        "Current state briefing policy",
        `Approved only: ${policy.approvedOnly ? "yes" : "no"}`,
        `Raw memory allowed: ${policy.allowRawMemory ? "yes" : "no"}`,
        `Candidate memory allowed: ${policy.allowCandidateMemory ? "yes" : "no"}`,
        `Reviewed memory allowed: ${policy.allowReviewedMemory ? "yes" : "no"}`,
        `Outside model memory allowed: ${policy.allowOutsideModelMemory ? "yes" : "no"}`,
      ].join("\n"),
      data: policy,
    };
  }

  const projectTarget = stripProjectTarget(normalized);
  const versionTarget = stripVersionTarget(normalized);

  try {
    const result = await generateCurrentStateBriefing({
      query: normalized,
      projectId: projectTarget,
      version: versionTarget,
    });

    return {
      ok: result.ok,
      title: result.ok ? "Current State Briefing" : "Current State Briefing Incomplete",
      message: formatCurrentStateBriefing(result),
      data: result,
    };
  } catch (error) {
    return {
      ok: false,
      title: "Current state briefing failed",
      message: error instanceof Error ? error.message : "Unknown current state briefing error.",
    };
  }
}
