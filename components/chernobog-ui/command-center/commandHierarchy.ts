export type CommandHierarchyNodeKind = "core" | "executive" | "agent";

export type CommandHierarchyNode = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  summary: string;
  status: "online" | "standby" | "attention";
  kind: CommandHierarchyNodeKind;
  children?: CommandHierarchyNode[];
};

function agent(
  id: string,
  label: string,
  summary: string,
): CommandHierarchyNode {
  return {
    id,
    label,
    title: label,
    subtitle: "Department Agent",
    summary,
    status: "standby",
    kind: "agent",
  };
}

function executive(
  id: string,
  label: string,
  summary: string,
  children: CommandHierarchyNode[],
): CommandHierarchyNode {
  return {
    id,
    label,
    title: `${label} Directorate`,
    subtitle: "Chernobog Inc Executive",
    summary,
    status: "online",
    kind: "executive",
    children,
  };
}

const engineering = executive(
  "engineering",
  "Engineering",
  "Builds, integrates, validates, and repairs Chernobog's technical systems.",
  [
    agent("engineering-planner", "Planner", "Turns directives into implementation plans and acceptance gates."),
    agent("engineering-builder", "Builder", "Implements approved technical changes and features."),
    agent("engineering-debugger", "Debugger", "Finds faults, isolates causes, and prepares targeted repairs."),
    agent("engineering-reviewer", "Reviewer", "Reviews implementation quality, correctness, and maintainability."),
    agent("engineering-toolsmith", "Toolsmith", "Builds scripts, utilities, adapters, and reusable engineering tools."),
    agent("engineering-qa", "QA / Validation", "Runs verification and checks acceptance conditions."),
    agent("engineering-integration", "Integration", "Connects components, routes, services, and runtime boundaries."),
    agent("engineering-security", "Security Analyst", "Checks technical changes for security and operational risk."),
  ],
);

const design = executive(
  "design",
  "Design",
  "Owns Chernobog's product experience, interface language, motion, and visual identity.",
  [
    agent("design-ux", "UX Planner", "Designs interaction flows, information hierarchy, and task shape."),
    agent("design-ui", "UI Designer", "Designs screens, components, and interface structure."),
    agent("design-identity", "Visual Identity", "Maintains Chernobog's visual language and consistency."),
    agent("design-motion", "Motion Designer", "Defines transitions, state animation, and interaction feedback."),
    agent("design-prototype", "Prototype Builder", "Creates fast interface prototypes for validation."),
    agent("design-accessibility", "Accessibility Reviewer", "Checks readability, input access, and inclusive interaction."),
    agent("design-critic", "Design Critic", "Pressure-tests designs before implementation."),
    agent("design-assets", "Asset Librarian", "Organises reusable visual assets and references."),
  ],
);

const narrative = executive(
  "narrative",
  "Narrative",
  "Handles writing, worldbuilding, dialogue, continuity, tone, and narrative systems.",
  [
    agent("narrative-planner", "Story Planner", "Structures arcs, beats, and narrative progression."),
    agent("narrative-worldbuilder", "Worldbuilder", "Develops settings, factions, systems, and world rules."),
    agent("narrative-dialogue", "Dialogue Writer", "Creates dialogue and character voice."),
    agent("narrative-lore", "Lore Keeper", "Maintains approved canon and lore memory."),
    agent("narrative-tone", "Tone Editor", "Maintains voice, tone, and stylistic consistency."),
    agent("narrative-character", "Character Designer", "Develops characters, motivations, and relationships."),
    agent("narrative-continuity", "Continuity Reviewer", "Detects contradictions and continuity breaks."),
    agent("narrative-critic", "Narrative Critic", "Pressure-tests narrative quality and impact."),
  ],
);

const research = executive(
  "research",
  "Research",
  "Finds, evaluates, compares, and synthesizes information into useful intelligence.",
  [
    agent("research-scout", "Scout", "Performs initial discovery and identifies promising information sources."),
    agent("research-source", "Source Analyst", "Evaluates source relevance, authority, and reliability."),
    agent("research-technical", "Technical Researcher", "Performs deep technical investigation."),
    agent("research-market", "Market Researcher", "Studies products, competitors, audiences, and markets."),
    agent("research-synth", "Synthesizer", "Combines findings into coherent conclusions."),
    agent("research-fact", "Fact Checker", "Validates important claims and evidence."),
    agent("research-trend", "Trend Watcher", "Tracks changing topics and meaningful developments."),
    agent("research-brief", "Briefing Writer", "Produces concise executive research briefs."),
  ],
);

