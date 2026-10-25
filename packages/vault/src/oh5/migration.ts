import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { OH5ObsidianLayout, validateProjectId } from "./layout";
import { ControlledEvidenceIngress } from "./ingestion";

const sha = (s: string): string => createHash("sha256").update(s).digest("hex");
const MAX_BYTES = 64 * 1024;
export type LegacyItem = { relativePath: string; sha256: string; bytes: number };
export type LegacyPlan = { schema: 1; id: string; projectId: string; vaultRoot: string; generatedAt: string; items: LegacyItem[]; digest: string };
function safeRelative(relative: string): string {
  if (!relative || path.isAbsolute(relative) || relative.includes("\\") || relative.includes("\0")) throw new Error("Unsafe legacy filename");
  const parts = relative.split("/");
  if (parts.some(p => !p || p === "." || p === ".." || p.startsWith(".")) || parts.some(p => p === "_chernobog-oh5")) throw new Error("Hidden, private, or traversal path excluded");
  if (!relative.toLowerCase().endsWith(".md")) throw new Error("Only Markdown legacy notes eligible");
  return relative;
}
function readLegacy(root: string, relative: string): { body: string; bytes: number } {
  const normalized = safeRelative(relative);
  const dest = path.resolve(root, ...normalized.split("/"));
  if (!dest.startsWith(path.resolve(root) + path.sep)) throw new Error("Legacy note outside vault");
  let current = path.resolve(root);
  for (const segment of normalized.split("/")) {
    current = path.join(current, segment);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error("Symlink legacy source forbidden");
  }
  const stat = fs.statSync(dest);
  if (!stat.isFile() || stat.size > MAX_BYTES || stat.size < 1) throw new Error("Ineligible legacy note size");
  const bytes = fs.readFileSync(dest);
  if (bytes.includes(0)) throw new Error("Binary legacy data rejected");
  const body = bytes.toString("utf8");
  if (!body.trim() || Buffer.byteLength(body,"utf8") > MAX_BYTES) throw new Error("Invalid legacy body");
  return { body, bytes: bytes.length };
}
function digest(projectId: string, items: LegacyItem[]): string { return sha(JSON.stringify([projectId,items])); }
/** Only explicitly selected paths; never scan/import everything automatically. */
export function previewLegacyNotes(vaultRoot: string, projectId: string, paths: string[]): LegacyPlan {
  validateProjectId(projectId);
  const layout = new OH5ObsidianLayout(vaultRoot);
  if (!layout.projectRegistered(projectId)) throw new Error("Register project before planning migration");
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 100) throw new Error("Select 1-100 legacy notes explicitly");
  const selected = [...new Set(paths.map(safeRelative))].sort();
  if (selected.length !== paths.length) throw new Error("Duplicate legacy paths rejected");
  const root = path.resolve(vaultRoot);
  const items = selected.map(relativePath => { const file = readLegacy(root, relativePath); return { relativePath, sha256: sha(file.body), bytes: file.bytes }; });
  return { schema: 1, id: randomUUID(), projectId, vaultRoot: root, generatedAt: new Date().toISOString(), items, digest: digest(projectId, items) };
}
/** Owner-controlled import: all imported notes become RAW evidence, never confirmed memory. */
export function applyLegacyPlan(plan: LegacyPlan, expectedDigest: string, confirmed: boolean, dbPath: string): { imported: number; duplicates: number; memoryIds: string[] } {
  if (!confirmed || !expectedDigest || expectedDigest !== plan.digest) throw new Error("Explicit owner confirmation of preview digest required");
  if (plan.schema !== 1 || !Array.isArray(plan.items) || plan.items.length === 0 || plan.items.length > 100) throw new Error("Invalid migration plan");
  if (plan.digest !== digest(plan.projectId, plan.items)) throw new Error("Migration plan tampered");
  const layout = new OH5ObsidianLayout(plan.vaultRoot);
  if (!layout.projectRegistered(plan.projectId)) throw new Error("Unknown project");
  // Validate the entire batch before writing a single record.
  const bodies = plan.items.map(item => {
    const file = readLegacy(plan.vaultRoot, item.relativePath);
    if (file.bytes !== item.bytes || sha(file.body) !== item.sha256) throw new Error("Legacy source changed since preview");
    return file.body;
  });
  const ingress = new ControlledEvidenceIngress(dbPath, plan.vaultRoot);
  try {
    let imported = 0; let duplicates = 0;
    const memoryIds: string[] = [];
    plan.items.forEach((item, i) => {
      const r = ingress.ingest({ projectId: plan.projectId, channel: "file", sourceRef: `legacy-obsidian:${item.relativePath}`, body: bodies[i] });
      if (r.record.tier !== "raw") throw new Error("Legacy input elevated beyond raw tier");
      if (r.duplicate) duplicates++; else imported++;
      memoryIds.push(r.record.id);
    });
    return { imported, duplicates, memoryIds };
  } finally { ingress.close(); }
}