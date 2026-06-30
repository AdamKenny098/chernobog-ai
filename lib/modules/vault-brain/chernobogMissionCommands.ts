import { formatChernobogDepartmentWorkers, getChernobogDepartmentWorkerProfile } from "./chernobogDepartmentWorkers";
import {
  approveChernobogMissionCheckpoint,
  createChernobogMission,
  formatChernobogMission,
  formatChernobogMissionList,
  getChernobogMissionById,
  getChernobogMissionStoreSnapshot,
  readChernobogMissionAuditLog,
  readChernobogMissions,
  rejectChernobogMissionCheckpoint,
  requiredMissionCheckpointsApproved,
  updateChernobogMissionStatus,
} from "./chernobogMissionStore";
import { CHERNOBOG_INC_DEPARTMENTS, CHERNOBOG_MISSION_STATUSES } from "./chernobogMissionTypes";
import { VaultBrainCommandResult } from "./types";

function normalize(command: string) {
  return command.trim().replace(/\s+/g, " ");
}

function parseMissionDraft(command: string) {
  const match = command.match(/^(?:create|draft|propose)\s+(?:chernobog\s+inc\s+)?mission\s+(.+?)\s+::\s+(.+)$/i);
  if (!match) {
    return undefined;
  }

  const title = match[1].trim();
  const rest = match[2].trim();
  const departmentMatch = rest.match(/\s+departments?:\s+(.+)$/i);
  const versionMatch = rest.match(/\s+version:\s+([^;]+)$/i);
  const priorityMatch = rest.match(/\s+priority:\s+([^;]+)$/i);

  const objective = rest
    .replace(/\s+departments?:\s+.+$/i, "")
    .replace(/\s+version:\s+[^;]+$/i, "")
    .replace(/\s+priority:\s+[^;]+$/i, "")
    .trim();

  const departments = departmentMatch?.[1]
    .split(/[,;]/)
    .map((department) => department.trim())
    .filter(Boolean);

  return {
    title,
    objective,
    departments,
    version: versionMatch?.[1].trim(),
    priority: priorityMatch?.[1].trim(),
  };
}

function parseMissionId(command: string, pattern: RegExp) {
  const match = command.match(pattern);
  return match?.[1]?.trim();
}

export function isChernobogMissionCommand(command: string) {
  const normalized = normalize(command);
  return (
    /^show\s+(?:chernobog\s+inc\s+)?mission\s+system$/i.test(normalized) ||
    /^show\s+(?:chernobog\s+inc\s+)?missions$/i.test(normalized) ||
    /^show\s+(?:chernobog\s+inc\s+)?mission\s+audit\s+log$/i.test(normalized) ||
    /^show\s+(?:chernobog\s+inc\s+)?department\s+workers$/i.test(normalized) ||
    /^show\s+(?:chernobog\s+inc\s+)?mission\s+workers$/i.test(normalized) ||
    /^show\s+worker\s+role\s+.+$/i.test(normalized) ||
    /^show\s+(?:chernobog\s+inc\s+)?mission\s+mission-/i.test(normalized) ||
    /^(?:create|draft|propose)\s+(?:chernobog\s+inc\s+)?mission\s+.+?\s+::\s+.+$/i.test(normalized) ||
    /^approve\s+mission\s+checkpoint\s+mission-\S+\s+\S+$/i.test(normalized) ||
    /^reject\s+mission\s+checkpoint\s+mission-\S+\s+\S+$/i.test(normalized) ||
    /^approve\s+mission\s+mission-\S+$/i.test(normalized) ||
    /^start\s+mission\s+mission-\S+$/i.test(normalized) ||
    /^block\s+mission\s+mission-\S+$/i.test(normalized) ||
    /^mark\s+mission\s+needs\s+review\s+mission-\S+$/i.test(normalized) ||
    /^complete\s+mission\s+mission-\S+$/i.test(normalized) ||
    /^reject\s+mission\s+mission-\S+$/i.test(normalized)
  );
}

