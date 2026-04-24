import crypto from "node:crypto";
import type { RouteName } from "@/lib/chernobog/session/types";
import type { TrustTrace, TrustTraceStep, TrustTraceStepType } from "./types";

function now() {
  return new Date().toISOString();
}

export function createTrustTrace(input: string, sessionId: string): TrustTrace {
  return {
    id: crypto.randomUUID(),
    sessionId,
    startedAt: now(),
    input,
    route: "unknown",
    tool: "none",
    success: false,
    steps: [
      {
        type: "input",
        label: "User input received",
        detail: input,
        timestamp: now(),
      },
    ],
  };
}

export function addTraceStep(
  trace: TrustTrace,
  type: TrustTraceStepType,
  label: string,
  detail?: string,
  data?: unknown
): void {
  const step: TrustTraceStep = {
    type,
    label,
    detail,
    data,
    timestamp: now(),
  };

  trace.steps.push(step);
}

export function setTraceRoute(trace: TrustTrace, route: RouteName): void {
  trace.route = route;

  addTraceStep(trace, "router", "Route selected", route);
}

export function setTraceTool(trace: TrustTrace, tool: string, detail?: string): void {
  trace.tool = tool;

  addTraceStep(trace, "tool_execution", "Tool selected", detail ?? tool);
}

export function failTrace(trace: TrustTrace, error: unknown): void {
  const message =
  error instanceof Error && error.name === "AbortError"
    ? "Directive timed out after 35 seconds."
    : error instanceof Error
      ? error.message
      : "Request failed.";
  trace.success = false;
  trace.error = message;
  trace.finishedAt = now();

  addTraceStep(trace, "failure", "Pipeline failed", message);
}

export function finishTrace(trace: TrustTrace, route: RouteName, tool = "none"): void {
  trace.route = route;
  trace.tool = tool;
  trace.success = true;
  trace.finishedAt = now();

  addTraceStep(trace, "response", "Assistant response created");
}

export function summarizeTrace(trace: TrustTrace): string {
  const finalStep = trace.steps.at(-1);

  return [
    `trace=${trace.id}`,
    `route=${trace.route}`,
    `tool=${trace.tool}`,
    `success=${trace.success}`,
    finalStep ? `last="${finalStep.label}"` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function printTraceInDev(trace: TrustTrace): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.log("\n[Chernobog Trust Trace]");
  console.log(`Trace ID: ${trace.id}`);
  console.log(`Session: ${trace.sessionId}`);
  console.log(`Route: ${trace.route}`);
  console.log(`Tool: ${trace.tool}`);
  console.log(`Success: ${trace.success}`);

  for (const step of trace.steps) {
    console.log(`- [${step.type}] ${step.label}${step.detail ? `: ${step.detail}` : ""}`);
  }

  if (trace.error) {
    console.log(`Error: ${trace.error}`);
  }

  console.log("[/Chernobog Trust Trace]\n");
}