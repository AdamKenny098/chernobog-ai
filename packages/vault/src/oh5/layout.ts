import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { GovernedMemoryStore, type MemoryRecord } from "./store";

export const OH5_SCHEMA_VERSION = 1 as const;
const PROJECT_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export type ProjectRegistration = { id: string; name: string; createdAt: string };
export type VaultManifest = { schemaVersion: 1; projects: ProjectRegistration[] };
export type VaultProjection = { schemaVersion: 1; memoryId: string; projectId: string; revision: number; tier: MemoryRecord["tier"]; sourceRef: string; contentHash: string; updatedAt: string; markdownPath: string };
export function validateProjectId(id: string): string {
  if (typeof id !== "string" || !PROJECT_ID.test(id) || id.length > 80 || id === "_shared") throw new Error("Invalid or reserved project identifier");
  return id;
}
export function sha256(text: string): string { return createHash("sha256").update(text).digest("hex"); }
function hexMemoryId(id: string): string { if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error("Invalid memory identifier"); return id; }
function safeYaml(value: string): string { return JSON.stringify(value); }
export function defaultObsidianRoot(): string { return path.join(process.cwd(), "vault", "chernobog"); }
export function toMarkdown(record: MemoryRecord): string {
  validateProjectId(record.projectId);hexMemoryId(record.id);
  const bodyHash = sha256(record.body);
  return ["---", "oh5_schema: 1", `id: ${safeYaml(record.id)}`, `project: ${safeYaml(record.projectId)}`, `tier: ${safeYaml(record.tier)}`, `revision: ${record.revision}`, `source: ${safeYaml(record.sourceRef)}`, `origin_channel: ${safeYaml(record.channel)}`, `content_sha256: ${safeYaml(bodyHash)}`, `created: ${safeYaml(record.createdAt)}`, `updated: ${safeYaml(record.updatedAt)}`, record.supersededBy ? `superseded_by: ${safeYaml(record.supersededBy)}` : undefined, "---", "", record.body, ""].filter((x): x is string => x !== undefined).join("\n");
}
function atomicWrite(filename: string, content: string): void {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try { fs.writeFileSync(temporary, content, { encoding: "utf8", flag: "wx" }); fs.renameSync(temporary, filename); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function readJson<T>(filename: string, fallback: T): T {
  if (!fs.existsSync(filename)) return fallback;
  return JSON.parse(fs.readFileSync(filename, "utf8")) as T;
}
export class OH5ObsidianLayout {
  private readonly boundary: string;
  private readonly root: string;
  constructor(vaultRoot: string) {
    this.root = path.resolve(vaultRoot);
    if (!fs.existsSync(path.join(this.root, ".obsidian"))) throw new Error("Expected existing Obsidian vault marker");
    this.boundary = path.join(this.root, "_chernobog-oh5");
    this.checkPath(this.boundary);
  }
  private checkPath(candidate: string): void {
    const absolute = path.resolve(candidate);
    if (absolute !== this.boundary && !absolute.startsWith(this.boundary + path.sep)) throw new Error("Outside OH-5 storage boundary");
    let current = this.root;
    const relative = path.relative(this.root, absolute).split(path.sep).filter(Boolean);
    for (const segment of relative) {
      current = path.join(current, segment);
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error("Symlink path forbidden");
    }
  }
  private file(...parts: string[]): string { const filename = path.join(this.boundary, ...parts); this.checkPath(filename); return filename; }
  private manifestFile(): string { return this.file("manifest.json"); }
  manifest(): VaultManifest {
    const data = readJson<unknown>(this.manifestFile(), { schemaVersion: 1, projects: [] });
    if (!data || typeof data !== "object" || !("schemaVersion" in data) || data.schemaVersion !== 1 || !("projects" in data) || !Array.isArray(data.projects)) throw new Error("Invalid vault manifest");
    const projects = data.projects as ProjectRegistration[];
    for (const project of projects) { validateProjectId(project.id); if (typeof project.name !== "string" || !project.name.trim()) throw new Error("Invalid project registry entry"); }
    if (new Set(projects.map(p => p.id)).size !== projects.length) throw new Error("Duplicate project registry entry");
    return { schemaVersion: 1, projects };
  }
  registerProject(id: string, name: string, ownerAuthorized: boolean): VaultManifest {
    validateProjectId(id);
    if (!ownerAuthorized) throw new Error("Owner authorization required to register project");
    if (typeof name !== "string" || !name.trim()) throw new Error("Project name required");
    return this.withLock(() => {
      const manifest = this.manifest();
      if (manifest.projects.some(p => p.id === id)) throw new Error("Project already registered");
      manifest.projects.push({ id, name: name.trim(), createdAt: new Date().toISOString() });
      atomicWrite(this.manifestFile(), JSON.stringify(manifest, null, 2) + "\n");
      return manifest;
    });
  }
  private withLock<T>(fn: () => T): T {
    fs.mkdirSync(this.boundary, { recursive: true });
    const lock = this.file(".write.lock");
    let descriptor: number;
    try { descriptor = fs.openSync(lock, "wx"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new Error("Vault busy: concurrent writer detected"); throw error; }
    try { return fn(); }
    finally { fs.closeSync(descriptor); fs.unlinkSync(lock); }
  }
  projectRegistered(projectId: string): boolean { return this.manifest().projects.some(p => p.id === validateProjectId(projectId)); }
  projectFolder(projectId: string): string {
    validateProjectId(projectId);
    if (!this.projectRegistered(projectId)) throw new Error("Unregistered project; fail closed");
    return this.file("projects", projectId);
  }
  /** Read-only legacy compatibility: never treats legacy notes as owner-confirmed memory. */
  legacyNote(fileRelativeToVault: string): { body: string; trusted: false } {
    if (path.isAbsolute(fileRelativeToVault) || fileRelativeToVault.split(/[\\/]/).includes("..")) throw new Error("Unsafe legacy path");
    const target = path.resolve(this.root, fileRelativeToVault);
    if (!target.startsWith(this.root + path.sep) || target.startsWith(this.boundary + path.sep) || !target.endsWith(".md")) throw new Error("Invalid legacy note");
    let current = this.root;
    for (const part of path.relative(this.root, target).split(path.sep)) { current = path.join(current, part); if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error("Symlink path forbidden"); }
    return { body: fs.readFileSync(target, "utf8"), trusted: false };
  }
  /** Project authoritative state from OH-5B SQLite, never from an arbitrary caller supplied record. */
  projectFromGovernedStore(store: GovernedMemoryStore, projectId: string, id: string): VaultProjection {
    const folder = this.projectFolder(projectId);
    const record = store.get(projectId, hexMemoryId(id));
    if (!record) throw new Error("Record absent from governed store or wrong project");
    return this.withLock(() => {
      const markdown = toMarkdown(record);
      const markdownPath = this.file("projects", projectId, "memories", `${record.id}.md`);
      const metadataPath = this.file("projects", projectId, "records", `${record.id}.json`);
      const entry: VaultProjection = { schemaVersion: 1, memoryId: record.id, projectId, revision: record.revision, tier: record.tier, sourceRef: record.sourceRef, contentHash: sha256(record.body), updatedAt: record.updatedAt, markdownPath: path.relative(this.root, markdownPath).replaceAll(path.sep, "/") };
      const previous = readJson<VaultProjection | null>(metadataPath, null);
      if (previous && previous.revision > entry.revision) throw new Error("Stale governed projection");
      if (previous && previous.revision === entry.revision && previous.contentHash !== entry.contentHash) throw new Error("Revision hash conflict");
      atomicWrite(markdownPath, markdown);
      atomicWrite(metadataPath, JSON.stringify(entry, null, 2) + "\n");
      return entry;
    });
  }
  readProjection(projectId: string, id: string): VaultProjection | undefined {
    this.projectFolder(projectId);
    const filename = this.file("projects", projectId, "records", `${hexMemoryId(id)}.json`);
    if (!fs.existsSync(filename)) return undefined;
    const data = readJson<VaultProjection>(filename, undefined as never);
    if (data.schemaVersion !== 1 || data.projectId !== projectId || data.memoryId !== id || !Number.isInteger(data.revision) || !/^[0-9a-f]{64}$/.test(data.contentHash)) throw new Error("Invalid projection schema");
    return data;
  }
  /** Search indexes are strictly rebuildable and never authoritative. */
  indexDirectory(): string { return this.file("indexes"); }
  /** Future migrations must be explicit and reversible: no legacy files are rewritten by this class. */
  migrationPlan(): { mode: "dry-run"; writesLegacyNotes: false; schemaVersion: 1 } { return { mode: "dry-run", writesLegacyNotes: false, schemaVersion: 1 }; }
}
