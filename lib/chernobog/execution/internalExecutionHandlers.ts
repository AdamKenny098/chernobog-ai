// lib/chernobog/execution/internalExecutionHandlers.ts

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ExecutionState, getExecutionStateSummary } from "./executionState";
import { ExecutionActionHandler } from "./runExecutionTask";
import { generateWithOllama } from "../llm/ollamaClient";
import { getModelRoutingSummary } from "../llm/modelRouter";

export interface InternalExecutionHandlerOptions {
  previousState: ExecutionState;
}

function extractText(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const possibleKeys = ["text", "content", "contents", "body", "data"];

  for (const key of possibleKeys) {
    if (
      key in value &&
      typeof value[key as keyof typeof value] === "string" &&
      (value[key as keyof typeof value] as string).trim().length > 0
    ) {
      return value[key as keyof typeof value] as string;
    }
  }

  return null;
}

function createSimpleSummary(text: string) {
  const cleaned = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  if (cleaned.length <= 700) {
    return cleaned;
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return `${cleaned.slice(0, 700)}...`;
  }

  const selected = sentences.slice(0, 5).join(" ");

  if (selected.length > 900) {
    return `${selected.slice(0, 900)}...`;
  }

  return selected;
}

function formatBytes(bytes: number) {
  const gb = bytes / 1024 / 1024 / 1024;
  return `${gb.toFixed(2)} GB`;
}

function getSystemStatusSummary() {
  const uptimeSeconds = os.uptime();
  const uptimeHours = uptimeSeconds / 60 / 60;

  const now = new Date();

  return [
    "System status:",
    `Time: ${now.toLocaleString()}`,
    `Platform: ${process.platform}`,
    `Architecture: ${process.arch}`,
    `Hostname: ${os.hostname()}`,
    `CPU: ${os.cpus()[0]?.model ?? "Unknown CPU"}`,
    `CPU cores: ${os.cpus().length}`,
    `Memory: ${formatBytes(os.freemem())} free / ${formatBytes(os.totalmem())} total`,
    `System uptime: ${uptimeHours.toFixed(1)} hours`,
    `Node version: ${process.version}`,
    "",
    getModelRoutingSummary(),
  ].join("\n");
}

function getActiveObjectSummary(state: ExecutionState) {
  const lines: string[] = ["Active execution object:"];

  if (state.selectedFilePath) {
    lines.push(`Selected file: ${state.selectedFilePath}`);
  }

  if (state.selectedFolderPath) {
    lines.push(`Selected folder: ${state.selectedFolderPath}`);
  }

  if (state.lastReadFilePath) {
    lines.push(`Last read file: ${state.lastReadFilePath}`);
  }

  if (state.lastCreatedFilePath) {
    lines.push(`Last created file: ${state.lastCreatedFilePath}`);
  }

  if (state.lastAppendedFilePath) {
    lines.push(`Last appended file: ${state.lastAppendedFilePath}`);
  }

  if (state.lastCreatedFolderPath) {
    lines.push(`Last created folder: ${state.lastCreatedFolderPath}`);
  }

  if (state.lastOpenedApp) {
    lines.push(`Last opened app: ${JSON.stringify(state.lastOpenedApp)}`);
  }

  if (state.lastSystemStatus) {
    lines.push("Last system status: available");
  }

  if (state.lastRenamedFilePath) {
    lines.push(`Last renamed file: ${state.lastRenamedFilePath}`);
  }

  if (state.lastRenamedFolderPath) {
    lines.push(`Last renamed folder: ${state.lastRenamedFolderPath}`);
  }

  if (state.lastCopiedFilePath) {
    lines.push(`Last copied file: ${state.lastCopiedFilePath}`);
  }

  if (state.lastCopiedFolderPath) {
    lines.push(`Last copied folder: ${state.lastCopiedFolderPath}`);
  }

  if (state.lastMovedFilePath) {
    lines.push(`Last moved file: ${state.lastMovedFilePath}`);
  }

  if (state.lastMovedFolderPath) {
    lines.push(`Last moved folder: ${state.lastMovedFolderPath}`);
  }

  if (state.lastListedDirectory) {
    lines.push("Last listed directory: available");
  }

  if (state.lastPathInfo) {
    lines.push("Last path info: available");
  }

  if (state.lastOpenedUrl) {
    lines.push(`Last opened URL: ${JSON.stringify(state.lastOpenedUrl)}`);
  }

  if (state.activeDevTarget) {
    lines.push(`Active dev target: ${state.activeDevTarget}`);
  }

  if (state.activeDevFiles?.length) {
    lines.push(`Active dev files: ${state.activeDevFiles.length}`);
  }

  if (state.lastDevSummary) {
    lines.push(`Last dev summary: ${state.lastDevSummary}`);
  }

  if (state.lastDevProposal) {
    lines.push(`Last dev proposal: ${state.lastDevProposal}`);
  }

  if (state.lastProjectWritePath) {
    lines.push(`Last project write: ${state.lastProjectWritePath}`);
  }

  if (state.lastProjectCommand) {
    lines.push(`Last project command: ${state.lastProjectCommand}`);
  }

  if (state.lastProjectCommandOutput) {
    lines.push("Last project command output: available");
  }

  if (lines.length === 1) {
    lines.push("No active execution object is currently selected.");
  }

  return lines.join("\n");
}

