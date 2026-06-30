import type { VaultBrainCommandResult } from "./types";
import {
  createV6OperatingPacket,
  formatV6OperatingPacket,
  formatV6SystemStatus,
  getV6PersonalIntelligenceSystemStatus,
  V6_PERSONAL_INTELLIGENCE_BOUNDARY,
} from "./personalIntelligenceOperatingLoop";

function normalize(command: string): string {
  return command.trim().replace(/\s+/g, " ");
}

function extractPacketRequest(command: string): string | undefined {
  const patterns = [
    /^create v6 operating packet\s+(.+)$/i,
    /^build v6 operating packet\s+(.+)$/i,
    /^run v6 operating loop\s+(.+)$/i,
    /^v6 operating loop\s+(.+)$/i,
    /^ceo direction\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = command.match(pattern);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }

  return undefined;
}

export function isV6PersonalIntelligenceCommand(command: string): boolean {
  const normalized = normalize(command);
  return (
    /^show chernobog personal intelligence system$/i.test(normalized) ||
    /^show v6 personal intelligence system$/i.test(normalized) ||
    /^show v6 system$/i.test(normalized) ||
    /^show v6 system status$/i.test(normalized) ||
    /^show ceo command center$/i.test(normalized) ||
    /^show v6 operating loop$/i.test(normalized) ||
    /^show v6 safety policy$/i.test(normalized) ||
    /^show v6 personal intelligence policy$/i.test(normalized) ||
    /^create v6 operating packet\s+.+$/i.test(normalized) ||
    /^build v6 operating packet\s+.+$/i.test(normalized) ||
    /^run v6 operating loop\s+.+$/i.test(normalized) ||
    /^v6 operating loop\s+.+$/i.test(normalized) ||
    /^ceo direction\s+.+$/i.test(normalized)
  );
}

function formatV6Policy(): string {
  return [
    "V6.0 — Chernobog Personal Intelligence System Policy",
    "",
    "Chernobog operates as a CEO-directed Executive Core.",
    "Approved vault memory is the source of truth for project history.",
    "Departments and workers plan/report; they do not freely execute tools.",
    "Missions require approval checkpoints.",
    "Controlled execution remains dry-run/report only unless a later explicit milestone enables execution.",
    "Raw memory cannot become approved truth automatically.",
    "Free-roaming autonomous agents are not enabled in V6.0.",
    "",
    `Tool execution requires future milestone: ${V6_PERSONAL_INTELLIGENCE_BOUNDARY.toolExecutionRequiresFutureMilestone ? "yes" : "no"}`,
    `Autonomous execution allowed: ${V6_PERSONAL_INTELLIGENCE_BOUNDARY.autonomousExecutionAllowed ? "yes" : "no"}`,
    `Free-roaming agents allowed: ${V6_PERSONAL_INTELLIGENCE_BOUNDARY.freeRoamingAgentsAllowed ? "yes" : "no"}`,
  ].join("\n");
}

function formatOperatingLoop(): string {
  const status = getV6PersonalIntelligenceSystemStatus();
  return [
    "V6.0 Operating Loop",
    "",
    ...status.coreLoop.map((phase, index) => `${index + 1}. ${phase}`),
    "",
    "This loop creates governed proposals, reports, and dry-run plans. It does not execute tools by itself.",
  ].join("\n");
}

export async function executeV6PersonalIntelligenceCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (
    /^show v6 safety policy$/i.test(normalized) ||
    /^show v6 personal intelligence policy$/i.test(normalized)
  ) {
    return {
      ok: true,
      title: "V6 Personal Intelligence Policy",
      message: formatV6Policy(),
      data: {
        boundary: V6_PERSONAL_INTELLIGENCE_BOUNDARY,
      },
    };
  }

  if (/^show v6 operating loop$/i.test(normalized)) {
    return {
      ok: true,
      title: "V6 Operating Loop",
      message: formatOperatingLoop(),
      data: {
        status: getV6PersonalIntelligenceSystemStatus(),
      },
    };
  }

  const packetRequest = extractPacketRequest(normalized);
  if (packetRequest) {
    const packet = createV6OperatingPacket({
      request: packetRequest,
      projectId: "chernobog",
      version: "v6.0",
      createdBy: "ceo",
    });

    return {
      ok: packet.governanceDecision.status !== "blocked",
      title: "V6 Operating Packet",
      message: formatV6OperatingPacket(packet),
      data: {
        packet,
      },
    };
  }

  const status = getV6PersonalIntelligenceSystemStatus();
  return {
    ok: status.ok,
    title: status.ok ? "Chernobog V6 System Ready" : "Chernobog V6 System Not Ready",
    message: formatV6SystemStatus(status),
    data: {
      status,
    },
  };
}
