#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repo = process.cwd();
const EXPECTED_BRANCH = "oh-1-repository-decomposition";
const EXPECTED_BASELINE = "36e1d27d7d56fa4fa144ebbac0cf51063791fd7c";

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exit(1);
}
function git(args) {
  return execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
}
function posix(p) {
  return p.split(path.sep).join("/");
}
function readText(file) {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 1_500_000) return "";
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
function readJsonFile(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(text);
}

function stripJsonComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function readJsoncFile(file) {
  const text = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(stripJsonComments(text));
}

let tsconfig = {};
try {
  tsconfig = readJsoncFile(path.join(repo, "tsconfig.json"));
} catch {
  tsconfig = {};
}
const compilerOptions = tsconfig.compilerOptions ?? {};
const tsBaseUrl = compilerOptions.baseUrl
  ? path.resolve(repo, compilerOptions.baseUrl)
  : repo;
const tsPaths = compilerOptions.paths ?? {};

function trySourceCandidates(base) {
  const candidates = [
    base,
    `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.mjs`, `${base}.cjs`,
    posix(path.join(base, "index.ts")),
    posix(path.join(base, "index.tsx")),
    posix(path.join(base, "index.js")),
    posix(path.join(base, "index.mjs")),
    posix(path.join(base, "src", "index.ts")),
    posix(path.join(base, "src", "index.tsx")),
  ];
  for (const candidate of candidates) {
    const normalized = posix(candidate).replace(/^\.\//, "");
    if (source.has(normalized)) return normalized;
  }
  return null;
}

function resolveTsPathAlias(spec) {
  for (const [pattern, replacements] of Object.entries(tsPaths)) {
    const starIndex = pattern.indexOf("*");
    if (starIndex === -1) {
      if (spec !== pattern) continue;
      for (const replacement of replacements) {
        const abs = path.resolve(tsBaseUrl, replacement);
        const rel = posix(path.relative(repo, abs));
        const resolved = trySourceCandidates(rel);
        if (resolved) return resolved;
      }
      continue;
    }

    const prefix = pattern.slice(0, starIndex);
    const suffix = pattern.slice(starIndex + 1);
    if (!spec.startsWith(prefix) || !spec.endsWith(suffix)) continue;
    const captured = spec.slice(prefix.length, spec.length - suffix.length);

    for (const replacement of replacements) {
      const mapped = replacement.replace("*", captured);
      const abs = path.resolve(tsBaseUrl, mapped);
      const rel = posix(path.relative(repo, abs));
      const resolved = trySourceCandidates(rel);
      if (resolved) return resolved;
    }
  }
  return null;
}

function resolveWorkspacePackage(spec) {
  if (!spec.startsWith("@chernobog/")) return null;
  const parts = spec.split("/");
  const pkgName = parts.slice(0, 2).join("/");
  const subpath = parts.slice(2).join("/");
  const packageDir = path.join(repo, "packages", parts[1]);
  const packageJsonPath = path.join(packageDir, "package.json");

  if (subpath) {
    const direct = trySourceCandidates(posix(path.relative(repo, path.join(packageDir, subpath))));
    if (direct) return direct;
    const underSrc = trySourceCandidates(posix(path.relative(repo, path.join(packageDir, "src", subpath))));
    if (underSrc) return underSrc;
  }

  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = readJsonFile(packageJsonPath);
      const candidates = [];

      const exportsField = pkg.exports;
      const rootExport = exportsField && typeof exportsField === "object"
        ? exportsField["."] ?? exportsField
        : exportsField;

      function collectExport(value) {
        if (typeof value === "string") candidates.push(value);
        else if (value && typeof value === "object") {
          for (const key of ["types", "import", "require", "default"]) {
            if (typeof value[key] === "string") candidates.push(value[key]);
          }
        }
      }
      collectExport(rootExport);
      for (const key of ["types", "module", "main"]) {
        if (typeof pkg[key] === "string") candidates.push(pkg[key]);
      }

      for (const entry of candidates) {
        const rel = posix(path.relative(repo, path.resolve(packageDir, entry)));
        const resolved = trySourceCandidates(rel.replace(/\.(d\.ts|js|mjs|cjs)$/i, ""));
        if (resolved) return resolved;
        if (source.has(rel)) return rel;
      }
    } catch {}
  }

  return trySourceCandidates(`packages/${parts[1]}/src/index`);
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

