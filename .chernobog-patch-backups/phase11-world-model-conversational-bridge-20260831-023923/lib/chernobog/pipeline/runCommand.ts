import { respondForRoute, routeMessage } from "@/lib/chernobog/router";
import {
  clearAllMemories,
  deleteMemory,
  extractForgetFact,
  extractMemoryFact,
  getMemories,
  getRecentMessages,
  isForgetRequest,
  isRecallRequest,
  isRememberRequest,
  isWipeMemoriesRequest,
  saveMemory,
  saveMessage,
} from "@/lib/chernobog/memory";

import { parseToolCommand } from "@/lib/chernobog/tools/parser";
import { classifyToolIntent } from "@/lib/chernobog/tools/intent";
import {
  normalizeToolCall,
  openAppCallLooksLikeFileRequest,
} from "@/lib/chernobog/tools/normalize";

import {
  getSessionContext,
  saveSessionContext,
} from "@/lib/chernobog/session/store";

import {
  updateSessionAfterRoute,
} from "@/lib/chernobog/session/update";

import type { RouteName } from "@/lib/chernobog/session/types";
import type { CommandPipelineResult } from "./types";
import { finalizePipelinePayload } from "./payload";
import {
  executeAndTrackTool,
  formatToolReply,
  looksLikeExplicitFilePath,
  looksLikeVagueFileRequest,
  tryFileSearchFallback,
} from "./toolExecution";
import { orchestrateMessage } from "@/lib/chernobog/orchestration/orchestrator";
import {
  addTraceStep,
  createTrustTrace,
  setTraceRoute,
  setTraceTool,
} from "@/lib/chernobog/trust/trace";

import { buildChernobogWorldStateContext } from "@/lib/chernobog/pipeline/worldStateContext";
import { buildWorkflowSnapshot } from "@/lib/chernobog/trust/sessionSnapshot";
import {
  buildContinuityReply,
  detectContinuityQuery,
} from "@/lib/chernobog/session/continuity";

import { parsePlannerCommand } from "@/lib/chernobog/planner/parser";
import { runPlannerCommand } from "@/lib/chernobog/planner/coordinator";
import { buildUnifiedMemoryContext } from "@/lib/chernobog/memory-architecture";
import {
  buildProjectGroundedSystemText,
  resolveActiveProjectContext,
} from "@/lib/chernobog/project/activeProjectContext";
import {
  buildExecutionDiagnostics,
  executeFromMessage,
  type ExecutionState,
} from "@/lib/chernobog/execution";

import {
  detectMemoryArchitectureCommand,
  runMemoryArchitectureCommand,
} from "@/lib/chernobog/memory-architecture/commands";

import {
  formatCommandLanguageHelp,
  parseUnifiedCommand,
  unifiedToMemoryAction,
  unifiedToMemoryArchitectureCommand,
  unifiedToPlannerCommand,
  unifiedToToolCall,
} from "@/lib/chernobog/command-language";

import {
  getDomainHandler,
  tryHandleModuleFollowUp,
} from "./domainHandlers";

import {
  executeSavedContentCommand,
  isSavedContentCommand,
} from "@/lib/modules/saved-content";

import {
  executeYouTubeOAuthCommand,
  isYouTubeOAuthCommand,
} from "@/lib/modules/youtube-oauth";

import {
  executeSavedContentReliabilityCommand,
  isSavedContentReliabilityCommand,
} from "@/lib/modules/saved-content-reliability";

import {
  executeContentReviewCommand,
  isContentReviewCommand,
} from "@/lib/modules/content-review";

import {
  executeVaultBrainCommand,
  isVaultBrainCommand,
} from "@/lib/modules/vault-brain";

import {
  executeContentIngestCommand,
  isContentIngestCommand,
} from "@/lib/modules/content-ingest";

import {
  executeYouTubeIngestCommand,
  isYouTubeIngestCommand,
} from "@/lib/modules/youtube-ingest";


type SessionWithExecutionState = ReturnType<typeof getSessionContext> & {
  executionState?: ExecutionState;
};