function getSelfDevTarget(target: string) {
  const normalized = target.toLowerCase();

  if (
    normalized.includes("dashboard") ||
    normalized.includes("ui") ||
    normalized.includes("interface")
  ) {
    return {
      target: "dashboard",
      files: [
        "components/UmbraAIConsole.tsx",
        "components/command/CommandShell.tsx",
        "components/command/CommandHeader.tsx",
        "components/command/SubsystemRail.tsx",
        "components/command/CoreEye.tsx",
        "components/command/DirectiveFeed.tsx",
        "components/command/CommandComposer.tsx",
        "components/command/TelemetryPanel.tsx",
        "components/command/ContextPanel.tsx",
        "components/command/WorkflowInspector.tsx",
        "components/command/PlannerInspector.tsx",
      ],
      summary:
        "Dashboard target identified. This area controls the visual command interface, mode-based dashboard, core eye, directive feed, composer, context, telemetry, workflow, and planner panels.",
    };
  }

  if (
    normalized.includes("execution") ||
    normalized.includes("workflow") ||
    normalized.includes("task")
  ) {
    return {
      target: "execution layer",
      files: [
        "lib/chernobog/execution/types.ts",
        "lib/chernobog/execution/buildExecutionTask.ts",
        "lib/chernobog/execution/runExecutionTask.ts",
        "lib/chernobog/execution/defaultExecutionHandlers.ts",
        "lib/chernobog/execution/toolExecutionHandlers.ts",
        "lib/chernobog/execution/internalExecutionHandlers.ts",
        "lib/chernobog/execution/executionState.ts",
        "lib/chernobog/execution/diagnostics.ts",
      ],
      summary:
        "Execution layer target identified. This area controls task building, task execution, handler mapping, state derivation, diagnostics, and execution workflow logic.",
    };
  }

  if (
    normalized.includes("tool") ||
    normalized.includes("tools") ||
    normalized.includes("local operation")
  ) {
    return {
      target: "tool layer",
      files: [
        "lib/chernobog/tools/index.ts",
        "lib/chernobog/tools/types.ts",
        "lib/chernobog/tools/builtins/open-app.ts",
        "lib/chernobog/tools/builtins/open-file.ts",
        "lib/chernobog/tools/builtins/open-folder.ts",
        "lib/chernobog/tools/builtins/create-folder.ts",
        "lib/chernobog/tools/builtins/create-text-file.ts",
        "lib/chernobog/tools/builtins/append-text-file.ts",
        "lib/chernobog/tools/builtins/rename-path.ts",
        "lib/chernobog/tools/builtins/copy-path.ts",
        "lib/chernobog/tools/builtins/move-path.ts",
        "lib/chernobog/tools/builtins/list-directory.ts",
        "lib/chernobog/tools/builtins/get-path-info.ts",
        "lib/chernobog/execution/toolExecutionHandlers.ts",
        "lib/chernobog/execution/defaultExecutionHandlers.ts",
      ],
      summary:
        "Tool layer target identified. This area controls registered built-in tools, local filesystem/system operations, and the execution-handler bridges that expose tools to the workflow engine.",
    };
  }

  if (normalized.includes("memory")) {
    return {
      target: "memory system",
      files: [
        "lib/chernobog/memory",
        "components/MemoryArchitecturePanel.tsx",
      ],
      summary:
        "Memory system target identified. This area controls persistence, recall, memory architecture display, and long-term assistant continuity.",
    };
  }

  if (
    normalized.includes("pipeline") ||
    normalized.includes("router") ||
    normalized.includes("command core") ||
    normalized.includes("core")
  ) {
    return {
      target: "command core",
      files: [
        "lib/chernobog/pipeline/runCommand.ts",
        "lib/chernobog/pipeline/types.ts",
        "app/api/chat/route.ts",
        "lib/chernobog/execution/buildExecutionTask.ts",
        "lib/chernobog/execution/runExecutionTask.ts",
      ],
      summary:
        "Command core target identified. This area controls incoming directives, command routing, pipeline execution, and handoff into the V5 execution engine.",
    };
  }

  return {
    target: "codebase",
    files: [
      "app/api/chat/route.ts",
      "app/api/session/route.ts",
      "components/UmbraAIConsole.tsx",
      "components/command/CommandShell.tsx",
      "lib/chernobog/pipeline/runCommand.ts",
      "lib/chernobog/execution/buildExecutionTask.ts",
      "lib/chernobog/execution/runExecutionTask.ts",
      "lib/chernobog/execution/executionState.ts",
      "lib/chernobog/tools/index.ts",
    ],
    summary:
      "General codebase target identified. This includes API routes, command UI, command pipeline, execution state, and tool registry.",
  };
}

