import { createHash } from "node:crypto";
import type Database from "better-sqlite3";
import type { AdaptiveRecommendation, AdaptiveRecommendationSnapshot } from "./readModel";

/** Explicit owner feedback only. No inferred preference writes or score changes. */
export type AdaptiveFeedbackVerdict = "useful" | "irrelevant" | "revisit-later" | "clear";
export type AdaptiveFeedbackRecord = {
  recommendationId: string;
  sourceItemId: string;
  evidenceSignature: string;
  verdict: AdaptiveFeedbackVerdict;
  revisitAt: string | null;
  revision: number;
  updatedAt: string;
};
export type AdaptiveFeedbackAction = {
  actionKey: string;
  recommendationId: string;
  expectedRevision: number;
  verdict: AdaptiveFeedbackVerdict;
  revisitAt?: string | null;
};
export type AdaptiveFeedbackResult = {
  disposition: "recorded" | "replayed";
  feedback: AdaptiveFeedbackRecord;
};

type FeedbackRow = {
  recommendation_id: string;
  source_item_id: string;
  evidence_signature: string;
  verdict: string;
  revisit_at: string | null;
  revision: number;
  updated_at: string;
};
type FeedbackActionRow = {
  action_key: string;
  recommendation_id: string;
  evidence_signature: string;
  verdict: string;
  revisit_at: string | null;
  expected_revision: number;
  revision_after: number;
  recorded_at: string;
};

const KEY = /^[A-Za-z0-9][A-Za-z0-9:_./-]{0,119}$/u;
const MAX_REVISIT_MS = 30 * 24 * 60 * 60_000;
const IRRELEVANT_TTL_MS = MAX_REVISIT_MS;
const VERDICTS = new Set<AdaptiveFeedbackVerdict>(["useful", "irrelevant", "revisit-later", "clear"]);

export function recommendationEvidenceSignature(recommendation: Readonly<AdaptiveRecommendation>): string {
  return createHash("sha256").update(JSON.stringify({
    id: recommendation.id,
    sourceItemId: recommendation.sourceItemId,
    lane: recommendation.lane,
    priority: recommendation.priority,
    category: recommendation.category,
    title: recommendation.title,
    suggestedAction: recommendation.suggestedAction,
    dueAt: recommendation.dueAt,
    requiresUser: recommendation.requiresUser,
    reasonCodes: [...recommendation.reasonCodes].sort(),
  })).digest("hex");
}

function toRecord(row: FeedbackRow): AdaptiveFeedbackRecord {
  if (!VERDICTS.has(row.verdict as AdaptiveFeedbackVerdict) ||
      !Number.isInteger(row.revision) || row.revision < 1) {
    throw new Error("Corrupt stored recommendation feedback.");
  }
  return {
    recommendationId: row.recommendation_id,
    sourceItemId: row.source_item_id,
    evidenceSignature: row.evidence_signature,
    verdict: row.verdict as AdaptiveFeedbackVerdict,
    revisitAt: row.revisit_at,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}

function normalizedInput(input: AdaptiveFeedbackAction, now: Date): Required<AdaptiveFeedbackAction> {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      typeof input.actionKey !== "string" || !KEY.test(input.actionKey) ||
      typeof input.recommendationId !== "string" ||
      input.recommendationId.length > 220 ||
      !/^recommendation:(responsibility|health):[A-Za-z0-9_-]+$/u.test(input.recommendationId) ||
      !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 ||
      !VERDICTS.has(input.verdict) || !Number.isFinite(now.getTime())) {
    throw new Error("Invalid explicit recommendation feedback request.");
  }
  const revisitAt = input.revisitAt ?? null;
  if (input.verdict !== "revisit-later") {
    if (revisitAt !== null) throw new Error("Only revisit-later accepts revisitAt.");
    return { ...input, revisitAt: null };
  }
  if (typeof revisitAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{1,3})?)?(?:Z|[+-]\d\d:\d\d)$/u.test(revisitAt)) {
    throw new Error("revisitAt must use ISO-8601 with an explicit offset or Z.");
  }
  const parsed = Date.parse(revisitAt);
  if (!Number.isFinite(parsed) || parsed <= now.getTime() || parsed > now.getTime() + MAX_REVISIT_MS) {
    throw new Error("revisitAt must be in the next 30 days.");
  }
  return { ...input, revisitAt: new Date(parsed).toISOString() };
}