function shouldUseAuthoritativeAssessmentContext(
  userMessage: string,
  projectId?: string | null
): boolean {
  if (!projectId) {
    return false;
  }

  const normalized = userMessage
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  const asksForAssessment =
    /\b(assess|assessment|evaluate|evaluation|status|state|health|healthy|attention|facts?|inferences?|predictions?|unknowns?|recommend(?:ed|ation)?s?|actions?)\b/i.test(
      normalized
    );

  const asksForCurrentAuthority =
    /\b(current|active|project|workspace|runtime|world state|evidence|known|scope|scoped)\b/i.test(
      normalized
    );

  return (
    asksForAssessment &&
    asksForCurrentAuthority
  );
}

export async function runCommandPipeline(
  userMessage: string,
  sessionId: string
): Promise<CommandPipelineResult> {
  let route: RouteName = "chat";
  let reply = "";
  const trace = createTrustTrace(userMessage, sessionId);

  const startingSession = getSessionContext(sessionId);


  const activeProjectResolution = resolveActiveProjectContext({
    userMessage,
    sessionProjectId: startingSession.activeProjectId,
  });

  if (
    startingSession.activeProjectId !==
    activeProjectResolution.projectId
  ) {
    startingSession.activeProjectId =
      activeProjectResolution.projectId;
    saveSessionContext(startingSession);
  }
  addTraceStep(
    trace,
    "workflow_update",
    "Workflow snapshot before command",
    undefined,
    buildWorkflowSnapshot(startingSession)
  );

  const unifiedCommand = parseUnifiedCommand(userMessage);

  addTraceStep(
    trace,
    "router",
    "Unified command language parsed input",
    `${unifiedCommand.domain}.${unifiedCommand.action}.${unifiedCommand.target}`,
    {
      domain: unifiedCommand.domain,
      action: unifiedCommand.action,
      target: unifiedCommand.target,
      reference: unifiedCommand.reference,
      confidence: unifiedCommand.confidence,
      confidenceLevel: unifiedCommand.confidenceLevel,
      query: unifiedCommand.query,
      stepIndex: unifiedCommand.stepIndex,
      reasons: unifiedCommand.reasons,
    }
  );

  if (isVaultBrainCommand(userMessage)) {
    route = "tools";
    setTraceRoute(trace, route);

    addTraceStep(
      trace,
      "parsed_tool",
      "Vault brain command detected",
      "vault-brain",
      { userMessage }
    );

    saveMessage("user", userMessage, route, sessionId);

    const vaultBrainResult = await executeVaultBrainCommand(userMessage);

    reply = [
      vaultBrainResult.title,
      "",
      vaultBrainResult.message,
    ].join("\n");

    return finalizePipelinePayload(sessionId, route, reply, trace);
  }

  if (isContentReviewCommand(userMessage)) {
    route = "tools";
    setTraceRoute(trace, route);

    addTraceStep(
      trace,
      "parsed_tool",
      "Content review command detected",
      "content-review",
      { userMessage }
    );

    saveMessage("user", userMessage, route, sessionId);

    const contentReviewResult = await executeContentReviewCommand(userMessage);

    reply = [
      contentReviewResult.title,
      "",
      contentReviewResult.message,
    ].join("\n");

    return finalizePipelinePayload(sessionId, route, reply, trace);
  }

  if (isContentIngestCommand(userMessage)) {
    route = "tools";
    setTraceRoute(trace, route);

    addTraceStep(
      trace,
      "parsed_tool",
      "Content ingest command detected",
      "content-ingest",
      { userMessage }
    );

    saveMessage("user", userMessage, route, sessionId);

    const contentIngestResult = await executeContentIngestCommand(userMessage);

    reply = [
      contentIngestResult.title,
      "",
      contentIngestResult.message,
    ].join("\n");

    return finalizePipelinePayload(sessionId, route, reply, trace);
  }

  if (isYouTubeIngestCommand(userMessage)) {
    route = "tools";
    setTraceRoute(trace, route);

    addTraceStep(
      trace,
      "parsed_tool",
      "YouTube playlist ingest command detected",
      "youtube-playlist-ingest",
      { userMessage }
    );

    saveMessage("user", userMessage, route, sessionId);

    const youtubeIngestResult = await executeYouTubeIngestCommand(userMessage);

    reply = [
      youtubeIngestResult.title,
      "",
      youtubeIngestResult.message,
    ].join("\n");

    return finalizePipelinePayload(sessionId, route, reply, trace);
  }

  if (isSavedContentReliabilityCommand(userMessage)) {
    route = "tools";
    setTraceRoute(trace, route);

    addTraceStep(
      trace,
      "parsed_tool",
      "Saved content reliability command detected",
      "saved-content-reliability",
      { userMessage }
    );

    saveMessage("user", userMessage, route, sessionId);

    const reliabilityResult =
      await executeSavedContentReliabilityCommand(userMessage);

    reply = [
      reliabilityResult.title,
      "",
      reliabilityResult.message,
    ].join("\n");

    return finalizePipelinePayload(sessionId, route, reply, trace);
  }

  if (isYouTubeOAuthCommand(userMessage)) {
    route = "tools";
    setTraceRoute(trace, route);

    addTraceStep(
      trace,
      "parsed_tool",
      "YouTube OAuth command detected",
      "youtube-oauth",
      {
        userMessage,
      }
    );

    saveMessage("user", userMessage, route, sessionId);

    const youtubeOAuthResult = await executeYouTubeOAuthCommand(userMessage);

    reply = [
      youtubeOAuthResult.title,
      "",
      youtubeOAuthResult.message,
    ].join("\n");

    return finalizePipelinePayload(sessionId, route, reply, trace);
  }

  if (isSavedContentCommand(userMessage)) {
    route = "tools";
    setTraceRoute(trace, route);

    addTraceStep(
      trace,
      "parsed_tool",
      "Saved content command detected",
      "saved-content",
      {
        userMessage,
      }
    );

    saveMessage("user", userMessage, route, sessionId);

    const savedContentResult = await executeSavedContentCommand(userMessage);

    reply = [
      savedContentResult.title,
      "",
      savedContentResult.message,
    ].join("\n");

    return finalizePipelinePayload(sessionId, route, reply, trace);
  }

  

  if (isWipeMemoriesRequest(userMessage)) {
    route = "memory";
    setTraceRoute(trace, route);

    addTraceStep(trace, "memory_route", "Memory wipe request detected");

    saveMessage("user", userMessage, route, sessionId);

    const deletedCount = clearAllMemories();

    reply =
      deletedCount > 0
        ? `All memories wiped. Removed ${deletedCount} stored entr${deletedCount === 1 ? "y" : "ies"}.`
        : "There were no stored memories to wipe.";
  } else if (isForgetRequest(userMessage)) {
    route = "memory";
    setTraceRoute(trace, route);

    addTraceStep(trace, "memory_route", "Memory forget request detected");

    saveMessage("user", userMessage, route, sessionId);

    const fact = extractForgetFact(userMessage);

    reply = !fact
      ? "State the memory you want removed."
      : deleteMemory(fact).deleted
        ? `Memory removed: ${fact}.`
        : `No matching memory found for: ${fact}.`;
  } else if (isRememberRequest(userMessage)) {
    route = "memory";
    setTraceRoute(trace, route);

    addTraceStep(trace, "memory_route", "Memory remember request detected");

    saveMessage("user", userMessage, route, sessionId);

    const fact = extractMemoryFact(userMessage);

    if (!fact) {
      reply = "State the fact you want stored.";
    } else {
      const result = saveMemory(fact);

      reply = result.saved
        ? `Memory stored: ${result.fact}.`
        : `That memory already exists: ${result.fact}.`;
    }
  } else if (isRecallRequest(userMessage)) {
    route = "memory";
    setTraceRoute(trace, route);

    addTraceStep(trace, "memory_route", "Memory recall request detected");

    saveMessage("user", userMessage, route, sessionId);

    const memories = getMemories(50);

    reply =
      memories.length === 0
        ? "I do not have any persisted memories yet."
        : [
            "Persisted memories:",
            ...memories.map((memory, index) => `${index + 1}. ${memory}`),
          ].join("\n");
  } else {
    const session = getSessionContext(sessionId);
    const continuityQuery = detectContinuityQuery(userMessage);

    if (continuityQuery !== "none") {
      route = "tools";
      setTraceRoute(trace, route);

      addTraceStep(
        trace,
        "workflow_update",
        "Continuity query resolved from persisted session state",
        continuityQuery
      );

      saveMessage("user", userMessage, route, sessionId);

      reply = buildContinuityReply(continuityQuery, session);

      return finalizePipelinePayload(sessionId, route, reply, trace);
    }

    if (
      unifiedCommand.domain === "context" &&
      unifiedCommand.action === "show" &&
      unifiedCommand.query === "command_help"
    ) {
      route = "chat";
      setTraceRoute(trace, route);
    
      addTraceStep(
        trace,
        "router",
        "Unified command language help handled",
        "command_help",
        unifiedCommand
      );
    
      saveMessage("user", userMessage, route, sessionId);
    
      reply = formatCommandLanguageHelp();
    
      return finalizePipelinePayload(sessionId, route, reply, trace);
    }

    const moduleFollowUp = await tryHandleModuleFollowUp({
      userMessage,
      sessionId,
    });
    
    if (moduleFollowUp) {
      addTraceStep(
        trace,
        "router",
        "Module follow-up handler detected",
        moduleFollowUp.moduleId ?? "module",
        {
          route: moduleFollowUp.route,
          moduleId: moduleFollowUp.moduleId,
        }
      );
    
      route = moduleFollowUp.route;
      setTraceRoute(trace, route);
      saveMessage("user", userMessage, route, sessionId);
      reply = moduleFollowUp.reply;
    
      return finalizePipelinePayload(sessionId, route, reply, trace);
    }

    const domainHandler = getDomainHandler(unifiedCommand.domain);

    if (domainHandler) {
      addTraceStep(
        trace,
        "router",
        "Module domain handler detected",
        unifiedCommand.moduleId ?? unifiedCommand.domain,
        {
          domain: unifiedCommand.domain,
          action: unifiedCommand.action,
          target: unifiedCommand.target,
          moduleId: unifiedCommand.moduleId,
          query: unifiedCommand.query,
        }
      );
    
      const moduleResult = await domainHandler({
        userMessage,
        sessionId,
        command: unifiedCommand,
      });
    
      route = moduleResult.route;
      setTraceRoute(trace, route);
      saveMessage("user", userMessage, route, sessionId);
      reply = moduleResult.reply;
    
      addTraceStep(
        trace,
        "router",
        "Module domain handler completed",
        moduleResult.moduleId ?? unifiedCommand.moduleId ?? unifiedCommand.domain,
        {
          route: moduleResult.route,
          moduleId: moduleResult.moduleId,
        }
      );
    
      return finalizePipelinePayload(sessionId, route, reply, trace);
    }

    const unifiedMemoryAction = unifiedToMemoryAction(unifiedCommand);

if (unifiedMemoryAction) {
  route = "memory";
  setTraceRoute(trace, route);

  addTraceStep(
    trace,
    "memory_route",
    "Unified memory action handled",
    unifiedMemoryAction.kind,
    unifiedMemoryAction
  );

  saveMessage("user", userMessage, route, sessionId);

  if (unifiedMemoryAction.kind === "wipe") {
    const deletedCount = clearAllMemories();

    reply =
      deletedCount > 0
        ? `All memories wiped. Removed ${deletedCount} stored entr${
            deletedCount === 1 ? "y" : "ies"
          }.`
        : "There were no stored memories to wipe.";
  } else if (unifiedMemoryAction.kind === "remember") {
    const fact = unifiedMemoryAction.fact.trim();

    if (!fact) {
      reply = "State the fact you want stored.";
    } else {
      const result = saveMemory(fact);

      reply = result.saved
        ? `Memory stored: ${result.fact}.`
        : `That memory already exists: ${result.fact}.`;
    }
  } else if (unifiedMemoryAction.kind === "forget") {
    const fact = unifiedMemoryAction.fact.trim();

    reply = !fact
      ? "State the memory you want removed."
      : deleteMemory(fact).deleted
        ? `Memory removed: ${fact}.`
        : `No matching memory found for: ${fact}.`;
  } else {
    const memories = getMemories(50);

    reply =
      memories.length === 0
        ? "I do not have any persisted memories yet."
        : [
            "Persisted memories:",
            ...memories.map((memory, index) => `${index + 1}. ${memory}`),
          ].join("\n");
  }

  return finalizePipelinePayload(sessionId, route, reply, trace);
}

    const memoryArchitectureCommand =
  unifiedToMemoryArchitectureCommand(unifiedCommand) ??
  detectMemoryArchitectureCommand(userMessage);

    if (memoryArchitectureCommand !== "none") {
      route = "memory";
      setTraceRoute(trace, route);

      addTraceStep(
        trace,
        "memory_route",
        "Layered memory command handled",
        memoryArchitectureCommand
      );

      const storedMemories = getMemories(50);
      const recentMessages = getRecentMessages(sessionId, 12);

      const memoryReply = runMemoryArchitectureCommand(memoryArchitectureCommand, {
        session,
        persistedMemories: storedMemories,
        recentMessages,
        userMessage,
      });

      saveMessage("user", userMessage, route, sessionId);

      reply = memoryReply ?? "No memory architecture response was produced.";

      return finalizePipelinePayload(sessionId, route, reply, trace);
    }

    const plannerCommand =
  unifiedToPlannerCommand(unifiedCommand) ?? parsePlannerCommand(userMessage);
    const plannerReply = runPlannerCommand(plannerCommand, session);

    if (plannerReply) {
      route = "planner";
      setTraceRoute(trace, route);

      addTraceStep(
        trace,
        "router",
        "Persistent planner command handled",
        plannerCommand.kind,
        plannerCommand
      );

      saveMessage("user", userMessage, route, sessionId);
      saveSessionContext(session);

      reply = plannerReply;

      return finalizePipelinePayload(sessionId, route, reply, trace);
    }

    addTraceStep(
      trace,
      "orchestration",
      "Checking V5.0 autonomous execution layer"
    );

    const sessionWithExecution = session as SessionWithExecutionState;

    const execution = await executeFromMessage(userMessage, {
      previousState: sessionWithExecution.executionState,
    });

    if (execution.handled) {
      route = "tools";
      setTraceRoute(trace, route);

      sessionWithExecution.executionState = execution.executionState;
      saveSessionContext(sessionWithExecution);

      addTraceStep(
        trace,
        "orchestration",
        "V5.0 execution layer handled the message",
        execution.task?.status ?? "unknown",
        {
          diagnostics: execution.task
            ? buildExecutionDiagnostics(execution.task)
            : undefined,
          executionState: {
            selectedFilePath: execution.executionState.selectedFilePath,
            selectedFolderPath: execution.executionState.selectedFolderPath,
            lastReadFilePath: execution.executionState.lastReadFilePath,
            hasLastReadText: execution.executionState.lastReadText !== undefined,
            activeTaskGoal: execution.executionState.activeTask?.goal,
            lastTaskGoal: execution.executionState.lastTask?.goal,
          },
          steps: execution.task?.steps.map((step) => ({
            id: step.id,
            label: step.label,
            action: step.action,
            status: step.status,
            risk: step.risk,
            error: step.error,
          })),
        }
      );

      saveMessage("user", userMessage, route, sessionId);

      reply = execution.response;

      return finalizePipelinePayload(sessionId, route, reply, trace);
    }

    addTraceStep(
      trace,
      "orchestration",
      "V5.0 execution layer did not handle the message"
    );

    const unifiedToolCall = unifiedToToolCall(unifiedCommand);

    if (unifiedToolCall && unifiedCommand.confidenceLevel === "high") {
      route = "tools";
      setTraceRoute(trace, route);
      setTraceTool(trace, unifiedToolCall.tool);

      addTraceStep(
        trace,
        "parsed_tool",
        "Unified command converted to explicit tool call",
        unifiedToolCall.tool,
        {
          command: unifiedCommand,
          toolCall: unifiedToolCall,
        }
      );

      saveMessage("user", userMessage, route, sessionId);

      const normalizedToolCall = normalizeToolCall(unifiedToolCall);

      if (openAppCallLooksLikeFileRequest(normalizedToolCall)) {
        addTraceStep(
          trace,
          "vague_file_fallback",
          "Blocked unified open_app because request looked like a file workflow",
          userMessage,
          normalizedToolCall
        );

        const fallbackReply = await tryFileSearchFallback(
          userMessage,
          sessionId,
          "open_file"
        );

        reply =
          fallbackReply ??
          "That looked like a file-open request, not an app launch. I could not confidently resolve it to a real file.";

        return finalizePipelinePayload(sessionId, route, reply, trace);
      }

      if (
        normalizedToolCall.tool === "read_text_file" ||
        normalizedToolCall.tool === "open_file"
      ) {
        const fileInput = normalizedToolCall.input as { path: string };

        if (!looksLikeExplicitFilePath(fileInput.path)) {
          const fallbackReply = await tryFileSearchFallback(
            fileInput.path,
            sessionId,
            normalizedToolCall.tool
          );

          if (fallbackReply) {
            reply = fallbackReply;
          } else {
            const toolResult = await executeAndTrackTool(
              normalizedToolCall.tool,
              normalizedToolCall.input,
              sessionId
            );

            reply = formatToolReply(toolResult, sessionId);
          }
        } else {
          const toolResult = await executeAndTrackTool(
            normalizedToolCall.tool,
            normalizedToolCall.input,
            sessionId
          );

          reply = formatToolReply(toolResult, sessionId);
        }
      } else {
        const toolResult = await executeAndTrackTool(
          normalizedToolCall.tool,
          normalizedToolCall.input,
          sessionId
        );

        reply = formatToolReply(toolResult, sessionId);
      }

      return finalizePipelinePayload(sessionId, route, reply, trace);
    }

      addTraceStep(trace, "orchestration", "Checking V4.4 orchestration layer");

      const orchestration = await orchestrateMessage(userMessage, session);

      if (orchestration.handled) {
        route = orchestration.route;
        setTraceRoute(trace, route);

        addTraceStep(
          trace,
          "orchestration",
          "V4.4 orchestration handled the message",
          orchestration.reply
        );

        saveMessage("user", userMessage, route, sessionId);

        reply = orchestration.reply;
        saveSessionContext(session);
      } else {
        addTraceStep(
          trace,
          "orchestration",
          "V4.4 orchestration did not handle the message"
        );

        const parsedToolCommand = parseToolCommand(userMessage);

        if (parsedToolCommand) {
          route = "tools";
          setTraceRoute(trace, route);
          setTraceTool(trace, parsedToolCommand.tool);

          addTraceStep(
            trace,
            "parsed_tool",
            "Explicit parsed tool command detected",
            parsedToolCommand.tool,
            parsedToolCommand.input
          );

          saveMessage("user", userMessage, route, sessionId);

          const normalizedToolCall = normalizeToolCall(parsedToolCommand);

          if (openAppCallLooksLikeFileRequest(normalizedToolCall)) {
            addTraceStep(
              trace,
              "vague_file_fallback",
              "Blocked open_app because request looked like a file-open workflow",
              userMessage,
              normalizedToolCall
            );

            const fallbackReply = await tryFileSearchFallback(
              userMessage,
              sessionId,
              "open_file"
            );

            reply =
              fallbackReply ??
              "That looked like a file-open request, not an app launch. I could not confidently resolve it to a real file.";

            return finalizePipelinePayload(sessionId, route, reply, trace);
          }

          if (
            normalizedToolCall.tool === "read_text_file" ||
            normalizedToolCall.tool === "open_file"
          ) {
            const fileInput = normalizedToolCall.input as { path: string };

            if (!looksLikeExplicitFilePath(fileInput.path)) {
              const fallbackReply = await tryFileSearchFallback(
                fileInput.path,
                sessionId,
                normalizedToolCall.tool
              );

              if (fallbackReply) {
                reply = fallbackReply;
              } else {
                const toolResult = await executeAndTrackTool(
                  normalizedToolCall.tool,
                  normalizedToolCall.input,
                  sessionId
                );

                reply = formatToolReply(toolResult, sessionId);
              }
            } else {
              const toolResult = await executeAndTrackTool(
                normalizedToolCall.tool,
                normalizedToolCall.input,
                sessionId
              );

              reply = formatToolReply(toolResult, sessionId);
            }
          } else {
            const toolResult = await executeAndTrackTool(
              normalizedToolCall.tool,
              normalizedToolCall.input,
              sessionId
            );

            reply = formatToolReply(toolResult, sessionId);
          }
        } else {
          const toolIntent = await classifyToolIntent(userMessage);

          addTraceStep(
            trace,
            "tool_intent",
            "LLM tool intent classifier completed",
            toolIntent.tool,
            toolIntent
          );

          if (toolIntent.tool !== "none") {
            route = "tools";
            setTraceRoute(trace, route);
            setTraceTool(trace, toolIntent.tool);

            saveMessage("user", userMessage, route, sessionId);

            const normalizedToolCall = normalizeToolCall(toolIntent);

            if (openAppCallLooksLikeFileRequest(normalizedToolCall)) {
              addTraceStep(
                trace,
                "vague_file_fallback",
                "Blocked open_app because request looked like a file-open workflow",
                userMessage,
                normalizedToolCall
              );

              const fallbackReply = await tryFileSearchFallback(
                userMessage,
                sessionId,
                "open_file"
              );

              reply =
                fallbackReply ??
                "That looked like a file-open request, not an app launch. I could not confidently resolve it to a real file.";

              return finalizePipelinePayload(sessionId, route, reply, trace);
            }

            if (
              normalizedToolCall.tool === "read_text_file" ||
              normalizedToolCall.tool === "open_file"
            ) {
              const fileInput = normalizedToolCall.input as { path: string };

              if (!looksLikeExplicitFilePath(fileInput.path)) {
                const fallbackReply = await tryFileSearchFallback(
                  fileInput.path,
                  sessionId,
                  normalizedToolCall.tool
                );

                if (fallbackReply) {
                  reply = fallbackReply;
                } else {
                  const toolResult = await executeAndTrackTool(
                    normalizedToolCall.tool,
                    normalizedToolCall.input,
                    sessionId
                  );

                  reply = formatToolReply(toolResult, sessionId);
                }
              } else {
                const toolResult = await executeAndTrackTool(
                  normalizedToolCall.tool,
                  normalizedToolCall.input,
                  sessionId
                );

                reply = formatToolReply(toolResult, sessionId);
              }
            } else {
              const toolResult = await executeAndTrackTool(
                normalizedToolCall.tool,
                normalizedToolCall.input,
                sessionId
              );

              reply = formatToolReply(toolResult, sessionId);
            }
          } else if (looksLikeVagueFileRequest(userMessage)) {
            route = "tools";
            setTraceRoute(trace, route);

            addTraceStep(
              trace,
              "vague_file_fallback",
              "Vague file request fallback triggered",
              userMessage
            );

            saveMessage("user", userMessage, route, sessionId);

            const fallbackReply = await tryFileSearchFallback(
              userMessage,
              sessionId,
              /\bopen\b/i.test(userMessage) ? "open_file" : "read_text_file"
            );

            reply =
              fallbackReply ??
              "I could not confidently resolve that to a real file. Give me the filename, a clearer query, or ask me to search for it first.";
          } else {
            route = await routeMessage(userMessage);
            setTraceRoute(trace, route);

            addTraceStep(
              trace,
              "router",
              "Falling back to normal message router",
              route
            );

            saveMessage("user", userMessage, route, sessionId);

            const activeSession = getSessionContext(sessionId);
            const storedMemories = getMemories(12);
            const recentMessages = getRecentMessages(sessionId, 8);

            const worldStateContext =
              await buildChernobogWorldStateContext({
                projectId:
                  activeSession.activeProjectId ??
                  undefined,
              });

            const authoritativeAssessment =
              shouldUseAuthoritativeAssessmentContext(
                userMessage,
                activeSession.activeProjectId
              );

            const modelRecentMessages =
              authoritativeAssessment
                ? recentMessages.filter(
                    (message) =>
                      message.role !== "assistant"
                  )
                : recentMessages;

            const memoryContext = await buildUnifiedMemoryContext({
              session: activeSession,
              persistedMemories: storedMemories,
              recentMessages: modelRecentMessages,
              userMessage,
            projectId: activeSession.activeProjectId ?? undefined,
  });

            addTraceStep(
              trace,
              "workflow_update",
              "Layered memory context built for routed response",
              undefined,
              {
                shortTermEntries: memoryContext.shortTerm.lines.length,
                workingEntries: memoryContext.working.lines.length,
                longTermEntries: memoryContext.longTerm.lines.length,
              }
            );

            reply = await respondForRoute(route, userMessage, {
              memories: storedMemories,
              recentMessages: modelRecentMessages,
              sessionSummary: buildProjectGroundedSystemText(
      [memoryContext.systemText, worldStateContext.systemText]
                    .filter(Boolean)
                    .join("\n\n"),
      activeSession.activeProjectId,
    ),
            });

            updateSessionAfterRoute(activeSession, route);
            saveSessionContext(activeSession);
          }
        }
      }
    
  }

  return finalizePipelinePayload(sessionId, route, reply, trace);
}