if (!fs.existsSync(path.join(repo, ".git"))) fail("Run this script from the Chernobog repository root.");

const branch = git(["branch", "--show-current"]);
const head = git(["rev-parse", "HEAD"]);
if (branch !== EXPECTED_BRANCH) fail(`Expected branch ${EXPECTED_BRANCH}, found ${branch}`);
if (head !== EXPECTED_BASELINE) fail(`Expected accepted OH-1 checkpoint ${EXPECTED_BASELINE}, found ${head}`);

const roots = ["app", "apps", "packages", "lib", "components", "mobile"];
const excludedDirs = new Set([
  ".git", "node_modules", ".next", "dist", "build", "coverage", ".turbo", ".cache",
  ".gradle", ".idea", ".vscode", "out", "target", "generated"
]);
const allowedExt = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

const files = [];
function walk(abs, rel) {
  if (!fs.existsSync(abs)) return;
  let entries = [];
  try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    if (entry.isDirectory() && excludedDirs.has(entry.name)) continue;
    const absChild = path.join(abs, entry.name);
    const relChild = rel ? path.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) {
      walk(absChild, relChild);
    } else if (allowedExt.has(path.extname(entry.name).toLowerCase())) {
      files.push(posix(relChild));
    }
  }
}
for (const root of roots) walk(path.join(repo, root), root);

if (files.length === 0) fail("No runtime/source files were discovered.");

const source = new Map();
for (const rel of files) source.set(rel, readText(path.join(repo, rel)));

function lineEvidence(text, regexes, limit = 6) {
  const out = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length && out.length < limit; i++) {
    for (const rx of regexes) {
      rx.lastIndex = 0;
      if (rx.test(lines[i])) {
        out.push({ line: i + 1, text: lines[i].trim().slice(0, 220) });
        break;
      }
    }
  }
  return out;
}

