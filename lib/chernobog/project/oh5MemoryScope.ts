import { resolveRequestContext, type ProjectDescriptor } from "./requestContext";

/** PSI 1F: never accept a client-supplied vault project as retrieval authority. */
export function verifyOH5MemoryScope(input: {
  sessionId: string;
  sessionProjectId?: string;
  userMessage: string;
  selectedProjectId: string;
  projects: readonly ProjectDescriptor[];
}): { allowed: boolean; projectId: string | null; reason?: string } {
  const scope = resolveRequestContext({
    requestId: "oh5-chat-memory-scope",
    sessionId: input.sessionId,
    actorTrust: "unknown",
    sessionProjectId: input.sessionProjectId,
    userMessage: input.userMessage,
  }, input.projects);
  const projectId = scope.retrievalProjectId;
  if (!projectId || scope.resolution !== "resolved") {
    return { allowed: false, projectId: null, reason: "No unambiguous server-resolved project" };
  }
  // A project mentioned in the question must not silently inherit an unrelated
  // active session's memory scope. Cross-project requests need explicit handling.
  if (scope.mentionedProjectIds.some((mentioned) => mentioned !== projectId)) {
    return { allowed: false, projectId: null, reason: "Question mentions a different project from the active scope" };
  }
  if (input.selectedProjectId !== projectId) {
    return { allowed: false, projectId: null, reason: "OH-5 project selector disagrees with authorised request scope" };
  }
  return { allowed: true, projectId };
}