export class AdaptiveFeedbackStore {
  constructor(private readonly db: Database.Database) {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS personal_assistance_adaptive_feedback_v1 (
        recommendation_id TEXT PRIMARY KEY,
        source_item_id TEXT NOT NULL,
        evidence_signature TEXT NOT NULL,
        verdict TEXT NOT NULL CHECK (verdict IN ('useful','irrelevant','revisit-later','clear')),
        revisit_at TEXT,
        revision INTEGER NOT NULL CHECK (revision >= 1),
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS personal_assistance_adaptive_feedback_action_v1 (
        action_key TEXT PRIMARY KEY,
        recommendation_id TEXT NOT NULL,
        evidence_signature TEXT NOT NULL,
        verdict TEXT NOT NULL,
        revisit_at TEXT,
        expected_revision INTEGER NOT NULL,
        revision_after INTEGER NOT NULL,
        recorded_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pa_adaptive_feedback_action_id
        ON personal_assistance_adaptive_feedback_action_v1(recommendation_id, recorded_at DESC);
    `);
  }

  get(recommendationId: string): AdaptiveFeedbackRecord | null {
    const row = this.db.prepare(`
      SELECT * FROM personal_assistance_adaptive_feedback_v1 WHERE recommendation_id = ?
    `).get(recommendationId) as FeedbackRow | undefined;
    return row ? toRecord(row) : null;
  }

  /** Fetch only the IDs in the live 100-item queue; no global owner data dump. */
  listFor(recommendationIds: readonly string[]): AdaptiveFeedbackRecord[] {
    if (recommendationIds.length === 0) return [];
    if (recommendationIds.length > 100 || new Set(recommendationIds).size !== recommendationIds.length) {
      throw new Error("Invalid bounded recommendation selection.");
    }
    const placeholders = recommendationIds.map(() => "?").join(",");
    const rows = this.db.prepare(`
      SELECT * FROM personal_assistance_adaptive_feedback_v1
      WHERE recommendation_id IN (${placeholders})
      ORDER BY recommendation_id ASC
    `).all(...recommendationIds) as FeedbackRow[];
    return rows.map(toRecord);
  }

  /** Bounded, title-free audit of explicit actions. */
  history(recommendationId: string, limit = 20): Array<{
    verdict: AdaptiveFeedbackVerdict;
    revisitAt: string | null;
    recordedAt: string;
    revision: number;
  }> {
    if (!/^recommendation:(responsibility|health):[A-Za-z0-9_-]+$/u.test(recommendationId) ||
        !Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("Invalid feedback history selection.");
    const rows = this.db.prepare(`
      SELECT * FROM personal_assistance_adaptive_feedback_action_v1
      WHERE recommendation_id = ? ORDER BY recorded_at DESC, action_key DESC LIMIT ?
    `).all(recommendationId, limit) as FeedbackActionRow[];
    return rows.map((row) => ({
      verdict: row.verdict as AdaptiveFeedbackVerdict,
      revisitAt: row.revisit_at,
      recordedAt: row.recorded_at,
      revision: row.revision_after,
    }));
  }

  /** Atomic owner action; never writes source responsibilities or policy tables. */
  record(
    recommendation: Readonly<AdaptiveRecommendation>,
    input: AdaptiveFeedbackAction,
    now = new Date(),
  ): AdaptiveFeedbackResult {
    const action = normalizedInput(input, now);
    if (action.recommendationId !== recommendation.id ||
        recommendation.id !== `recommendation:${recommendation.sourceItemId}`) {
      throw new Error("Feedback target does not match the current recommendation.");
    }
    const signature = recommendationEvidenceSignature(recommendation);
    return this.db.transaction(() => {
      const replay = this.db.prepare(`
        SELECT * FROM personal_assistance_adaptive_feedback_action_v1 WHERE action_key = ?
      `).get(action.actionKey) as FeedbackActionRow | undefined;
      if (replay) {
        if (replay.recommendation_id !== action.recommendationId ||
            replay.evidence_signature !== signature ||
            replay.verdict !== action.verdict ||
            replay.revisit_at !== action.revisitAt ||
            replay.expected_revision !== action.expectedRevision) {
          throw new Error("Feedback action key reused for a different request.");
        }
        const current = this.get(action.recommendationId);
        if (!current) throw new Error("Missing feedback record for replay.");
        return { disposition: "replayed", feedback: current } as const;
      }
      const previous = this.get(action.recommendationId);
      if ((previous?.revision ?? 0) !== action.expectedRevision) {
        throw new Error("Feedback revision conflict; refresh before retrying.");
      }
      const next: AdaptiveFeedbackRecord = {
        recommendationId: recommendation.id,
        sourceItemId: recommendation.sourceItemId,
        evidenceSignature: signature,
        verdict: action.verdict,
        revisitAt: action.revisitAt,
        revision: action.expectedRevision + 1,
        updatedAt: now.toISOString(),
      };
      this.db.prepare(`
        INSERT INTO personal_assistance_adaptive_feedback_v1
          (recommendation_id,source_item_id,evidence_signature,verdict,revisit_at,revision,updated_at)
        VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(recommendation_id) DO UPDATE SET
          source_item_id=excluded.source_item_id,
          evidence_signature=excluded.evidence_signature,
          verdict=excluded.verdict,
          revisit_at=excluded.revisit_at,
          revision=excluded.revision,
          updated_at=excluded.updated_at
      `).run(next.recommendationId,next.sourceItemId,next.evidenceSignature,next.verdict,
        next.revisitAt,next.revision,next.updatedAt);
      this.db.prepare(`
        INSERT INTO personal_assistance_adaptive_feedback_action_v1
          (action_key,recommendation_id,evidence_signature,verdict,revisit_at,
           expected_revision,revision_after,recorded_at)
        VALUES (?,?,?,?,?,?,?,?)
      `).run(action.actionKey,next.recommendationId,signature,action.verdict,action.revisitAt,
        action.expectedRevision,next.revision,next.updatedAt);
      return { disposition: "recorded", feedback: next } as const;
    }).immediate();
  }
}

export type FeedbackPresentation = {
  verdict: AdaptiveFeedbackVerdict | null;
  revision: number;
  revisitAt: string | null;
  state: "none" | "useful" | "visible-critical" | "hidden-irrelevant" | "hidden-revisit" |
    "expired" | "evidence-changed" | "cleared";
};

export function applyAdaptiveFeedback(
  snapshot: Readonly<AdaptiveRecommendationSnapshot>,
  records: readonly AdaptiveFeedbackRecord[],
  now = new Date(),
  limit = 25,
  includeHidden = false,
) {
  if (!Number.isFinite(now.getTime()) || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid adaptive feedback presentation parameters.");
  }
  const byId = new Map(records.map((record) => [record.recommendationId, record]));
  if (byId.size !== records.length) throw new Error("Duplicate feedback records.");
  let hiddenIrrelevant = 0;
  let hiddenRevisit = 0;
  let staleIgnored = 0;
  const classified = snapshot.items.map((recommendation) => {
    const record = byId.get(recommendation.id);
    let feedback: FeedbackPresentation = {
      verdict: record?.verdict ?? null,
      revision: record?.revision ?? 0,
      revisitAt: record?.revisitAt ?? null,
      state: "none",
    };
    if (record) {
      if (record.evidenceSignature !== recommendationEvidenceSignature(recommendation)) {
        feedback = { ...feedback, state: "evidence-changed" };
        staleIgnored++;
      } else if (record.verdict === "clear") feedback = { ...feedback, state: "cleared" };
      else if (record.verdict === "useful") feedback = { ...feedback, state: "useful" };
      else if (record.verdict === "irrelevant" &&
          Date.parse(record.updatedAt) + IRRELEVANT_TTL_MS <= now.getTime()) {
        feedback = { ...feedback, state: "expired" };
      } else if (record.verdict === "revisit-later" &&
          (record.revisitAt === null || Date.parse(record.revisitAt) <= now.getTime())) {
        feedback = { ...feedback, state: "expired" };
      } else if (recommendation.priority === "critical") {
        feedback = { ...feedback, state: "visible-critical" };
      } else if (record.verdict === "irrelevant") {
        feedback = { ...feedback, state: "hidden-irrelevant" };
        hiddenIrrelevant++;
      } else if (record.verdict === "revisit-later") {
        feedback = { ...feedback, state: "hidden-revisit" };
        hiddenRevisit++;
      }
    }
    return { ...recommendation, feedback };
  });
  const visible = classified.filter((item) => includeHidden ||
    (item.feedback.state !== "hidden-irrelevant" && item.feedback.state !== "hidden-revisit"));
  return {
    ...snapshot,
    returned: Math.min(visible.length, limit),
    items: visible.slice(0, limit),
    feedbackSummary: {
      sourceItemsConsidered: snapshot.items.length,
      visibleMatching: snapshot.items.length - hiddenIrrelevant - hiddenRevisit,
      hiddenIrrelevant,
      hiddenRevisit,
      staleEvidenceIgnored: staleIgnored,
      includeHidden,
      evidenceBound: true,
      inferredLearning: false,
      preferencesChanged: false,
      rankingChanged: false,
    },
  };
}

/** Lazy live database: tests with private SQLite never open the owner's DB. */
export async function liveAdaptiveFeedbackStore(): Promise<AdaptiveFeedbackStore> {
  const { personalAssistanceDb } = await import("../persistence");
  return new AdaptiveFeedbackStore(personalAssistanceDb);
}