function formatSelfInspection(target: ReturnType<typeof getSelfDevTarget>) {
  return [
    `Self-development target: ${target.target}`,
    "",
    "Relevant files:",
    ...target.files.map((file) => `- ${file}`),
    "",
    target.summary,
    "",
    "Suggested next actions:",
    "- read your active dev files",
    "- propose next dev step",
    "- run project check",
  ].join("\n");
}

type DevFileSnapshot = {
  file: string;
  content: string;
};

const MAX_DEV_FILES_TO_READ = 3;
const MAX_CHARS_PER_DEV_FILE = 2500;

function resolveProjectRelativePath(relativePath: string) {
  const projectRoot = process.cwd();
  const resolved = path.resolve(projectRoot, relativePath);

  if (!resolved.startsWith(projectRoot)) {
    throw new Error(`Refusing to inspect path outside project root: ${relativePath}`);
  }

  return resolved;
}

async function readDevFileSnapshots(files: string[]): Promise<DevFileSnapshot[]> {
  const snapshots: DevFileSnapshot[] = [];

  for (const file of files.slice(0, MAX_DEV_FILES_TO_READ)) {
    try {
      const absolutePath = resolveProjectRelativePath(file);
      const stat = await fs.stat(absolutePath);

      if (!stat.isFile()) {
        continue;
      }

      const raw = await fs.readFile(absolutePath, "utf8");

      snapshots.push({
        file,
        content:
          raw.length > MAX_CHARS_PER_DEV_FILE
            ? `${raw.slice(0, MAX_CHARS_PER_DEV_FILE)}\n\n/* truncated */`
            : raw,
      });
    } catch {
      snapshots.push({
        file,
        content: "/* Unable to read this file during self-development inspection. */",
      });
    }
  }

  return snapshots;
}

function buildSelfProposalPrompt(target: string, snapshots: DevFileSnapshot[]) {
  const allowedFiles = snapshots
    .map((snapshot) => `- ${snapshot.file}`)
    .join("\n");

  const sourceContext = snapshots
    .map((snapshot) => [`--- FILE: ${snapshot.file} ---`, snapshot.content].join("\n"))
    .join("\n\n");

  return [
    "You are Chernobog, a local personal AI assistant currently developing your own codebase.",
    "",
    "Your task is to inspect the supplied source files and propose ONE practical next development step.",
    "",
    "Rules:",
    "- You are working inside the real Chernobog codebase.",
    "- You must only reference files that appear in the allowed existing files list.",
    "- You must only reference files that appear in the supplied source context.",
    "- Do not invent file paths.",
    "- Any proposal that references files outside the allowed existing files list will be rejected.",
    "- The project does not use components/Dashboard.jsx.",
    "- The project does not use styles/theme.js.",
    "- The project does not use a src/ dashboard structure.",
    "- Do not mention src/ unless a supplied file path starts with src/.",
    "- Do not suggest Git commands.",
    "- Do not claim a change has already been applied.",
    "- Do not propose broad vague rewrites.",
    "- Propose one contained improvement.",
    "- Name the exact existing files affected.",
    "- If you need a new file, mark it clearly as NEW FILE and explain why.",
    "- Prefer modifying existing files over creating new ones.",
    "- Explain why the change matters.",
    "- Include approval and validation requirements.",
    "- End with the recommended next Chernobog command, not a shell command.",
    "",
    `Active development target: ${target}`,
    "",
    "Allowed existing files:",
    allowedFiles,
    "",
    "Source files:",
    sourceContext,
    "",
    "Return your answer in this exact structure:",
    "",
    `Development proposal for ${target}:`,
    "",
    "Proposed improvement:",
    "<one specific improvement based only on the supplied files>",
    "",
    "Files affected:",
    "- <existing supplied file path>",
    "",
    "New files, if any:",
    "- <NEW FILE: path> or None",
    "",
    "Why this matters:",
    "<short reason>",
    "",
    "Safety:",
    "- Requires approval before project-file writes.",
    "- Run project check after changes.",
    "",
    "Recommended next command:",
    "write dev note",
  ].join("\n");
}

