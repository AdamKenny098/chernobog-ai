/** OH-5 PSI 1: read-only, dependency-free request scope resolution. */
export type Provenance = "explicit" | "verified" | "inferred" | "unknown";
export type ResolutionState = "resolved" | "ambiguous" | "unresolved";
export type AnswerMode = "vault-only" | "vault-first" | "general";
export type ActorTrust = "authenticated-owner" | "authenticated-user" | "external" | "unknown";

export interface ProjectDescriptor {
  id: string;
  aliases: readonly string[];
  archived?: boolean;
}
export interface RequestContextInput {
  requestId: string;
  sessionId?: string;
  actorId?: string;
  actorTrust: ActorTrust;
  userMessage: string;
  /** Set ONLY from a verified, authenticated request control, not document text. */
  explicitProjectId?: string;
  /** Set ONLY from server-side trusted session state. */
  sessionProjectId?: string;
  /** Set ONLY from trusted conversation state, never retrieved text. */
  conversationProjectId?: string;
  projectVersion?: string;
  answerMode?: AnswerMode;
  timestamp?: string;
}
export interface RequestContext {
  requestId: string;
  sessionId?: string;
  actorId?: string;
  actorTrust: ActorTrust;
  userMessage: string;
  timestamp?: string;
  projectVersion?: string;
  answerMode: AnswerMode;
  resolution: ResolutionState;
  provenance: Provenance;
  projectId: string | null;
  mentionedProjectIds: string[];
  ambiguity: string[];
  /** Never query project-scoped records when this is null. */
  retrievalProjectId: string | null;
  readOnly: true;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}
function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function hasAlias(text: string, alias: string): boolean {
  const parts = normalize(alias).split(" ").filter(Boolean);
  if (!parts.length) return false;
  const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${parts.map(escaped).join("[\\s_-]+")}(?=$|[^\\p{L}\\p{N}])`, "iu");
  return regex.test(text);
}

export function resolveRequestContext(
  input: RequestContextInput,
  projects: readonly ProjectDescriptor[],
): RequestContext {
  if (!input.requestId.trim() || !input.userMessage.trim()) {
    throw new Error("Request ID and user message are required");
  }
  const known = new Map(projects.filter(p => !p.archived).map(p => [p.id, p]));
  const mentioned = [...new Set(projects.filter(p => !p.archived && [p.id, ...p.aliases].some(a => hasAlias(input.userMessage, a))).map(p => p.id))].sort();
  const ambiguity: string[] = [];
  let projectId: string | null = null;
  let provenance: Provenance = "unknown";
  let resolution: ResolutionState = "unresolved";

  if (input.explicitProjectId !== undefined) {
    if (input.actorTrust === "external" || input.actorTrust === "unknown") {
      ambiguity.push("Untrusted actor cannot explicitly select a project");
    } else if (known.has(input.explicitProjectId)) {
      projectId = input.explicitProjectId;
      provenance = "explicit";
    } else {
      ambiguity.push("Explicit project is unknown or archived");
    }
  } else if (mentioned.length > 1) {
    // Cross-project requests require explicit, authenticated scope selection.
    ambiguity.push("Multiple projects referenced in the request");
  } else if (input.sessionProjectId && known.has(input.sessionProjectId)) {
    // A name mentioned in prose is not authority to change the active scope.
    projectId = input.sessionProjectId;
    provenance = "verified";
  } else if (input.sessionProjectId) {
    ambiguity.push("Session project is unknown or archived");
  } else if (input.conversationProjectId && known.has(input.conversationProjectId)) {
    projectId = input.conversationProjectId;
    provenance = "inferred";
  } else if (input.conversationProjectId) {
    ambiguity.push("Conversation project is unknown or archived");
  } else if (mentioned.length === 1) {
    // A single mention can identify a subject only when no trusted scope exists.
    projectId = mentioned[0];
    provenance = "inferred";
  }

  if (projectId !== null) resolution = "resolved";
  else if (ambiguity.length) resolution = "ambiguous";

  return {
    requestId: input.requestId,
    sessionId: input.sessionId,
    actorId: input.actorId,
    actorTrust: input.actorTrust,
    userMessage: input.userMessage,
    timestamp: input.timestamp,
    projectVersion: input.projectVersion,
    answerMode: input.answerMode ?? "vault-first",
    resolution,
    provenance,
    projectId,
    mentionedProjectIds: mentioned,
    ambiguity,
    retrievalProjectId: projectId,
    readOnly: true,
  };
}
