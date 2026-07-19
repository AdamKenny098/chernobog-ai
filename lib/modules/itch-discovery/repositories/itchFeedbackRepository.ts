import type Database from "better-sqlite3";

import type {
  ItchFeedbackCandidateStatus,
  ItchWeightFeatureType,
} from "../contract";
import {
  createItchId,
  nowIso,
  parseJson,
  stringifyJson,
} from "../database/helpers";
import type {
  ItchFeedbackCandidate,
  ItchFeedbackLearningRun,
  ItchUserSignal,
} from "../types";

type FeedbackRunRow = {
  id: string;
  profile_id: string;
  started_at: string;
  finished_at: string | null;
  status: ItchFeedbackLearningRun["status"];
  signals_scanned: number;
  signals_applied: number;
  weights_changed: number;
  candidates_created: number;
  summary_json: string;
  errors_json: string;
};

type FeedbackCandidateRow = {
  id: string;
  profile_id: string;
  feature_type: ItchWeightFeatureType;
  feature_value: string;
  observed_weight: number;
  observation_count: number;
  confidence: number;
  status: ItchFeedbackCandidateStatus;
  evidence_json: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
};

type SignalRow = {
  id: string;
  game_id: string;
  signal_type: ItchUserSignal["signalType"];
  signal_value: number | null;
  created_at: string;
  metadata_json: string | null;
};

export type FeedbackFeatureDelta = {
  featureType: ItchWeightFeatureType;
  featureValue: string;
  delta: number;
  gameId: string;
  signalId: string;
  signalType: ItchUserSignal["signalType"];
};

export class ItchFeedbackRepository {
  constructor(private readonly db: Database.Database) {}

  startRun(profileId: string, startedAt = nowIso()): ItchFeedbackLearningRun {
    const id = createItchId("itch_feedback_run");
    this.db
      .prepare(
        `INSERT INTO itch_feedback_learning_runs (
          id, profile_id, started_at, status
        ) VALUES (?, ?, ?, 'running')`,
      )
      .run(id, profileId, startedAt);

    return this.findRunById(id)!;
  }

  finishRun(
    id: string,
    input: {
      status: Exclude<ItchFeedbackLearningRun["status"], "running">;
      signalsScanned: number;
      signalsApplied: number;
      weightsChanged: number;
      candidatesCreated: number;
      summary?: Record<string, unknown>;
      errors?: Array<Record<string, unknown>>;
      finishedAt?: string;
    },
  ): ItchFeedbackLearningRun | null {
    this.db
      .prepare(
        `UPDATE itch_feedback_learning_runs SET
          finished_at = ?, status = ?, signals_scanned = ?,
          signals_applied = ?, weights_changed = ?, candidates_created = ?,
          summary_json = ?, errors_json = ?
         WHERE id = ?`,
      )
      .run(
        input.finishedAt ?? nowIso(),
        input.status,
        input.signalsScanned,
        input.signalsApplied,
        input.weightsChanged,
        input.candidatesCreated,
        stringifyJson(input.summary ?? {}),
        stringifyJson(input.errors ?? []),
        id,
      );

    return this.findRunById(id);
  }

  findRunById(id: string): ItchFeedbackLearningRun | null {
    const row = this.db
      .prepare("SELECT * FROM itch_feedback_learning_runs WHERE id = ?")
      .get(id) as FeedbackRunRow | undefined;
    return row ? this.mapRun(row) : null;
  }

  listUnappliedSignals(options: {
    signalIds?: string[];
    limit?: number;
  } = {}): ItchUserSignal[] {
    const limit = Math.max(1, Math.min(10_000, Math.floor(options.limit ?? 500)));
    const ids = options.signalIds?.filter(Boolean) ?? [];
    const whereIds = ids.length > 0
      ? `AND s.id IN (${ids.map(() => "?").join(",")})`
      : "";

    const rows = this.db
      .prepare(
        `SELECT s.* FROM itch_user_signals s
         LEFT JOIN itch_feedback_signal_applications a ON a.signal_id = s.id
         WHERE a.signal_id IS NULL
           ${whereIds}
         ORDER BY s.created_at ASC, s.id ASC
         LIMIT ?`,
      )
      .all(...ids, limit) as SignalRow[];

    return rows.map((row) => ({
      id: row.id,
      gameId: row.game_id,
      signalType: row.signal_type,
      signalValue: row.signal_value ?? undefined,
      createdAt: row.created_at,
      metadata: parseJson<Record<string, unknown> | undefined>(
        row.metadata_json,
        undefined,
      ),
    }));
  }