async function generateSelfProposalWithOllama(
  target: string,
  files: string[]
): Promise<string | null> {
  const snapshots = await readDevFileSnapshots(files);

  if (snapshots.length === 0) {
    return null;
  }

  const prompt = buildSelfProposalPrompt(target, snapshots);

  const result = await generateWithOllama({
    role: "code",
    prompt,
    temperature: 0.25,
    timeoutMs: 180_000,
  });

  return result.ok ? result.text ?? null : null;
}
function extractReferencedProjectPaths(text: string) {
  const matches = text.match(/`([^`]+\.(?:ts|tsx|js|jsx|css|md|json))`/g) ?? [];

  return matches
    .map((match) => match.replace(/`/g, "").trim())
    .filter((value) => value.length > 0);
}

function getInvalidReferencedPaths(proposal: string, allowedFiles: string[]) {
  const referencedPaths = extractReferencedProjectPaths(proposal);

  return referencedPaths.filter(
    (file) => !isAllowedProjectReference(file, allowedFiles)
  );
}

function isAllowedProjectReference(file: string, allowedFiles: string[]) {
  if (file.startsWith("NEW FILE:")) {
    return true;
  }

  if (allowedFiles.includes(file)) {
    return true;
  }

  const basenameMatches = allowedFiles.filter(
    (allowedFile) => path.basename(allowedFile) === file
  );

  return basenameMatches.length === 1;
}

function proposalUsesOnlyAllowedFiles(proposal: string, allowedFiles: string[]) {
  const referencedPaths = extractReferencedProjectPaths(proposal);

  if (referencedPaths.length === 0) {
    return true;
  }

  return referencedPaths.every((file) =>
    isAllowedProjectReference(file, allowedFiles)
  );
}


function formatRejectedProposalFallback(
  target: string,
  allowedFiles: string[],
  rejectedProposal?: string
) {
  return [
    `Development proposal for ${target}:`,
    "",
    "Proposed improvement:",
    "Add a dedicated Self-Development dashboard mode using the existing command dashboard structure. This mode should display the active development target, active development files, last development proposal, last project write path, and last validation command output.",
    "",
    "Files affected:",
    "- components/command/CommandShell.tsx",
    "- components/UmbraAIConsole.tsx",
    "",
    "New files, if any:",
    "- None",
    "",
    "Why this matters:",
    "V5.2 is focused on self-development. The dashboard should expose Chernobog's self-development state directly instead of hiding it inside generic execution/debug summaries.",
    "",
    "Safety:",
    "- Requires approval before project-file writes.",
    "- Run project check after changes.",
    "- Do not reference files outside the inspected source set.",
    "",
    "Recommended next command:",
    "write dev note",
    "",
    "Validation note:",
    "The AI proposal was rejected because it referenced files outside the inspected Chernobog source set.",
    "",
    ...(rejectedProposal
      ? [
          "Rejected file references:",
          ...getInvalidReferencedPaths(rejectedProposal, allowedFiles).map(
            (file) => `- ${file}`
          ),
          "",
        ]
      : []),
    "Allowed files were:",
    ...allowedFiles.map((file) => `- ${file}`),
  ].join("\n");
}

function formatSelfProposal(target: string) {
  return [
    `Development proposal for ${target}:`,
    "",
    "Proposed improvement:",
    "Create a dedicated self-development workflow that can inspect a target area, identify relevant files, record a proposal, write an approved development note, and run project validation.",
    "",
    "Files affected:",
    "- lib/chernobog/execution/buildExecutionTask.ts",
    "- lib/chernobog/execution/internalExecutionHandlers.ts",
    "- lib/chernobog/execution/executionState.ts",
    "",
    "New files, if any:",
    "- None",
    "",
    "Why this matters:",
    "This gives Chernobog a controlled foundation for improving itself without allowing reckless autonomous edits.",
    "",
    "Safety:",
    "- Inspection is safe.",
    "- Proposal is safe.",
    "- Writing requires approval.",
    "- Validation is whitelisted.",
    "",
    "Recommended next command:",
    "write dev note",
  ].join("\n");
}


function findAllowedFileMentioned(text: string, allowedFiles: string[]) {
  const normalizedText = text.toLowerCase();

  for (const file of allowedFiles) {
    if (normalizedText.includes(file.toLowerCase())) {
      return file;
    }

    const basename = path.basename(file).toLowerCase();

    if (normalizedText.includes(basename)) {
      const matches = allowedFiles.filter(
        (allowedFile) => path.basename(allowedFile).toLowerCase() === basename
      );

      if (matches.length === 1) {
        return matches[0];
      }
    }
  }

  return undefined;
}