function missionSystemMessage() {
  return [
    "Chernobog Inc Mission System",
    "",
    "Mission statuses:",
    `- ${CHERNOBOG_MISSION_STATUSES.join("\n- ")}`,
    "",
    "Departments:",
    `- ${CHERNOBOG_INC_DEPARTMENTS.join("\n- ")}`,
    "",
    "Boundary:",
    "- Missions are controlled records, not autonomous agents.",
    "- Worker roles can plan and report only.",
    "- Tool execution remains blocked by default.",
    "- Required checkpoints must be approved before a proposed mission can become approved.",
  ].join("\n");
}

function formatAuditLog(events: Awaited<ReturnType<typeof readChernobogMissionAuditLog>>) {
  if (events.length === 0) {
    return "No mission audit events found.";
  }

  return events
    .slice(-25)
    .map((event) => `- ${event.createdAt} | ${event.action} | ${event.missionId ?? "system"} | ${event.summary}`)
    .join("\n");
}

export async function executeChernobogMissionCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (/^show\s+(?:chernobog\s+inc\s+)?mission\s+system$/i.test(normalized)) {
    return {
      ok: true,
      title: "Chernobog Inc Mission System",
      message: missionSystemMessage(),
    };
  }

  if (/^show\s+(?:chernobog\s+inc\s+)?missions$/i.test(normalized)) {
    const missions = await readChernobogMissions();
    return {
      ok: true,
      title: "Chernobog Inc Missions",
      message: formatChernobogMissionList(missions),
      data: missions,
    };
  }

  if (/^show\s+(?:chernobog\s+inc\s+)?mission\s+audit\s+log$/i.test(normalized)) {
    const auditLog = await readChernobogMissionAuditLog();
    return {
      ok: true,
      title: "Chernobog Inc Mission Audit Log",
      message: formatAuditLog(auditLog),
      data: auditLog,
    };
  }

  if (
    /^show\s+(?:chernobog\s+inc\s+)?department\s+workers$/i.test(normalized) ||
    /^show\s+(?:chernobog\s+inc\s+)?mission\s+workers$/i.test(normalized)
  ) {
    return {
      ok: true,
      title: "Chernobog Inc Department Workers",
      message: formatChernobogDepartmentWorkers(),
    };
  }

  if (/^show\s+worker\s+role\s+.+$/i.test(normalized)) {
    const rawRole = normalized.replace(/^show\s+worker\s+role\s+/i, "").trim();
    const [department = "engineering", role = rawRole] = rawRole.includes("/")
      ? rawRole.split("/").map((item) => item.trim())
      : ["engineering", rawRole];
    const profile = getChernobogDepartmentWorkerProfile(department, role);

    if (!profile) {
      return {
        ok: false,
        title: "Worker role not found",
        message: `Could not find worker role: ${rawRole}`,
      };
    }

    return {
      ok: true,
      title: profile.title,
      message: [
        `Department: ${profile.department}`,
        `Role: ${profile.role}`,
        `May execute tools: ${profile.mayExecuteTools ? "yes" : "no"}`,
        `May autonomously act: ${profile.mayAutonomouslyAct ? "yes" : "no"}`,
        "",
        "Purpose:",
        profile.purpose,
        "",
        "Prompt contract:",
        ...profile.promptContract.map((line) => `- ${line}`),
        "",
        "Output format:",
        ...profile.outputFormat.map((line) => `- ${line}`),
      ].join("\n"),
      data: profile,
    };
  }

  const draft = parseMissionDraft(normalized);
  if (draft) {
    const mission = await createChernobogMission({
      title: draft.title,
      objective: draft.objective,
      departments: draft.departments,
      version: draft.version,
      priority: draft.priority,
      projectId: "chernobog",
      createdBy: "ceo",
    });

    return {
      ok: true,
      title: "Mission proposed",
      message: [
        "Created a proposed Chernobog Inc mission.",
        "",
        formatChernobogMission(mission),
        "",
        "Next safe step:",
        `- approve mission checkpoint ${mission.id} ceo-approval`,
        mission.approvalCheckpoints.some((checkpoint) => checkpoint.id === "security-review")
          ? `- approve mission checkpoint ${mission.id} security-review`
          : "",
        `- approve mission ${mission.id}`,
      ]
        .filter(Boolean)
        .join("\n"),
      data: mission,
    };
  }

  if (/^show\s+(?:chernobog\s+inc\s+)?mission\s+mission-/i.test(normalized)) {
    const missionId = parseMissionId(normalized, /^show\s+(?:chernobog\s+inc\s+)?mission\s+(mission-\S+)$/i);
    if (!missionId) {
      return { ok: false, title: "Mission id missing", message: "Expected: show mission <mission-id>" };
    }
    const mission = await getChernobogMissionById(missionId);
    if (!mission) {
      return { ok: false, title: "Mission not found", message: `Could not find mission: ${missionId}` };
    }
    return { ok: true, title: "Chernobog Inc Mission", message: formatChernobogMission(mission), data: mission };
  }

  const approveCheckpointMatch = normalized.match(/^approve\s+mission\s+checkpoint\s+(mission-\S+)\s+(\S+)$/i);
  if (approveCheckpointMatch) {
    const mission = await approveChernobogMissionCheckpoint(approveCheckpointMatch[1], approveCheckpointMatch[2]);
    return {
      ok: true,
      title: "Mission checkpoint approved",
      message: formatChernobogMission(mission),
      data: mission,
    };
  }

  const rejectCheckpointMatch = normalized.match(/^reject\s+mission\s+checkpoint\s+(mission-\S+)\s+(\S+)$/i);
  if (rejectCheckpointMatch) {
    const mission = await rejectChernobogMissionCheckpoint(rejectCheckpointMatch[1], rejectCheckpointMatch[2]);
    return {
      ok: true,
      title: "Mission checkpoint rejected",
      message: formatChernobogMission(mission),
      data: mission,
    };
  }

  const approveMissionId = parseMissionId(normalized, /^approve\s+mission\s+(mission-\S+)$/i);
  if (approveMissionId) {
    const mission = await getChernobogMissionById(approveMissionId);
    if (!mission) {
      return { ok: false, title: "Mission not found", message: `Could not find mission: ${approveMissionId}` };
    }
    if (!requiredMissionCheckpointsApproved(mission)) {
      return {
        ok: false,
        title: "Mission approval blocked",
        message: "Required mission checkpoints are still pending or rejected.",
        data: mission,
      };
    }
    const updated = await updateChernobogMissionStatus(approveMissionId, "approved");
    return { ok: true, title: "Mission approved", message: formatChernobogMission(updated), data: updated };
  }

  const transitionCommands: { pattern: RegExp; nextStatus: "in_progress" | "blocked" | "needs_review" | "completed" | "rejected"; title: string }[] = [
    { pattern: /^start\s+mission\s+(mission-\S+)$/i, nextStatus: "in_progress", title: "Mission started" },
    { pattern: /^block\s+mission\s+(mission-\S+)$/i, nextStatus: "blocked", title: "Mission blocked" },
    { pattern: /^mark\s+mission\s+needs\s+review\s+(mission-\S+)$/i, nextStatus: "needs_review", title: "Mission needs review" },
    { pattern: /^complete\s+mission\s+(mission-\S+)$/i, nextStatus: "completed", title: "Mission completed" },
    { pattern: /^reject\s+mission\s+(mission-\S+)$/i, nextStatus: "rejected", title: "Mission rejected" },
  ];

  for (const transitionCommand of transitionCommands) {
    const missionId = parseMissionId(normalized, transitionCommand.pattern);
    if (!missionId) {
      continue;
    }
    const updated = await updateChernobogMissionStatus(missionId, transitionCommand.nextStatus);
    return {
      ok: true,
      title: transitionCommand.title,
      message: formatChernobogMission(updated),
      data: updated,
    };
  }

  const snapshot = await getChernobogMissionStoreSnapshot();
  return {
    ok: false,
    title: "Mission command not recognized",
    message: [
      "Try one of these:",
      "- show mission system",
      "- show missions",
      "- create mission Build V5.9 mission system :: Define mission schema and approval checkpoints. departments: engineering, security",
      "- show department workers",
      "- show mission audit log",
    ].join("\n"),
    data: snapshot,
  };
}
