import type { VaultBrainCommandResult } from "./types";
import {
  answerVaultOnlyQuestion,
  formatVaultOnlyAnswerResult,
  getVaultOnlyAnswerPolicy,
} from "./vaultOnlyAnswerMode";

function normalize(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function stripQuestionPrefix(command: string): string | undefined {
  const patterns = [
    /^answer from vault only\s+(.+)$/i,
    /^ask vault only\s+(.+)$/i,
    /^vault only answer\s+(.+)$/i,
    /^vault-only answer\s+(.+)$/i,
    /^ask approved vault\s+(.+)$/i,
    /^ask structured vault\s+(.+)$/i,
    /^answer from approved memory\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    const question = match?.[1]?.trim();
    if (question) {
      return question;
    }
  }

  return undefined;
}

export function isVaultOnlyAnswerCommand(command: string): boolean {
  const normalized = normalize(command);

  return (
    /^show vault only answer policy$/i.test(normalized) ||
    /^show vault-only answer policy$/i.test(normalized) ||
    /^answer from vault only\s+.+$/i.test(normalized) ||
    /^ask vault only\s+.+$/i.test(normalized) ||
    /^vault only answer\s+.+$/i.test(normalized) ||
    /^vault-only answer\s+.+$/i.test(normalized) ||
    /^ask approved vault\s+.+$/i.test(normalized) ||
    /^ask structured vault\s+.+$/i.test(normalized) ||
    /^answer from approved memory\s+.+$/i.test(normalized)
  );
}

export async function executeVaultOnlyAnswerCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (/^show vault[-\s]?only answer policy$/i.test(normalized)) {
    const policy = getVaultOnlyAnswerPolicy();
    return {
      ok: true,
      title: "Vault-Only Answer Policy",
      message: [
        "Vault-only answer mode policy",
        `Approved only: ${policy.approvedOnly ? "yes" : "no"}`,
        `Candidate memory allowed: ${policy.allowCandidateMemory ? "yes" : "no"}`,
        `Raw memory allowed: ${policy.allowRawMemory ? "yes" : "no"}`,
        `Outside model memory allowed: ${policy.allowOutsideModelMemory ? "yes" : "no"}`,
        `Strict version: ${policy.strictVersion ? "yes" : "no"}`,
      ].join("\n"),
      data: policy,
    };
  }

  const question = stripQuestionPrefix(normalized);
  if (!question) {
    return {
      ok: false,
      title: "Vault-only answer command not recognized",
      message: [
        "Try one of these:",
        "- answer from vault only <question>",
        "- ask vault only <question>",
        "- ask approved vault <question>",
        "- show vault only answer policy",
      ].join("\n"),
    };
  }

  try {
    const result = await answerVaultOnlyQuestion({ query: question });
    return {
      ok: result.ok,
      title: result.ok ? "Vault-Only Answer" : "Insufficient Approved Vault Memory",
      message: formatVaultOnlyAnswerResult(result),
      data: result,
    };
  } catch (error) {
    return {
      ok: false,
      title: "Vault-only answer failed",
      message: error instanceof Error ? error.message : "Unknown vault-only answer error.",
    };
  }
}