const operations = executive(
  "operations",
  "Operations",
  "Coordinates active workflows, execution state, approvals, scheduling, and recovery.",
  [
    agent("operations-strategy", "Strategic Planner", "Defines execution sequence, priorities, and dependencies."),
    agent("operations-dispatch", "Task Dispatcher", "Routes work to the correct executive or agent."),
    agent("operations-scheduler", "Scheduler", "Manages timing, reminders, deadlines, and recurring work."),
    agent("operations-monitor", "Workflow Monitor", "Observes the health and progress of active workflows."),
    agent("operations-approval", "Approval Coordinator", "Surfaces actions that require user sign-off."),
    agent("operations-progress", "Progress Tracker", "Tracks completion, blockers, and next actions."),
    agent("operations-recovery", "Recovery Manager", "Restores interrupted workflows and continuation state."),
    agent("operations-deploy", "Deployment Coordinator", "Coordinates release, deployment, and rollout activity."),
  ],
);

const vault = executive(
  "vault",
  "Vault",
  "Owns Chernobog's approved memory, recall, project context, and historical continuity.",
  [
    agent("vault-ingest", "Ingest Clerk", "Captures raw material into controlled vault intake."),
    agent("vault-classifier", "Classifier", "Turns raw inputs into structured memory candidates."),
    agent("vault-binder", "Project Binder", "Links knowledge to the correct project and version."),
    agent("vault-recall", "Recall Engine", "Retrieves relevant approved memory."),
    agent("vault-context", "Context Packet Builder", "Builds compact grounded reasoning context."),
    agent("vault-curator", "Memory Curator", "Maintains clean, useful, and non-duplicative memory."),
    agent("vault-correction", "Correction Manager", "Applies corrections, reclassification, and supersession."),
    agent("vault-history", "History Keeper", "Preserves the timeline of decisions, changes, and work."),
  ],
);

const security = executive(
  "security",
  "Security",
  "Enforces trust boundaries, permissions, risk controls, governance, and recovery safeguards.",
  [
    agent("security-risk", "Risk Analyst", "Evaluates operational risk and possible unintended consequences."),
    agent("security-permission", "Permission Controller", "Checks whether actions are authorized to execute."),
    agent("security-policy", "Policy Auditor", "Checks system behavior against governance rules."),
    agent("security-gate", "Action Gatekeeper", "Blocks execution paths that exceed trust thresholds."),
    agent("security-sandbox", "Sandbox Reviewer", "Keeps uncertain or risky operations contained."),
    agent("security-privacy", "Privacy Watcher", "Protects private user and system information."),
    agent("security-incident", "Incident Monitor", "Detects abnormal, dangerous, or compromised states."),
    agent("security-rollback", "Rollback Officer", "Coordinates safe reversal and recovery."),
  ],
);

const projectLeads = executive(
  "project-leads",
  "Project Leads",
  "Bridges Chernobog's central strategy to the state and execution of individual projects.",
  [
    agent("project-chernobog", "Chernobog Lead", "Owns delivery state and priorities for Chernobog itself."),
    agent("project-crewconnect", "CrewConnect Lead", "Owns CrewConnect project state and coordination."),
    agent("project-polar-night", "Polar Night Lead", "Owns Polar Night project state and coordination."),
    agent("project-website-factory", "Website Factory Lead", "Owns Website Factory delivery and progress."),
    agent("project-command-center", "Dev Command Center Lead", "Owns Dev Command Center project state."),
    agent("project-homelab", "Homelab Lead", "Owns homelab infrastructure work and operational state."),
    agent("project-rd", "R&D Lead", "Coordinates experimental and exploratory work."),
    agent("project-intake", "New Project Intake", "Creates and scopes new project command structures."),
  ],
);

export const chernobogCommandHierarchy: CommandHierarchyNode = {
  id: "chernobog",
  label: "Chernobog",
  title: "Chernobog",
  subtitle: "Central Executive Intelligence",
  summary:
    "Central command intelligence. Select an executive to shift focus into that directorate and expose its direct agents.",
  status: "online",
  kind: "core",
  children: [
    security,
    vault,
    engineering,
    operations,
    projectLeads,
    design,
    narrative,
    research,
  ],
};