function extractProposalSummary(proposal: string) {
  const marker = "Proposed improvement:";
  const index = proposal.indexOf(marker);

  if (index === -1) {
    return proposal.slice(0, 500).trim();
  }

  const afterMarker = proposal.slice(index + marker.length);
  const nextSectionIndex = afterMarker.search(
    /\n\s*(Files affected:|New files, if any:|Why this matters:|Safety:|Recommended next command:)/
  );

  const summary =
    nextSectionIndex === -1
      ? afterMarker.trim()
      : afterMarker.slice(0, nextSectionIndex).trim();

  return summary.length > 0
    ? summary
    : "Prepare the proposed self-development change.";
}

function extractProposalReason(proposal: string) {
  const marker = "Why this matters:";
  const index = proposal.indexOf(marker);

  if (index === -1) {
    return "This patch supports the active self-development proposal.";
  }

  const afterMarker = proposal.slice(index + marker.length);
  const nextSectionIndex = afterMarker.search(
    /\n\s*(Safety:|Recommended next command:|Files affected:|New files, if any:)/
  );

  const reason =
    nextSectionIndex === -1
      ? afterMarker.trim()
      : afterMarker.slice(0, nextSectionIndex).trim();

  return reason.length > 0
    ? reason
    : "This patch supports the active self-development proposal.";
}

function formatPreparedPatchPlan({
  targetFile,
  summary,
  reason,
}: {
  targetFile: string;
  summary: string;
  reason: string;
}) {
  return [
    "Prepared patch plan:",
    "",
    "Target file:",
    targetFile,
    "",
    "Change summary:",
    summary,
    "",
    "Reason:",
    reason,
    "",
    "Safety:",
    "- This is only a patch plan.",
    "- No source file has been modified yet.",
    "- Applying the patch must be approval-gated.",
    "- Run project check after applying.",
    "",
    "Recommended next command:",
    "apply prepared patch",
  ].join("\n");
}

function containsMarkdownFence(content: string) {
  return content.includes("```");
}

function containsObviousModelCommentary(content: string) {
  const trimmed = content.trim().toLowerCase();
  const firstLine = trimmed.split("\n")[0]?.trim() ?? "";

  return (
    firstLine.startsWith("here is") ||
    firstLine.startsWith("sure,") ||
    firstLine.startsWith("this code") ||
    firstLine.startsWith("the following") ||
    firstLine.startsWith("i have") ||
    firstLine.startsWith("below is") ||
    trimmed.includes("i have updated") ||
    trimmed.includes("the following code") ||
    trimmed.includes("here's the complete") ||
    trimmed.includes("here is the complete")
  );
}

function containsSuspiciousTailwindDamage(content: string) {
  return (
    content.includes("${styles.") ||
    content.includes("backgroundColor:") ||
    content.includes("borderColor:")
  );
}

function validateGeneratedPatchContent(file: string, content: string) {
  const trimmed = content.trim();

  if (trimmed.length < 100) {
    return {
      ok: false,
      reason: "Generated patch was too short to be a complete source file.",
    };
  }

  if (containsMarkdownFence(trimmed)) {
    return {
      ok: false,
      reason: "Generated patch still contained markdown code fences.",
    };
  }

  if (containsObviousModelCommentary(trimmed)) {
    return {
      ok: false,
      reason: "Generated patch contained model commentary instead of raw source code.",
    };
  }

  if (file.endsWith(".tsx") || file.endsWith(".ts")) {
    if (
      !trimmed.includes("import ") &&
      !trimmed.includes("export ") &&
      !trimmed.includes("function ") &&
      !trimmed.includes("const ")
    ) {
      return {
        ok: false,
        reason: "Generated TypeScript patch did not look like a complete source file.",
      };
    }
  }

  if (file.endsWith(".tsx") && containsSuspiciousTailwindDamage(trimmed)) {
    return {
      ok: false,
      reason:
        "Generated TSX patch appeared to replace Tailwind class strings with unsupported style object values.",
    };
  }

  return {
    ok: true,
    reason: "Patch content passed validation.",
  };
}

function looksLikeCompleteSourceFile(file: string, content: string) {
  const trimmed = content.trim();

  if (trimmed.length < 100) {
    return false;
  }

  if (file.endsWith(".tsx") || file.endsWith(".ts")) {
    return (
      trimmed.includes("import ") ||
      trimmed.includes("export ") ||
      trimmed.includes("function ") ||
      trimmed.includes("const ")
    );
  }

  return true;
}