const categoryRules = {
  ingress: {
    path: [
      [/app\/api\/.*\/route\.(ts|js)$/i, 35],
      [/apps\/chernobog-ui\/.*\/api\/.*\/route\.(ts|js)$/i, 35],
      [/chat\/route\.(ts|js)$/i, 25],
    ],
    content: [
      [/\bexport\s+async\s+function\s+POST\b/i, 25],
      [/\brunCommandPipeline\b/i, 35],
      [/\bNextRequest\b|\bRequest\b/i, 5],
    ],
  },
  dialogue: {
    path: [
      [/dialogue/i, 40], [/conversation/i, 28], [/packages\/runtime/i, 8],
    ],
    content: [
      [/\bdialogue\b/i, 14], [/\bconversation\b/i, 12], [/\bturn\b/i, 9],
      [/\bcontinuation\b/i, 10], [/\bbarge[- ]?in\b/i, 18], [/\binterrupt/i, 14],
      [/\bresume\b/i, 8], [/\blease\b/i, 8],
    ],
  },
  routing: {
    path: [
      [/(^|\/)router\.(ts|tsx|js|mjs)$/i, 45], [/routing/i, 30],
      [/packages\/core/i, 8], [/packages\/runtime/i, 8],
    ],
    content: [
      [/\brespondForRoute\b/i, 28], [/\broute\b/i, 8], [/\bintent\b/i, 10],
      [/\bconfidence\b/i, 8], [/\bclassifier\b|\bclassification\b/i, 10],
    ],
  },
  planning: {
    path: [
      [/planner/i, 40], [/orchestrat/i, 35], [/workflow/i, 18],
      [/packages\/runtime/i, 8], [/phase11/i, 12],
    ],
    content: [
      [/\bplan\b/i, 8], [/\borchestrat/i, 18], [/\bworkflow\b/i, 10],
      [/\bstep\b/i, 5], [/\bblocked\b/i, 6], [/\bwaiting\b/i, 6],
      [/\bresume\b/i, 6], [/\btask\b/i, 4],
    ],
  },
  actionSelection: {
    path: [
      [/action[-_]?selection/i, 45], [/cognition/i, 30], [/initiative/i, 25],
      [/packages\/runtime/i, 8],
    ],
    content: [
      [/\bselectAction\b|\bactionSelection\b|\bdecideAction\b/i, 30],
      [/\binitiative\b/i, 12], [/\bcognition\b/i, 12], [/\bshouldAct\b/i, 16],
      [/\brequest approval\b|\bapproval required\b/i, 10],
      [/\binterrupt\b|\bcancel\b|\bresume\b|\bdefer\b/i, 7],
    ],
  },
  trust: {
    path: [
      [/packages\/trust\/src\/(trustEngine|engine|index)\.(ts|js)$/i, 45], [/(^|\/)trust/i, 22], [/approval/i, 16],
    ],
    content: [
      [/\bmost[- ]restrictive[- ]wins\b/i, 25], [/\btrust\b/i, 10],
      [/\bapproval\b/i, 10], [/\brisk\b/i, 8], [/\bALLOW\b|\bDENY\b/i, 12],
    ],
  },
  tool: {
    path: [
      [/tool[-_]?gateway/i, 60], [/packages\/tools\/src\/index\.(ts|js)$/i, 22], [/gateway/i, 12],
    ],
    content: [
      [/\bUnified Tool Gateway\b/i, 35], [/\btoolGateway\b|\btoolGateway/i, 28],
      [/\bexecuteTool\b|\binvokeTool\b|\btool execution\b/i, 20],
      [/\btool\b/i, 4],
    ],
  },
  event: {
    path: [
      [/event[-_]?spine/i, 65], [/packages\/events\/src\/index\.(ts|js)$/i, 20], [/(^|\/)events?\//i, 8],
    ],
    content: [
      [/\bEvent Spine\b/i, 35], [/\beventSpine\b/i, 28],
      [/\bpublishEvent\b|\bemitEvent\b|\bappendEvent\b/i, 22], [/\bevent\b/i, 4],
      [/\bcorrelation/i, 8], [/\breplay\b/i, 8],
    ],
  },
  state: {
    path: [
      [/state[-_]?runtime/i, 60], [/packages\/runtime\/src\/index\.(ts|js)$/i, 20], [/(^|\/)state/i, 18],
      [/session/i, 12], [/world[-_]?state/i, 20],
    ],
    content: [
      [/\bprojection\b/i, 10], [/\bsession state\b/i, 12], [/\bWorld State\b/i, 15],
      [/\bruntime state\b/i, 12], [/\bstate\b/i, 4], [/\bpersist/i, 5],
    ],
  },
  response: {
    path: [
      [/chat\/route\.(ts|js)$/i, 25], [/response/i, 22], [/dialogue/i, 8],
    ],
    content: [
      [/\bNextResponse\b/i, 20], [/\bResponse\.json\b/i, 18],
      [/\brespondForRoute\b/i, 22], [/\bfinal response\b/i, 14],
      [/\breturn\s+.*response\b/i, 8],
    ],
  },
  readiness: {
    path: [
      [/readiness/i, 35], [/health/i, 20], [/runtime/i, 8],
    ],
    content: [
      [/\breadiness\b|\bready\b/i, 10], [/\bretry\b/i, 12], [/\brecover/i, 10],
      [/\bstartup\b|\bshutdown\b/i, 10], [/\bhealth\b/i, 8],
      [/\btemporar(y|ily) unavailable\b/i, 14],
    ],
  },
};

function scoreCategory(rel, text, rule) {
  let score = 0;
  const matches = [];
  for (const [rx, weight] of rule.path) {
    rx.lastIndex = 0;
    if (rx.test(rel)) {
      score += weight;
      matches.push(`path:${rx}`);
    }
  }
  for (const [rx, weight] of rule.content) {
    rx.lastIndex = 0;
    if (rx.test(text)) {
      score += weight;
      matches.push(`content:${rx}`);
    }
  }
  return { score, matches };
}

function parseImports(rel, text) {
  const specs = new Set();
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const rx of patterns) {
    let m;
    while ((m = rx.exec(text))) specs.add(m[1]);
  }
  return [...specs];
}
function resolveImport(fromRel, spec) {
  if (spec.startsWith(".")) {
    const base = posix(path.normalize(path.join(path.dirname(fromRel), spec)));
    return trySourceCandidates(base);
  }

  const tsAlias = resolveTsPathAlias(spec);
  if (tsAlias) return tsAlias;

  if (spec.startsWith("@/")) {
    const resolved = trySourceCandidates(spec.slice(2));
    if (resolved) return resolved;
  }

  const workspace = resolveWorkspacePackage(spec);
  if (workspace) return workspace;

  return null;
}

