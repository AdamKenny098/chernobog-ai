import type { TrustActionRequest } from "./trustActionTypes";
import { TRUST_ACTION_TYPES, TRUST_RISK_LEVELS, normalizeTrustActionType } from "./trustActionTypes";
import { createTrustDecision, formatTrustDecision } from "./trustDecision";
import { createTrustPolicyStore, DEFAULT_TRUST_POLICY_MANIFEST } from "./trustPolicyManifest";
import { appendTrustAuditEvent, loadTrustAuditLog } from "./trustAuditLog";
import { listDefaultToolPermissions } from "./toolPermissionRegistry";
import type { VaultBrainCommandResult } from "./types";

function normalize(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function inferActionRequest(text: string): TrustActionRequest {
  const lower = text.toLowerCase();
  const actionType = lower.includes("delete") || lower.includes("remove") || lower.includes("wipe")
    ? "delete"
    : lower.includes("approve memory") || lower.includes("memory approval")
      ? "memory-approve"
      : lower.includes("memory") && (lower.includes("write") || lower.includes("edit") || lower.includes("correct"))
        ? "memory-write"
        : lower.includes("file") && (lower.includes("write") || lower.includes("patch") || lower.includes("move") || lower.includes("rename"))
          ? "file-write"
          : lower.includes("npm") || lower.includes("node") || lower.includes("command") || lower.includes("script")
            ? "project-command"
            : lower.includes("system") || lower.includes("powershell") || lower.includes("shell")
              ? "system-execute"
              : lower.includes("send") || lower.includes("email") || lower.includes("discord")
                ? "external-send"
                : lower.includes("file") && lower.includes("read")
                  ? "file-read"
                  : lower.includes("memory") && (lower.includes("read") || lower.includes("recall"))
                    ? "memory-read"
                    : normalizeTrustActionType(text);

  return {
    title: text,
    description: `Inferred from command text: ${text}`,
    actionType,
    target: text,
    actor: "chernobog-command",
  };
}

function formatPolicy(): string {
  const policy = DEFAULT_TRUST_POLICY_MANIFEST;
  const rules = policy.rules.map((rule) => [
    `- ${rule.id}: ${rule.title}`,
    `  Risk: ${rule.risk}`,
    rule.actionType ? `  Action: ${rule.actionType}` : undefined,
    rule.requestedTool ? `  Tool: ${rule.requestedTool}` : undefined,
    `  Reason: ${rule.reason}`,
  ].filter((line): line is string => typeof line === "string").join("\n"));

  return [
    `Version: ${policy.version}`,
    `Default risk: ${policy.defaultRisk}`,
    "",
    "Rules:",
    rules.join("\n\n"),
    "",
    "Forbidden target fragments:",
    policy.forbiddenTargets.map((target) => `- ${target}`).join("\n"),
  ].join("\n");
}

function formatRiskClasses(): string {
  return [
    "Action risk classes:",
    ...TRUST_RISK_LEVELS.map((risk) => `- ${risk}`),
    "",
    "Supported action types:",
    ...TRUST_ACTION_TYPES.map((type) => `- ${type}`),
  ].join("\n");
}

function formatToolPermissions(): string {
  return listDefaultToolPermissions()
    .map((permission) => [
      `- ${permission.toolId}: ${permission.title}`,
      `  Action: ${permission.actionType}`,
      `  Default risk: ${permission.defaultRisk}`,
      `  Description: ${permission.description}`,
    ].join("\n"))
    .join("\n\n");
}

function formatAuditLog(events: Awaited<ReturnType<typeof loadTrustAuditLog>>): string {
  if (events.length === 0) {
    return "No trust audit events recorded yet.";
  }

  return events.slice(-25).reverse().map((event) => [
    `- ${event.createdAt}: ${event.action}`,
    `  Decision: ${event.decision.status}`,
    `  Risk: ${event.decision.risk}`,
    `  Action: ${event.request.actionType}`,
    event.actor ? `  Actor: ${event.actor}` : undefined,
    event.note ? `  Note: ${event.note}` : undefined,
  ].filter((line): line is string => typeof line === "string").join("\n")).join("\n\n");
}

export function isGovernanceCommand(command: string): boolean {
  const normalized = normalize(command);

  return (
    /^show trust governance policy$/i.test(normalized) ||
    /^show trust policy$/i.test(normalized) ||
    /^show action risk classes$/i.test(normalized) ||
    /^show trust risk classes$/i.test(normalized) ||
    /^show tool permissions$/i.test(normalized) ||
    /^show trust tool permissions$/i.test(normalized) ||
    /^show trust audit log$/i.test(normalized) ||
    /^evaluate trust action\s+.+$/i.test(normalized) ||
    /^check trust for\s+.+$/i.test(normalized)
  );
}

export async function executeGovernanceCommand(command: string): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (/^show trust governance policy$/i.test(normalized) || /^show trust policy$/i.test(normalized)) {
    const store = createTrustPolicyStore();
    await store.ensureReady();

    return {
      ok: true,
      title: "Trust Governance Policy",
      message: formatPolicy(),
      data: DEFAULT_TRUST_POLICY_MANIFEST,
    };
  }

  if (/^show action risk classes$/i.test(normalized) || /^show trust risk classes$/i.test(normalized)) {
    return {
      ok: true,
      title: "Trust Risk Classes",
      message: formatRiskClasses(),
      data: { riskLevels: TRUST_RISK_LEVELS, actionTypes: TRUST_ACTION_TYPES },
    };
  }

  if (/^show tool permissions$/i.test(normalized) || /^show trust tool permissions$/i.test(normalized)) {
    const permissions = listDefaultToolPermissions();
    return {
      ok: true,
      title: "Tool Permission Defaults",
      message: formatToolPermissions(),
      data: permissions,
    };
  }

  if (/^show trust audit log$/i.test(normalized)) {
    const events = await loadTrustAuditLog();
    return {
      ok: true,
      title: "Trust Audit Log",
      message: formatAuditLog(events),
      data: events,
    };
  }

  const evaluateMatch = normalized.match(/^evaluate trust action\s+(.+)$/i) ?? normalized.match(/^check trust for\s+(.+)$/i);
  if (evaluateMatch?.[1]) {
    const request = inferActionRequest(evaluateMatch[1]);
    const decision = createTrustDecision(request);
    await appendTrustAuditEvent({
      action: decision.status === "blocked" ? "blocked" : decision.status === "notice" ? "notice" : "evaluated",
      request,
      decision,
      actor: "chernobog-command",
      note: "Trust action evaluated through V5.7 governance command.",
    });

    return {
      ok: decision.status !== "blocked",
      title: "Trust Decision",
      message: formatTrustDecision(decision),
      data: decision,
    };
  }

  return {
    ok: false,
    title: "Unknown governance command",
    message: `The command was recognized as governance-related but no handler matched it: ${normalized}`,
  };
}
