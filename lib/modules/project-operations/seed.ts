import { randomUUID } from "node:crypto";

import type { Project } from "./types";

function createProjectSeed(args: {
  name: string;
  slug: string;
  summary: string;
  repoName: string;
  focus: string;
  nextAction: string;
  note: string;
}): Project {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    name: args.name,
    slug: args.slug,
    summary: args.summary,
    status: "Active",
    repoHealth: "Watch",
    repoName: args.repoName,
    focus: args.focus,
    nextAction: args.nextAction,
    blockers: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
    boards: [
      {
        id: randomUUID(),
        name: "Command Board",
        description: "Immediate work, current execution, and completed outcomes.",
        cards: [],
      },
    ],
    notes: [
      {
        id: randomUUID(),
        title: "Operating context",
        content: args.note,
        pinned: true,
        archived: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    links: [],
    activity: [
      {
        id: randomUUID(),
        type: "system",
        summary: "Project added to Chernobog Project Operations",
        detail: "Initial workspace created during first-run setup.",
        createdAt: now,
      },
    ],
  };
}

export function createInitialProjectSeed(): Project[] {
  return [
    createProjectSeed({
      name: "Chernobog",
      slug: "chernobog",
      summary:
        "Vault-grounded personal AI assistant with controlled tools, operational workflows, memory, and sensory systems.",
      repoName: "chernobog-ai",
      focus: "Operational command center and the locked V6.x sensory workflow arc.",
      nextAction: "Use Project Operations as the source of truth for active Chernobog work.",
      note:
        "V6.x is the sensory workflow arc: command center, vision, hearing, observation packets, prompt chains, sensory control, proactive review, and trust controls.",
    }),
    createProjectSeed({
      name: "QuestLedger",
      slug: "questledger",
      summary:
        "Customisable Kotlin Android TTRPG companion focused on character play, homebrew content, and DM support.",
      repoName: "QuestLedger",
      focus: "Character customisation, equipment-driven stats, weapon rolls, and playable session workflows.",
      nextAction: "Record the next concrete QuestLedger implementation slice.",
      note:
        "QuestLedger should stay free and customisable, with custom races, weapons, initiative, inventory, combat rolls, and campaign tools.",
    }),
    createProjectSeed({
      name: "Homelab",
      slug: "homelab",
      summary:
        "Private self-hosted infrastructure for Chernobog, storage, monitoring, backups, and personal services.",
      repoName: "homelab-operations",
      focus: "Phase 10 disaster recovery, rebuildability, and secure unattended recovery.",
      nextAction: "Continue from the verified Phase 10A system inventory.",
      note:
        "Chernobog remains private and Tailscale-only. Preserve backups, monitoring, secret handling, and unattended reboot recovery.",
    }),
  ];
}
