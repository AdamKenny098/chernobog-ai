#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = process.cwd();
let failures = 0;

function check(condition, message) {
  if (condition) console.log(`PASS ${message}`);
  else {
    console.error(`FAIL ${message}`);
    failures++;
  }
}
function read(rel) {
  const full = path.join(repo, rel);
  if (!fs.existsSync(full)) return "";
  return fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "");
}
function findMatchingDelimiter(text, openIndex, openChar, closeChar) {
  let depth = 0;
  let state = "code";
  let quote = "";
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (state === "line-comment") {
      if (ch === "\n") state = "code";
      continue;
    }
    if (state === "block-comment") {
      if (ch === "*" && next === "/") {
        state = "code";
        i++;
      }
      continue;
    }
    if (state === "string") {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === quote) {
        state = "code";
        quote = "";
      }
      continue;
    }
    if (state === "template") {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === "`") state = "code";
      continue;
    }

    if (ch === "/" && next === "/") {
      state = "line-comment";
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      state = "block-comment";
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      state = "string";
      quote = ch;
      continue;
    }
    if (ch === "`") {
      state = "template";
      continue;
    }

    if (ch === openChar) depth++;
    if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findFunctionBodyOpen(text, declarationIndex) {
  const paramOpen = text.indexOf("(", declarationIndex);
  if (paramOpen < 0) return -1;
  const paramClose = findMatchingDelimiter(text, paramOpen, "(", ")");
  if (paramClose < 0) return -1;

  let angleDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  for (let i = paramClose + 1; i < text.length; i++) {
    const ch = text[i];
    if (ch === "<") angleDepth++;
    else if (ch === ">" && angleDepth > 0) angleDepth--;
    else if (ch === "(") parenDepth++;
    else if (ch === ")" && parenDepth > 0) parenDepth--;
    else if (ch === "[") bracketDepth++;
    else if (ch === "]" && bracketDepth > 0) bracketDepth--;
    else if (ch === "{" && angleDepth === 0 && parenDepth === 0 && bracketDepth === 0) return i;
  }
  return -1;
}

function listSourceFiles(root) {
  const out = [];
  const abs = path.join(repo, root);
  if (!fs.existsSync(abs)) return out;
  const stack = [abs];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "dist") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx|js|mjs|cjs)$/i.test(entry.name)) {
        out.push(path.relative(repo, full).split(path.sep).join("/"));
      }
    }
  }
  return out;
}

console.log("Chernobog OH-2B — Dialogue Runtime Verifier");
console.log("============================================");

const runtimeRel = "packages/runtime/src/dialogueRuntime.ts";
const indexRel = "packages/runtime/src/index.ts";
const pipelineRel = "lib/chernobog/pipeline/runCommand.ts";
const ingressRel = "app/api/chat/route.ts";

const runtime = read(runtimeRel);
const index = read(indexRel);
const pipeline = read(pipelineRel);
const ingress = read(ingressRel);

check(Boolean(runtime), "authoritative Dialogue Runtime file exists");
check(index.includes('export * from "./dialogueRuntime";'), "@chernobog/runtime exports Dialogue Runtime");
check(runtime.includes("export class DialogueRuntime"), "Dialogue Runtime has one explicit class authority");
check(runtime.includes("public async runTurn"), "Dialogue Runtime owns turn lifecycle");
check(runtime.includes("public markInterrupted"), "Dialogue Runtime exposes interruption handoff state");
check(runtime.includes("public markResumed"), "Dialogue Runtime exposes resume handoff state");
check(runtime.includes("public snapshot"), "Dialogue Runtime exposes read-only current turn projection");
check(runtime.includes("const dialogueRuntime = new DialogueRuntime()"), "Dialogue Runtime has one process singleton");
check(runtime.includes("export function getDialogueRuntime"), "Dialogue Runtime singleton is accessed through one getter");

const forbiddenRuntimeImports = [
  /from\s+["'][^"']*toolGateway/i,
  /from\s+["']@chernobog\/tools/i,
  /from\s+["']@chernobog\/trust/i,
  /from\s+["'][^"']*runtimeGovernance/i,
  /from\s+["'][^"']*ollama/i,
  /from\s+["'][^"']*personal-assistance/i,
];
for (const rx of forbiddenRuntimeImports) {
  check(!rx.test(runtime), `Dialogue Runtime does not absorb forbidden dependency ${rx}`);
}

check(
  pipeline.includes('import { getDialogueRuntime } from "@chernobog/runtime";'),
  "current command-turn coordinator imports authoritative Dialogue Runtime",
);
const pipelineDecl = /export\s+async\s+function\s+runCommandPipeline\s*\(/.exec(pipeline);
const pipelineBodyOpen = pipelineDecl ? findFunctionBodyOpen(pipeline, pipelineDecl.index) : -1;
const pipelineBodyClose =
  pipelineBodyOpen >= 0
    ? findMatchingDelimiter(pipeline, pipelineBodyOpen, "{", "}")
    : -1;
const pipelineBody =
  pipelineBodyOpen >= 0 && pipelineBodyClose >= 0
    ? pipeline.slice(pipelineBodyOpen + 1, pipelineBodyClose)
    : "";

check(pipelineBodyOpen >= 0 && pipelineBodyClose >= 0, "runCommandPipeline function body is structurally discoverable");
check(
  pipelineBody.includes('return getDialogueRuntime().runTurn('),
  "runCommandPipeline enters Dialogue Runtime inside its actual function body",
);
check(
  (pipeline.match(/export\s+async\s+function\s+runCommandPipeline\s*\(/g) || []).length === 1,
  "public runCommandPipeline contract remains singular",
);
check(
  ingress.includes("runCommandPipeline"),
  "canonical chat ingress still enters the preserved public command pipeline",
);

const definitionFiles = [];
for (const root of ["app", "apps", "lib", "packages"]) {
  for (const rel of listSourceFiles(root)) {
    const text = read(rel);
    if (
      /(?:export\s+)?async\s+function\s+runCommandPipeline\s*\(/.test(text) ||
      /(?:export\s+)?const\s+runCommandPipeline\s*=/.test(text)
    ) {
      definitionFiles.push(rel);
    }
  }
}
check(
  definitionFiles.length === 1 && definitionFiles[0] === pipelineRel,
  `no second runCommandPipeline authority exists (${definitionFiles.join(", ") || "none"})`,
);

const dialogueAuthorityFiles = [];
for (const root of ["app", "apps", "lib", "packages"]) {
  for (const rel of listSourceFiles(root)) {
    if (rel === runtimeRel) continue;
    const text = read(rel);
    if (/class\s+DialogueRuntime\b|function\s+getDialogueRuntime\b/.test(text)) {
      dialogueAuthorityFiles.push(rel);
    }
  }
}
check(
  dialogueAuthorityFiles.length === 0,
  `no second DialogueRuntime/getDialogueRuntime authority exists${dialogueAuthorityFiles.length ? `: ${dialogueAuthorityFiles.join(", ")}` : ""}`,
);

check(
  !runtime.includes("executeTool") &&
  !runtime.includes("invokeTool") &&
  !runtime.includes("ALLOW") &&
  !runtime.includes("DENY"),
  "Dialogue Runtime owns lifecycle only, not tool/trust decisions",
);

if (failures) {
  console.error(`\nOH-2B verifier: FAIL (${failures})`);
  process.exit(1);
}
console.log("\nOH-2B verifier: PASS");
