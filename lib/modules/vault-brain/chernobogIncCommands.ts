import type { VaultBrainCommandResult } from "./types";
import {
  formatChernobogIncDepartment,
  formatChernobogIncFoundation,
  formatChernobogIncReportFormat,
  formatChernobogIncRoles,
  getChernobogIncFoundation,
  resolveChernobogIncDepartment,
} from "./chernobogIncFoundation";
import {
  createChernobogIncWorkProposal,
  formatChernobogIncProposalList,
  formatChernobogIncWorkProposal,
  listChernobogIncWorkProposals,
} from "./chernobogIncProposals";
import type { ChernobogIncDepartmentId } from "./chernobogIncTypes";

function normalize(command: string) {
  return command.trim().replace(/\s+/g, " ");
}

function parseDepartmentIds(raw: string | undefined): ChernobogIncDepartmentId[] | undefined {
  if (!raw) {
    return undefined;
  }

  const ids = raw
    .split(",")
    .map((item) => item.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);

  const allowed: ChernobogIncDepartmentId[] = [
    "executive-core",
    "engineering",
    "design",
    "narrative",
    "research",
    "operations",
    "security",
  ];

  return ids.filter((id): id is ChernobogIncDepartmentId =>
    allowed.includes(id as ChernobogIncDepartmentId)
  );
}

function parseProposalCommand(command: string) {
  const withoutPrefix = command
    .replace(/^draft inc work proposal\s+/i, "")
    .replace(/^create inc work proposal\s+/i, "")
    .replace(/^propose inc work\s+/i, "")
    .trim();

  const [titlePart, ...descriptionParts] = withoutPrefix.split(/\s+::\s+/);
  const description = descriptionParts.join(" :: ").trim();

  const departmentMatch = description.match(/\s+departments?:\s*([^|]+)$/i);
  const cleanDescription = departmentMatch
    ? description.slice(0, departmentMatch.index).trim()
    : description;

  return {
    title: titlePart.trim(),
    description: cleanDescription || "No description provided yet. This proposal requires review before any execution layer can use it.",
    departmentIds: parseDepartmentIds(departmentMatch?.[1]),
  };
}

export function isChernobogIncCommand(command: string) {
  const normalized = normalize(command);
  return (
    /^show chernobog inc foundation$/i.test(normalized) ||
    /^show chernobog inc structure$/i.test(normalized) ||
    /^show executive core$/i.test(normalized) ||
    /^show chernobog inc executive core$/i.test(normalized) ||
    /^show chernobog inc departments$/i.test(normalized) ||
    /^show chernobog inc department\s+.+$/i.test(normalized) ||
    /^show inc department\s+.+$/i.test(normalized) ||
    /^show chernobog inc roles$/i.test(normalized) ||
    /^show inc roles$/i.test(normalized) ||
    /^show chernobog inc report format$/i.test(normalized) ||
    /^show inc report format$/i.test(normalized) ||
    /^show chernobog inc proposals$/i.test(normalized) ||
    /^show inc proposals$/i.test(normalized) ||
    /^draft inc work proposal\s+.+$/i.test(normalized) ||
    /^create inc work proposal\s+.+$/i.test(normalized) ||
    /^propose inc work\s+.+$/i.test(normalized)
  );
}

export async function executeChernobogIncCommand(
  command: string
): Promise<VaultBrainCommandResult> {
  const normalized = normalize(command);

  if (/^show chernobog inc foundation$/i.test(normalized) || /^show chernobog inc structure$/i.test(normalized)) {
    const foundation = getChernobogIncFoundation();
    return {
      ok: true,
      title: "Chernobog Inc Foundation",
      message: formatChernobogIncFoundation(),
      data: foundation,
    };
  }

  if (/^show executive core$/i.test(normalized) || /^show chernobog inc executive core$/i.test(normalized)) {
    const foundation = getChernobogIncFoundation();
    return {
      ok: true,
      title: "Chernobog Executive Core",
      message: [
        foundation.executiveCore.name,
        `Reports to: ${foundation.executiveCore.reportsTo}`,
        `Purpose: ${foundation.executiveCore.purpose}`,
        "",
        "Responsibilities:",
        ...foundation.executiveCore.responsibilities.map((item) => `- ${item}`),
        "",
        "Boundaries:",
        ...foundation.executiveCore.boundaries.map((item) => `- ${item}`),
      ].join("\n"),
      data: foundation.executiveCore,
    };
  }

  if (/^show chernobog inc departments$/i.test(normalized)) {
    const foundation = getChernobogIncFoundation();
    return {
      ok: true,
      title: "Chernobog Inc Departments",
      message: foundation.departments
        .map((department) => `- ${department.name}: ${department.purpose}`)
        .join("\n"),
      data: foundation.departments,
    };
  }

  if (/^show chernobog inc department\s+.+$/i.test(normalized) || /^show inc department\s+.+$/i.test(normalized)) {
    const departmentName = normalized
      .replace(/^show chernobog inc department\s+/i, "")
      .replace(/^show inc department\s+/i, "");
    const department = resolveChernobogIncDepartment(departmentName);
    if (!department) {
      return {
        ok: false,
        title: "Chernobog Inc Department Not Found",
        message: `Unknown department: ${departmentName}`,
      };
    }

    return {
      ok: true,
      title: department.name,
      message: formatChernobogIncDepartment(department),
      data: department,
    };
  }

  if (/^show chernobog inc roles$/i.test(normalized) || /^show inc roles$/i.test(normalized)) {
    const foundation = getChernobogIncFoundation();
    return {
      ok: true,
      title: "Chernobog Inc Roles",
      message: formatChernobogIncRoles(),
      data: foundation.roles,
    };
  }

  if (/^show chernobog inc report format$/i.test(normalized) || /^show inc report format$/i.test(normalized)) {
    return {
      ok: true,
      title: "Chernobog Inc Report Format",
      message: formatChernobogIncReportFormat(),
    };
  }

  if (/^show chernobog inc proposals$/i.test(normalized) || /^show inc proposals$/i.test(normalized)) {
    const proposals = await listChernobogIncWorkProposals();
    return {
      ok: true,
      title: "Chernobog Inc Work Proposals",
      message: formatChernobogIncProposalList(proposals),
      data: proposals,
    };
  }

  if (
    /^draft inc work proposal\s+.+$/i.test(normalized) ||
    /^create inc work proposal\s+.+$/i.test(normalized) ||
    /^propose inc work\s+.+$/i.test(normalized)
  ) {
    const parsed = parseProposalCommand(normalized);
    const proposal = await createChernobogIncWorkProposal({
      title: parsed.title,
      description: parsed.description,
      departmentIds: parsed.departmentIds,
      requestedBy: "CEO",
      projectId: "chernobog",
      version: "v5.8",
      tags: ["chernobog-inc", "proposal", "approval-gated"],
    });

    return {
      ok: true,
      title: "Chernobog Inc Work Proposal Drafted",
      message: formatChernobogIncWorkProposal(proposal),
      data: proposal,
    };
  }

  return {
    ok: false,
    title: "Chernobog Inc command not recognized",
    message: "Try: show chernobog inc foundation",
  };
}