  markSignalApplied(input: {
    signalId: string;
    runId: string;
    profileId: string;
    appliedAt?: string;
    deltas: FeedbackFeatureDelta[];
  }): boolean {
    const result = this.db
      .prepare(
        `INSERT OR IGNORE INTO itch_feedback_signal_applications (
          signal_id, run_id, profile_id, applied_at, delta_json
        ) VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        input.signalId,
        input.runId,
        input.profileId,
        input.appliedAt ?? nowIso(),
        stringifyJson(input.deltas),
      );
    return result.changes > 0;
  }

  upsertCandidate(input: {
    profileId: string;
    featureType: ItchWeightFeatureType;
    featureValue: string;
    observedWeight: number;
    evidence: Record<string, unknown>;
    now?: string;
  }): ItchFeedbackCandidate {
    const timestamp = input.now ?? nowIso();
    const existing = this.findCandidate(
      input.profileId,
      input.featureType,
      input.featureValue,
    );
    const evidence = existing
      ? [...existing.evidence, input.evidence].slice(-25)
      : [input.evidence];
    const observationCount = (existing?.observationCount ?? 0) + 1;
    const confidence = Math.min(1, 0.15 + observationCount * 0.08);

    this.db
      .prepare(
        `INSERT INTO itch_feedback_candidates (
          id, profile_id, feature_type, feature_value, observed_weight,
          observation_count, confidence, status, evidence_json,
          created_at, updated_at, reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?, NULL)
        ON CONFLICT(profile_id, feature_type, feature_value) DO UPDATE SET
          observed_weight = excluded.observed_weight,
          observation_count = excluded.observation_count,
          confidence = excluded.confidence,
          evidence_json = excluded.evidence_json,
          updated_at = excluded.updated_at,
          status = CASE
            WHEN itch_feedback_candidates.status IN ('approved', 'rejected')
            THEN itch_feedback_candidates.status
            ELSE 'candidate'
          END`,
      )
      .run(
        existing?.id ?? createItchId("itch_feedback_candidate"),
        input.profileId,
        input.featureType,
        input.featureValue,
        input.observedWeight,
        observationCount,
        confidence,
        stringifyJson(evidence),
        existing?.createdAt ?? timestamp,
        timestamp,
      );

    return this.findCandidate(
      input.profileId,
      input.featureType,
      input.featureValue,
    )!;
  }

  findCandidate(
    profileId: string,
    featureType: ItchWeightFeatureType,
    featureValue: string,
  ): ItchFeedbackCandidate | null {
    const row = this.db
      .prepare(
        `SELECT * FROM itch_feedback_candidates
         WHERE profile_id = ? AND feature_type = ? AND feature_value = ?`,
      )
      .get(profileId, featureType, featureValue) as FeedbackCandidateRow | undefined;
    return row ? this.mapCandidate(row) : null;
  }

  listCandidates(
    profileId: string,
    status?: ItchFeedbackCandidateStatus,
  ): ItchFeedbackCandidate[] {
    const rows = status
      ? (this.db
          .prepare(
            `SELECT * FROM itch_feedback_candidates
             WHERE profile_id = ? AND status = ?
             ORDER BY ABS(observed_weight) DESC, confidence DESC, feature_value ASC`,
          )
          .all(profileId, status) as FeedbackCandidateRow[])
      : (this.db
          .prepare(
            `SELECT * FROM itch_feedback_candidates
             WHERE profile_id = ?
             ORDER BY CASE status WHEN 'candidate' THEN 0 ELSE 1 END,
                      ABS(observed_weight) DESC, confidence DESC, feature_value ASC`,
          )
          .all(profileId) as FeedbackCandidateRow[]);
    return rows.map((row) => this.mapCandidate(row));
  }

  updateCandidateStatus(
    id: string,
    status: ItchFeedbackCandidateStatus,
    reviewedAt = nowIso(),
  ): ItchFeedbackCandidate | null {
    this.db
      .prepare(
        `UPDATE itch_feedback_candidates
         SET status = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(status, reviewedAt, reviewedAt, id);
    const row = this.db
      .prepare("SELECT * FROM itch_feedback_candidates WHERE id = ?")
      .get(id) as FeedbackCandidateRow | undefined;
    return row ? this.mapCandidate(row) : null;
  }

  countAppliedSignals(profileId?: string): number {
    const row = profileId
      ? (this.db
          .prepare(
            `SELECT COUNT(*) AS count FROM itch_feedback_signal_applications
             WHERE profile_id = ?`,
          )
          .get(profileId) as { count: number })
      : (this.db
          .prepare(
            "SELECT COUNT(*) AS count FROM itch_feedback_signal_applications",
          )
          .get() as { count: number });
    return row.count;
  }

  private mapRun(row: FeedbackRunRow): ItchFeedbackLearningRun {
    return {
      id: row.id,
      profileId: row.profile_id,
      startedAt: row.started_at,
      finishedAt: row.finished_at ?? undefined,
      status: row.status,
      signalsScanned: row.signals_scanned,
      signalsApplied: row.signals_applied,
      weightsChanged: row.weights_changed,
      candidatesCreated: row.candidates_created,
      summary: parseJson(row.summary_json, {}),
      errors: parseJson(row.errors_json, []),
    };
  }

  private mapCandidate(row: FeedbackCandidateRow): ItchFeedbackCandidate {
    return {
      id: row.id,
      profileId: row.profile_id,
      featureType: row.feature_type,
      featureValue: row.feature_value,
      observedWeight: row.observed_weight,
      observationCount: row.observation_count,
      confidence: row.confidence,
      status: row.status,
      evidence: parseJson(row.evidence_json, []),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      reviewedAt: row.reviewed_at ?? undefined,
    };
  }
}