function validatePatchPreservesFileSize({
  original,
  patched,
}: {
  original: string;
  patched: string;
}) {
  const originalLines = original.split("\n").length;
  const patchedLines = patched.split("\n").length;

  const originalChars = original.length;
  const patchedChars = patched.length;

  const lineRatio = patchedLines / Math.max(originalLines, 1);
  const charRatio = patchedChars / Math.max(originalChars, 1);

  if (lineRatio < 0.85) {
    return {
      ok: false,
      reason: `Generated patch removed too many lines. Original lines: ${originalLines}, patched lines: ${patchedLines}.`,
    };
  }

  if (charRatio < 0.85) {
    return {
      ok: false,
      reason: `Generated patch removed too much content. Original chars: ${originalChars}, patched chars: ${patchedChars}.`,
    };
  }

  if (lineRatio > 1.35) {
    return {
      ok: false,
      reason: `Generated patch added too many lines. Original lines: ${originalLines}, patched lines: ${patchedLines}.`,
    };
  }

  if (charRatio > 1.45) {
    return {
      ok: false,
      reason: `Generated patch added too much content. Original chars: ${originalChars}, patched chars: ${patchedChars}.`,
    };
  }

  return {
    ok: true,
    reason: "Patch preserved enough of the original file structure.",
  };
}

