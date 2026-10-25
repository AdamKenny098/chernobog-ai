import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { GovernedMemoryStore, type MemoryRecord } from "./store";
import { OH5ObsidianLayout, validateProjectId } from "./layout";
import { evaluateMemoryMutation, type InputChannel } from "./governance";

/** All incoming material is evidence, never an instruction or an owner decision. */
export type EvidenceChannel = "discord" | "email" | "notification" | "web" | "file" | "tool" | "model" | "owner-ui" | "owner-voice" | "owner-cli";
export type EvidenceEnvelope = {
  projectId: string;
  channel: EvidenceChannel;
  sourceRef: string;
  body: string;
  receivedAt?: string;
  sourceTimestamp?: string;
};
export type IngestReceipt = { accepted: true; duplicate: boolean; record: MemoryRecord; fingerprint: string };
const CHANNELS = new Set<EvidenceChannel>(["discord","email","notification","web","file","tool","model","owner-ui","owner-voice","owner-cli"]);
const MAX_BYTES = 65536;
const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
function boundedText(value: unknown, label: string, maximum: number): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} required`);
  if (Buffer.byteLength(value, "utf8") > maximum) throw new Error(`${label} exceeds permitted size`);
  if (value.includes("\0")) throw new Error(`${label} contains null byte`);
  return value.trim();
}
function optionalTimestamp(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > 40 || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`Invalid ${label}`);
  return new Date(value).toISOString();
}
export function normalizeEvidence(input: EvidenceEnvelope): EvidenceEnvelope {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Evidence envelope required");
  const projectId = validateProjectId(input.projectId);
  if (!CHANNELS.has(input.channel)) throw new Error("Unsupported evidence channel");
  return { projectId, channel: input.channel, sourceRef: boundedText(input.sourceRef,"Source reference",512), body: boundedText(input.body,"Evidence body",MAX_BYTES), receivedAt: optionalTimestamp(input.receivedAt,"receivedAt"), sourceTimestamp: optionalTimestamp(input.sourceTimestamp,"sourceTimestamp") };
}
/** Idempotency is defined by project, channel, source reference and exact body digest. */
export function evidenceFingerprint(input: EvidenceEnvelope): string {
  const item = normalizeEvidence(input);
  return sha256(JSON.stringify([item.projectId,item.channel,item.sourceRef,sha256(item.body)]));
}
export class ControlledEvidenceIngress {
  private readonly ledger: Database.Database;
  private readonly store: GovernedMemoryStore;
  private readonly layout: OH5ObsidianLayout;
  constructor(dbFile: string, vaultRoot: string) {
    this.layout = new OH5ObsidianLayout(vaultRoot);
    fs.mkdirSync(path.dirname(dbFile),{recursive:true});
    this.store = new GovernedMemoryStore(dbFile);
    this.ledger = new Database(dbFile);
    this.ledger.pragma("busy_timeout = 5000");
    this.ledger.exec(`CREATE TABLE IF NOT EXISTS oh5_evidence_receipts (
      fingerprint TEXT PRIMARY KEY, projectId TEXT NOT NULL, channel TEXT NOT NULL,
      sourceRef TEXT NOT NULL, sourceTimestamp TEXT, receivedAt TEXT NOT NULL,
      bodySha256 TEXT NOT NULL, memoryId TEXT NOT NULL);`);
  }
  close(): void { this.ledger.close(); this.store.close(); }
  ingest(input: EvidenceEnvelope): IngestReceipt {
    const evidence = normalizeEvidence(input);
    if (!this.layout.projectRegistered(evidence.projectId)) throw new Error("Unregistered project: evidence rejected");
    const fingerprint = evidenceFingerprint(evidence);
    // Single-connection transaction: either governed memory, audit and evidence receipt all commit, or none do.
    // Project registration and envelope validation have already failed closed above.
    const result = this.ledger.transaction((): { memoryId: string; duplicate: boolean } => {
      const previous = this.ledger.prepare("SELECT memoryId FROM oh5_evidence_receipts WHERE fingerprint=? AND projectId=?").get(fingerprint,evidence.projectId) as { memoryId: string } | undefined;
      if (previous) {
        const check = this.ledger.prepare("SELECT id FROM memory WHERE id=? AND projectId=?").get(previous.memoryId,evidence.projectId);
        if (!check) throw new Error("Evidence receipt points to missing governed memory");
        return { memoryId: previous.memoryId, duplicate: true };
      }
      const decision = evaluateMemoryMutation({ action: "ingest", projectId: evidence.projectId, channel: evidence.channel as InputChannel, claimKind: "external-observation" });
      if (!decision.allowed || decision.nextTier !== "raw") throw new Error("Evidence ingestion denied by governance");
      const memoryId = randomUUID();
      const now = new Date().toISOString();
      this.ledger.prepare("INSERT INTO memory (id,projectId,body,sourceRef,channel,tier,revision,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)")
        .run(memoryId,evidence.projectId,evidence.body,evidence.sourceRef,evidence.channel,"raw",1,now,now);
      this.ledger.prepare("INSERT INTO audit (id,projectId,action,oldTier,newTier,reason,sourceRef,approvalId,at) VALUES (?,?,?,?,?,?,?,?,?)")
        .run(memoryId,evidence.projectId,"ingest",null,"raw","Raw evidence; not owner confirmed",evidence.sourceRef,null,now);
      this.ledger.prepare("INSERT INTO oh5_evidence_receipts (fingerprint,projectId,channel,sourceRef,sourceTimestamp,receivedAt,bodySha256,memoryId) VALUES (?,?,?,?,?,?,?,?)")
        .run(fingerprint,evidence.projectId,evidence.channel,evidence.sourceRef,evidence.sourceTimestamp??null,evidence.receivedAt??now,sha256(evidence.body),memoryId);
      return { memoryId, duplicate: false };
    })();
    const record = this.store.get(evidence.projectId,result.memoryId);
    if (!record) throw new Error("Committed memory could not be retrieved");
    return { accepted:true, duplicate:result.duplicate, record, fingerprint };
  }
  receipts(projectId: string): { fingerprint:string; memoryId:string; sourceRef:string; channel:string; receivedAt:string }[] {
    validateProjectId(projectId);
    if (!this.layout.projectRegistered(projectId)) throw new Error("Unregistered project");
    return this.ledger.prepare("SELECT fingerprint,memoryId,sourceRef,channel,receivedAt FROM oh5_evidence_receipts WHERE projectId=? ORDER BY receivedAt DESC LIMIT 100").all(projectId) as { fingerprint:string; memoryId:string; sourceRef:string; channel:string; receivedAt:string }[];
  }
}