const imports = {};
for (const rel of files) {
  imports[rel] = parseImports(rel, source.get(rel))
    .map(spec => ({ spec, resolved: resolveImport(rel, spec) }));
}

const initialIngress = files
  .map(rel => ({ rel, ...scoreCategory(rel, source.get(rel), categoryRules.ingress) }))
  .filter(x => x.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 8)
  .map(x => x.rel);

const canonicalIngress =
  source.has("app/api/chat/route.ts")
    ? "app/api/chat/route.ts"
    : source.has("apps/chernobog-ui/app/api/chat/route.ts")
      ? "apps/chernobog-ui/app/api/chat/route.ts"
      : initialIngress[0];

if (!canonicalIngress) fail("No canonical command ingress could be identified.");

const reachableDepth = new Map();
const queue = [[canonicalIngress, 0]];
while (queue.length) {
  const [rel, depth] = queue.shift();
  if (reachableDepth.has(rel) && reachableDepth.get(rel) <= depth) continue;
  reachableDepth.set(rel, depth);
  if (depth >= 10) continue;
  for (const edge of imports[rel] || []) {
    if (edge.resolved) queue.push([edge.resolved, depth + 1]);
  }
}

const categoryResults = {};
for (const [name, rule] of Object.entries(categoryRules)) {
  const allRanked = files.map(rel => {
    const text = source.get(rel);
    const scored = scoreCategory(rel, text, rule);
    let score = scored.score;
    const depth = reachableDepth.get(rel);
    if (depth !== undefined) score += Math.max(8, 42 - depth * 4);
    return {
      path: rel,
      score,
      importDepthFromIngress: depth ?? null,
      evidence: lineEvidence(text, rule.content.map(([rx]) => rx), 6),
      matches: scored.matches,
    };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  if (allRanked.length === 0) fail(`No evidence candidate found for ${name}.`);

  const reachableRanked = allRanked.filter(x => x.importDepthFromIngress !== null);
  const ranked = name === "ingress"
    ? allRanked
    : (reachableRanked.length ? reachableRanked : allRanked);

  const primary = ranked[0];
  const threshold = Math.max(18, primary.score * 0.68);
  const competing = ranked.slice(1).filter(x => x.score >= threshold).slice(0, 12);
  const globalOnlyCandidates = allRanked
    .filter(x => x.importDepthFromIngress === null)
    .slice(0, 10);

  categoryResults[name] = {
    primary,
    competing,
    topCandidates: ranked.slice(0, 15),
    globalOnlyCandidates,
    authorityBasis: reachableRanked.length ? "canonical-ingress-import-graph" : "global-fallback",
  };
}

// The current turn coordinator is a stronger dialogue-owner signal than generic
// conversation keywords. OH-2B will replace/consolidate this authority, but OH-2A
// must record who owns the turn today.
const turnCoordinatorCandidates = files
  .filter(rel => /\brunCommandPipeline\b/.test(source.get(rel)))
  .map(rel => ({
    path: rel,
    definition: /(?:export\s+)?(?:async\s+)?function\s+runCommandPipeline\b|(?:export\s+)?const\s+runCommandPipeline\b/.test(source.get(rel)),
    depth: reachableDepth.get(rel) ?? null,
    evidence: lineEvidence(source.get(rel), [/\brunCommandPipeline\b/i], 6),
  }))
  .sort((a, b) =>
    Number(b.definition) - Number(a.definition) ||
    Number(a.depth === null) - Number(b.depth === null) ||
    (a.depth ?? 999) - (b.depth ?? 999) ||
    a.path.localeCompare(b.path)
  );

const turnCoordinator = turnCoordinatorCandidates.find(x => x.definition) ?? turnCoordinatorCandidates[0] ?? null;
if (turnCoordinator) {
  categoryResults.dialogue.currentTurnCoordinator = turnCoordinator;
}

const toolBypassPatterns = [
  /\bexecuteTool\s*\(/i, /\binvokeTool\s*\(/i, /\btoolGateway\.(execute|invoke|run)\s*\(/i,
  /\bexecuteAction\s*\(/i, /\brunTool\s*\(/i,
];
const directToolExecutionCandidates = [];
for (const rel of files) {
  if (/^packages\/tools\//i.test(rel)) continue;
  const text = source.get(rel);
  const ev = lineEvidence(text, toolBypassPatterns, 8);
  if (ev.length) {
    const importsGovernedGateway = /@chernobog\/tools|tool[-_]?gateway|Unified Tool Gateway/i.test(text);
    const trustEvidence = /@chernobog\/trust|\btrust\b|\bapproval\b/i.test(text);
    directToolExecutionCandidates.push({
      path: rel, evidence: ev, importsGovernedGateway, trustEvidence,
      classification: importsGovernedGateway ? "governed-call-candidate" : "bypass-review-required",
    });
  }
}

const directStatePatterns = [
  /\bsetSession(State)?\s*\(/i, /\bupdateSession\s*\(/i, /\bmutateState\s*\(/i,
  /\bwriteWorldState\s*\(/i, /\bsetRuntimeState\s*\(/i,
  /\bUPDATE\s+(session|runtime|world_state|worldstate)\b/i,
];
const directStateMutationCandidates = [];
for (const rel of files) {
  if (/^packages\/runtime\//i.test(rel)) continue;
  const ev = lineEvidence(source.get(rel), directStatePatterns, 8);
  if (ev.length) directStateMutationCandidates.push({ path: rel, evidence: ev });
}

const questionAnswers = [
  ["What receives a command?", "ingress"],
  ["What owns the conversation turn?", "dialogue"],
  ["What routes it?", "routing"],
  ["What plans it?", "planning"],
  ["What decides whether an action occurs?", "actionSelection"],
  ["What checks trust?", "trust"],
  ["What executes the tool?", "tool"],
  ["What emits the event?", "event"],
  ["What changes authoritative state?", "state"],
  ["What constructs the final response?", "response"],
].map(([question, category]) => ({
  question,
  category,
  answer: categoryResults[category].primary.path,
  score: categoryResults[category].primary.score,
  evidence: categoryResults[category].primary.evidence,
}));

const packageFacts = {};
for (const pkg of ["runtime", "core", "events", "tools", "trust", "models", "vault", "personal-assistance", "observability", "external-projects"]) {
  const pkgJson = path.join(repo, "packages", pkg, "package.json");
  if (fs.existsSync(pkgJson)) {
    try {
      const parsed = readJsonFile(pkgJson);
      packageFacts[pkg] = { path: `packages/${pkg}/package.json`, name: parsed.name ?? null };
    } catch {
      packageFacts[pkg] = { path: `packages/${pkg}/package.json`, name: null };
    }
  }
}

const report = {
  schemaVersion: 1,
  stage: "OH-2A",
  auditRevision: "V4",
  generatedAt: new Date().toISOString(),
  baseline: { branch, commit: head, expectedBranch: EXPECTED_BRANCH, expectedCommit: EXPECTED_BASELINE },
  corpus: { fileCount: files.length, roots: roots.filter(r => fs.existsSync(path.join(repo, r))) },
  packageFacts,
  canonicalIngress,
  ingressSeeds: initialIngress,
  reachableFileCount: reachableDepth.size,
  currentTurnCoordinator: turnCoordinator,
  commandLifecycle: [
    "ingress", "dialogue", "routing", "planning", "actionSelection",
    "trust", "tool", "event", "state", "response"
  ].map(category => ({ category, ...categoryResults[category].primary })),
  authorities: categoryResults,
  questionAnswers,
  directToolExecutionCandidates,
  directStateMutationCandidates,
  lifecycleReadiness: categoryResults.readiness,
  importEdges: Object.entries(imports).flatMap(([from, edges]) =>
    edges.filter(e => e.resolved).map(e => ({ from, to: e.resolved, specifier: e.spec }))
  ),
  unresolvedImportsOnReachableGraph: [...reachableDepth.keys()].flatMap(from =>
    (imports[from] || [])
      .filter(e => !e.resolved && (e.spec.startsWith(".") || e.spec.startsWith("@")))
      .map(e => ({ from, specifier: e.spec }))
  ),
  limitations: [
    "This is a static repository audit generated from the accepted OH-1 checkout.",
    "Candidate overlaps are evidence for OH-2 convergence work; they are not automatically classified as bugs.",
    "Historical compatibility bridges may intentionally remain until later slices or OH-10.",
    "OH-2A changes no runtime behavior."
  ],
};

const outDir = path.join(repo, "docs", "overhaul");
ensureDir(outDir);
const jsonPath = path.join(outDir, "OH-2A-runtime-path-audit.json");
const mdPath = path.join(outDir, "OH-2A-runtime-path-audit.md");

fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + "\n", "utf8");

function mdEvidence(ev) {
  if (!ev?.length) return "No line-level match captured.";
  return ev.map(x => `\`${x.line}\` — ${x.text.replace(/\|/g, "\\|")}`).join("<br>");
}
function relLink(p) {
  return `\`${p}\``;
}

const md = [];
md.push("# Chernobog OH-2A — Runtime Path Audit & Lock");
md.push("");
md.push(`Generated from accepted OH-1 checkpoint \`${head}\` on branch \`${branch}\`.`);
md.push("");
md.push("## Scope");
md.push("");
md.push("This stage is an architectural audit only. It does not refactor runtime behavior. It locks the observed post-OH-1 command path, identifies competing ownership candidates, and records possible bypass/mutation paths for later OH-2 slices.");
md.push("");
md.push("## Canonical audit anchor");
md.push("");
md.push(`Command ingress: \`${canonicalIngress}\``);
md.push("");
md.push(`Files statically reachable from canonical ingress: ${reachableDepth.size}`);
md.push("");
if (turnCoordinator) {
  md.push(`Current turn coordinator evidence: \`${turnCoordinator.path}\`${turnCoordinator.definition ? " (definition of `runCommandPipeline`)" : ""}.`);
  md.push("");
}
md.push("The primary ownership candidates below prefer files on this canonical import graph. Global keyword matches are retained only as secondary review evidence.");
md.push("");
if (report.unresolvedImportsOnReachableGraph.length) {
  md.push("### Unresolved internal imports on canonical graph");
  md.push("");
  for (const item of report.unresolvedImportsOnReachableGraph.slice(0, 50)) {
    md.push(`- \`${item.from}\` -> \`${item.specifier}\``);
  }
  md.push("");
}
md.push("## Authoritative command lifecycle baseline");
md.push("");
md.push("```text");
md.push("Ingress");
md.push("  -> Dialogue");
md.push("  -> Route");
md.push("  -> Plan / Action");
md.push("  -> Trust");
md.push("  -> Tool");
md.push("  -> Event");
md.push("  -> State");
md.push("  -> Response");
md.push("```");
md.push("");
md.push("## Ten ownership questions");
md.push("");
md.push("| Question | Observed primary candidate | Static score | Evidence |");
md.push("|---|---|---:|---|");
for (const q of questionAnswers) {
  md.push(`| ${q.question} | ${relLink(q.answer)} | ${q.score} | ${mdEvidence(q.evidence)} |`);
}
md.push("");
md.push("## Observed lifecycle path");
md.push("");
md.push("| Stage | Primary candidate | Reachable from ingress | Static score |");
md.push("|---|---|---:|---:|");
for (const item of report.commandLifecycle) {
  md.push(`| ${item.category} | ${relLink(item.path)} | ${item.importDepthFromIngress === null ? "not statically resolved" : item.importDepthFromIngress} | ${item.score} |`);
}
md.push("");
md.push("## Competing ownership / parallel-path candidates");
md.push("");
for (const [name, result] of Object.entries(categoryResults)) {
  md.push(`### ${name}`);
  md.push("");
  md.push(`Primary: ${relLink(result.primary.path)} (score ${result.primary.score}; basis: ${result.authorityBasis})`);
  md.push("");
  if (!result.competing.length) {
    md.push("No competing candidate crossed the audit threshold.");
  } else {
    for (const c of result.competing) {
      md.push(`- ${relLink(c.path)} — score ${c.score}${c.importDepthFromIngress === null ? "" : `, ingress depth ${c.importDepthFromIngress}`}`);
    }
  }
  md.push("");
}
md.push("## Direct tool-execution review candidates");
md.push("");
if (!directToolExecutionCandidates.length) {
  md.push("No direct tool-execution pattern was found outside `packages/tools`.");
} else {
  for (const c of directToolExecutionCandidates) {
    md.push(`- ${relLink(c.path)} — **${c.classification}**; imports governed gateway: ${c.importsGovernedGateway ? "yes" : "no"}; trust evidence: ${c.trustEvidence ? "yes" : "no"}`);
  }
}
md.push("");
md.push("These are review candidates only. A call is not a bypass if it still enters the public governed Tool Gateway path.");
md.push("");
md.push("## Direct authoritative-state mutation review candidates");
md.push("");
if (!directStateMutationCandidates.length) {
  md.push("No direct runtime/session/world-state mutation pattern was found outside `packages/runtime`.");
} else {
  for (const c of directStateMutationCandidates) md.push(`- ${relLink(c.path)} — inspect before OH-2E/OH-2H migration.`);
}
md.push("");
md.push("## Runtime lifecycle / readiness");
md.push("");
md.push(`Primary readiness/lifecycle candidate: ${relLink(categoryResults.readiness.primary.path)} (score ${categoryResults.readiness.primary.score}).`);
if (categoryResults.readiness.competing.length) {
  md.push("");
  md.push("Competing lifecycle candidates:");
  for (const c of categoryResults.readiness.competing) md.push(`- ${relLink(c.path)} — score ${c.score}`);
}
md.push("");
md.push("## Accepted OH-1 package boundaries observed");
md.push("");
for (const [pkg, fact] of Object.entries(packageFacts)) md.push(`- \`${pkg}\` -> \`${fact.name ?? "(package name unavailable)"}\``);
md.push("");
md.push("## OH-2A lock");
md.push("");
md.push("The JSON companion to this report is the machine-readable baseline for later OH-2 slices. Later migrations should update authority one responsibility at a time and must not claim convergence unless the superseded path is migrated, dependency-scanned, regression-tested, and safely removable.");
md.push("");
md.push("## Deferred work");
md.push("");
md.push("- Dialogue authority consolidation -> OH-2B");
md.push("- Router consolidation -> OH-2C");
md.push("- Planner/orchestrator consolidation -> OH-2D");
md.push("- State Runtime authority -> OH-2E");
md.push("- Action-selection consolidation -> OH-2F");
md.push("- Trust -> Tool convergence -> OH-2G");
md.push("- Event -> State convergence -> OH-2H");
md.push("- Runtime lifecycle/readiness consolidation -> OH-2I");
md.push("- Proven superseded runtime path removal -> OH-2J");
md.push("");
md.push("No OH-3+ work is authorized by this audit.");

fs.writeFileSync(mdPath, md.join("\n") + "\n", "utf8");

console.log("OH-2A Runtime Path Audit");
console.log("========================");
console.log(`Branch: ${branch}`);
console.log(`Baseline: ${head}`);
console.log(`Source files scanned: ${files.length}`);
console.log(`Canonical ingress: ${canonicalIngress}`);
console.log(`Files statically reachable from canonical ingress: ${reachableDepth.size}`);
const unresolvedReachable = [...reachableDepth.keys()].flatMap(from =>
  (imports[from] || []).filter(e => !e.resolved && (e.spec.startsWith(".") || e.spec.startsWith("@")))
);
console.log(`Unresolved internal imports on canonical graph: ${unresolvedReachable.length}`);
if (turnCoordinator) console.log(`Current turn coordinator: ${turnCoordinator.path}`);
console.log("");
for (const q of questionAnswers) {
  console.log(`${q.category.padEnd(16)} ${q.answer} [score=${q.score}]`);
}
console.log("");
console.log(`Direct tool-execution review candidates: ${directToolExecutionCandidates.length}`);
console.log(`Direct state-mutation review candidates: ${directStateMutationCandidates.length}`);
console.log(`Report: ${posix(path.relative(repo, mdPath))}`);
console.log(`Manifest: ${posix(path.relative(repo, jsonPath))}`);
console.log("PASS OH-2A audit generated from live repository evidence");