function stripCodeFence(value: string) {
  let trimmed = value.trim();

  if (trimmed.startsWith("```")) {
    trimmed = trimmed.replace(/^```[a-zA-Z0-9]*\s*/, "");
  }

  if (trimmed.endsWith("```")) {
    trimmed = trimmed.replace(/```\s*$/, "");
  }

  return trimmed.trim();
}

async function repairGeneratedPatchWithOllama({
  targetFile,
  invalidContent,
  rejectionReason,
}: {
  targetFile: string;
  invalidContent: string;
  rejectionReason: string;
}): Promise<string | null> {
  const model = process.env.OLLAMA_MODEL ?? "gemma3";

  const prompt = [
    "You are Chernobog repairing invalid generated source code.",
    "",
    "The previous output was rejected by the project safety validator.",
    "",
    `Target file: ${targetFile}`,
    `Rejection reason: ${rejectionReason}`,
    "",
    "Invalid output:",
    invalidContent,
    "",
    "Repair rules:",
    "- Return raw source code only.",
    "- Do not explain anything.",
    "- Do not include markdown fences.",
    "- Do not include ```.",
    "- Do not say here is the file.",
    "- Do not include commentary before or after the code.",
    "- Return the complete replacement file content.",
    "- Preserve the target file's language and structure.",
    "- If the target file is TSX, the first line should usually be \"use client\"; or an import/export/source-code line.",
    "",
    "Return only the repaired complete file content now.",
  ].join("\n");

  try {
    const response = await fetch("http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.03,
        },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await generateWithOllama({
      role: "repair",
      prompt,
      temperature: 0.03,
      timeoutMs: 240_000,
    });
    
    return result.ok && result.text ? stripCodeFence(result.text) : null;
  } catch {
    return null;
  }
}

async function generatePatchedFileWithOllama({
  targetFile,
  currentContent,
  summary,
  reason,
}: {
  targetFile: string;
  currentContent: string;
  summary: string;
  reason: string;
}): Promise<string | null> {
  const prompt = [
    "You are Chernobog, modifying your own codebase under strict operator control.",
    "",
    "Rewrite exactly one existing project file.",
    "",
    "Hard rules:",
    "- Return the complete replacement file content only.",
    "- Return raw source code only.",
    "- Do not include markdown fences.",
    "- Do not wrap the output in markdown.",
    "- Do not use ``` fences.",
    "- Do not explain the change.",
    "- Do not invent imports unless needed.",
    "- Preserve existing behavior unless the requested patch requires a small change.",
    "- Keep the change minimal.",
    "- Do not rename the file.",
    "- Do not reference any files other than the target file.",
    "- The first line must be a valid source-code line for the target file.",
    "- The final line must be source code, not markdown.",
    "",
    `Target file: ${targetFile}`,
    "",
    "Patch summary:",
    summary,
    "",
    "Reason:",
    reason,
    "",
    "Current file content:",
    currentContent,
  ].join("\n");

  const result = await generateWithOllama({
    role: "code",
    prompt,
    temperature: 0.12,
    timeoutMs: 240_000,
  });

  return result.ok && result.text ? stripCodeFence(result.text) : null;
}

async function repairSelfProposalWithOllama({
  target,
  files,
  rejectedProposal,
}: {
  target: string;
  files: string[];
  rejectedProposal: string;
}): Promise<string | null> {
  const allowedFiles = files
    .map((file, index) => `${index + 1}. ${file}`)
    .join("\n");

  const prompt = [
    "You are Chernobog repairing a rejected self-development proposal.",
    "",
    "The previous proposal was rejected because it invented file paths.",
    "",
    "You must choose affected files ONLY from this numbered list:",
    allowedFiles,
    "",
    "Rejected proposal:",
    rejectedProposal,
    "",
    "Hard rules:",
    "- Do not invent any file path.",
    "- Do not use src/.",
    "- Do not use components/Dashboard.jsx.",
    "- Do not use styles/theme.js.",
    "- Do not create new files.",
    "- Do not suggest Git commands.",
    "- Files affected must be copied exactly from the allowed list.",
    "- Recommended next command must be exactly: write dev note",
    "",
    "Pick one small improvement that can be done using only the allowed files.",
    "",
    "Return exactly this format:",
    "",
    `Development proposal for ${target}:`,
    "",
    "Proposed improvement:",
    "<one specific contained improvement>",
    "",
    "Files affected:",
    "- <copy exact file path from allowed list>",
    "",
    "New files, if any:",
    "- None",
    "",
    "Why this matters:",
    "<short reason>",
    "",
    "Safety:",
    "- Requires approval before project-file writes.",
    "- Run project check after changes.",
    "",
    "Recommended next command:",
    "write dev note",
  ].join("\n");

  const result = await generateWithOllama({
    role: "repair",
    prompt,
    temperature: 0.05,
    timeoutMs: 180_000,
  });

  return result.ok ? result.text ?? null : null;
}

async function generatePreparedPatchContent(state: ExecutionState) {
  const targetFile = state.preparedPatchTargetFile;
  const summary = state.preparedPatchSummary;
  const reason = state.preparedPatchReason;

  if (!targetFile || !summary) {
    return {
      success: false as const,
      error:
        "No prepared patch is available. Run 'prepare patch plan' first.",
    };
  }

  const absolutePath = resolveProjectRelativePath(targetFile);
  const currentContent = await fs.readFile(absolutePath, "utf8");

  const patchedContent = await generatePatchedFileWithOllama({
    targetFile,
    currentContent,
    summary,
    reason: reason ?? "This patch supports the prepared self-development plan.",
  });

  if (!patchedContent) {
    return {
      success: false as const,
      error:
        "Ollama did not return patch content. Try again or reduce the target file size.",
    };
  }

  const validation = validateGeneratedPatchContent(targetFile, patchedContent);

  if (validation.ok) {
    const preservation = validatePatchPreservesFileSize({
      original: currentContent,
      patched: patchedContent,
    });
  
    if (!preservation.ok) {
      return {
        success: false as const,
        error: preservation.reason,
        targetFile,
      };
    }
  
    return {
      success: true as const,
      targetFile,
      patchedContent,
      summary,
    };
  }

const repairedContent = await repairGeneratedPatchWithOllama({
  targetFile,
  invalidContent: patchedContent,
  rejectionReason: validation.reason,
});

if (!repairedContent) {
  return {
    success: false as const,
    error: validation.reason,
    targetFile,
  };
}

const repairedValidation = validateGeneratedPatchContent(
  targetFile,
  repairedContent
);

if (!repairedValidation.ok) {
  return {
    success: false as const,
    error: `Initial patch failed: ${validation.reason}. Repair attempt failed: ${repairedValidation.reason}`,
    targetFile,
  };
}

const repairedPreservation = validatePatchPreservesFileSize({
  original: currentContent,
  patched: repairedContent,
});

if (!repairedPreservation.ok) {
  return {
    success: false as const,
    error: `Initial patch failed: ${validation.reason}. Repair attempt passed syntax checks but failed preservation checks: ${repairedPreservation.reason}`,
    targetFile,
  };
}

return {
  success: true as const,
  targetFile,
  patchedContent: repairedContent,
  summary,
};
}

export function createInternalExecutionHandlers(
  options: InternalExecutionHandlerOptions
): Record<string, ExecutionActionHandler> {
  const { previousState } = options;

  return {
    async "execution.summary"() {
      const summary = getExecutionStateSummary(previousState);

      return {
        success: true,
        output: summary,
        context: {
          summary,
        },
      };
    },

    async "execution.summarizeLastRead"() {
      const text = extractText(previousState.lastReadText);

      if (!text) {
        return {
          success: false,
          error: "There is no previously read text available to summarize.",
        };
      }

      const summary = createSimpleSummary(text);

      return {
        success: true,
        output: summary,
        context: {
          summary,
        },
      };
    },

    async "execution.approvalTest"() {
      return {
        success: true,
        output: "Approval flow completed successfully.",
        context: {
          summary: "Approval flow completed successfully.",
        },
      };
    },

    async "system.status"() {
      const summary = getSystemStatusSummary();

      return {
        success: true,
        output: summary,
        context: {
          summary,
          systemStatus: {
            platform: process.platform,
            arch: process.arch,
            hostname: os.hostname(),
            freeMemory: os.freemem(),
            totalMemory: os.totalmem(),
            uptime: os.uptime(),
            nodeVersion: process.version,
          },
        },
      };
    },

    async "execution.resetState"() {
      return {
        success: true,
        output: "Execution state reset.",
        context: {
          resetExecutionState: true,
          summary: "Execution state reset.",
        },
      };
    },

    async "execution.activeObjectSummary"() {
      const summary = getActiveObjectSummary(previousState);

      return {
        success: true,
        output: summary,
        context: {
          summary,
        },
      };
    },

    async "self.inspect"(step) {
      const input = step.input;

      const target =
        input &&
        typeof input === "object" &&
        "target" in input &&
        typeof input.target === "string"
          ? input.target
          : "codebase";

      const result = getSelfDevTarget(target);
      const summary = formatSelfInspection(result);

      return {
        success: true,
        output: summary,
        context: {
          activeDevTarget: result.target,
          activeDevFiles: result.files,
          lastDevSummary: result.summary,
          summary,
        },
      };
    },

    async "self.proposeNextStep"(_step, task) {
      const target =
        typeof task.context.activeDevTarget === "string"
          ? task.context.activeDevTarget
          : previousState.activeDevTarget ?? "codebase";

      const activeDevFiles = Array.isArray(previousState.activeDevFiles)
        ? previousState.activeDevFiles
        : [];

      const aiProposal = await generateSelfProposalWithOllama(
        target,
        activeDevFiles
      );

      let proposal: string;

      if (
        aiProposal &&
        aiProposal.trim().length > 0 &&
        proposalUsesOnlyAllowedFiles(aiProposal, activeDevFiles)
      ) {
        proposal = aiProposal;
      } else if (aiProposal && aiProposal.trim().length > 0) {
        const repairedProposal = await repairSelfProposalWithOllama({
          target,
          files: activeDevFiles,
          rejectedProposal: aiProposal,
        });

        if (
          repairedProposal &&
          repairedProposal.trim().length > 0 &&
          proposalUsesOnlyAllowedFiles(repairedProposal, activeDevFiles)
        ) {
          proposal = repairedProposal;
        } else {
          proposal = formatRejectedProposalFallback(
            target,
            activeDevFiles,
            repairedProposal ?? aiProposal
          );
        }
      } else {
        proposal = [
          formatSelfProposal(target),
          "",
          "Note:",
          "Ollama proposal generation was unavailable, so Chernobog returned the static fallback proposal.",
        ].join("\n");
      }

      return {
        success: true,
        output: proposal,
        context: {
          activeDevTarget: target,
          activeDevFiles,
          lastDevProposal: proposal,
          summary: proposal,
        },
      };
    },

    async "self.preparePatchPlan"() {
      const proposal = previousState.lastDevProposal;
      const activeDevFiles = previousState.activeDevFiles ?? [];
      const target = previousState.activeDevTarget ?? "codebase";

      if (!proposal || proposal.trim().length === 0) {
        return {
          success: false,
          error:
            "No development proposal is available. Run 'propose next dev step' first.",
        };
      }

      const targetFile = findAllowedFileMentioned(proposal, activeDevFiles);

      if (!targetFile) {
        return {
          success: false,
          error:
            "Could not identify a valid target file from the current proposal. Run 'inspect your dashboard' and 'propose next dev step' again.",
        };
      }

      const summary = extractProposalSummary(proposal);
      const reason = extractProposalReason(proposal);

      const output = formatPreparedPatchPlan({
        targetFile,
        summary,
        reason,
      });

      return {
        success: true,
        output,
        context: {
          activeDevTarget: target,
          activeDevFiles,
          preparedPatchTargetFile: targetFile,
          preparedPatchSummary: summary,
          preparedPatchReason: reason,
          preparedPatchValidationCommand: "run project check",
          summary: output,
        },
      };
    },

    async "self.generatePreparedPatch"() {
      const result = await generatePreparedPatchContent(previousState);
    
      if (!result.success) {
        return {
          success: false,
          error: result.error,
          context: {
            lastRejectedPatchReason: result.error,
            lastRejectedPatchFile: "targetFile" in result ? result.targetFile : undefined,
            summary: `Prepared patch rejected: ${result.error}`,
          },
        };
      }
    
      const output = [
        "Prepared patch content generated.",
        "",
        "Target file:",
        result.targetFile,
        "",
        "Patch summary:",
        result.summary,
        "",
        "Next step:",
        "Writing this patch requires approval.",
      ].join("\n");
    
      return {
        success: true,
        output,
        context: {
          preparedPatchTargetFile: result.targetFile,
          preparedPatchContent: result.patchedContent,
          lastAppliedPatchSummary: result.summary,
          summary: output,
        },
      };
    },
  };
}