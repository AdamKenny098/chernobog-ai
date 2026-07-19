import type Database from "better-sqlite3";

export type ItchDiscoveryMigration = {
  version: number;
  name: string;
  sql: string;
};

const INITIAL_SCHEMA_SQL = String.raw`
CREATE TABLE itch_games (
  id TEXT PRIMARY KEY,
  canonical_url TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  creator_name TEXT,
  short_description TEXT,
  cover_image_url TEXT,
  classification TEXT NOT NULL DEFAULT 'game'
    CHECK (classification IN ('game', 'asset', 'comic', 'soundtrack', 'other')),
  price_text TEXT,
  minimum_price_minor INTEGER,
  currency TEXT,
  is_free INTEGER NOT NULL DEFAULT 0 CHECK (is_free IN (0, 1)),
  is_on_sale INTEGER NOT NULL DEFAULT 0 CHECK (is_on_sale IN (0, 1)),
  sale_text TEXT,
  supports_windows INTEGER NOT NULL DEFAULT 0 CHECK (supports_windows IN (0, 1)),
  supports_linux INTEGER NOT NULL DEFAULT 0 CHECK (supports_linux IN (0, 1)),
  supports_macos INTEGER NOT NULL DEFAULT 0 CHECK (supports_macos IN (0, 1)),
  supports_browser INTEGER NOT NULL DEFAULT 0 CHECK (supports_browser IN (0, 1)),
  is_nsfw INTEGER NOT NULL DEFAULT 0 CHECK (is_nsfw IN (0, 1)),
  published_at TEXT,
  updated_at_source TEXT,
  first_discovered_at TEXT NOT NULL,
  last_discovered_at TEXT NOT NULL,
  last_enriched_at TEXT,
  metadata_status TEXT NOT NULL DEFAULT 'discovered'
    CHECK (metadata_status IN ('discovered', 'partial', 'enriched', 'stale', 'failed')),
  metadata_hash TEXT,
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE itch_game_tags (
  game_id TEXT NOT NULL REFERENCES itch_games(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  PRIMARY KEY (game_id, tag)
) STRICT;

CREATE TABLE itch_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('rss', 'tag-rss', 'sale-rss', 'creator-rss', 'manual')),
  source_url TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  priority INTEGER NOT NULL DEFAULT 50,
  refresh_interval_hours INTEGER NOT NULL DEFAULT 24 CHECK (refresh_interval_hours > 0),
  etag TEXT,
  last_modified TEXT,
  last_attempt_at TEXT,
  last_success_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE itch_discoveries (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES itch_games(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES itch_sources(id) ON DELETE CASCADE,
  discovered_at TEXT NOT NULL,
  source_position INTEGER,
  source_title TEXT,
  source_guid TEXT,
  dedupe_key TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE itch_preference_profile (
  id TEXT PRIMARY KEY,
  profile_name TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  preferred_platforms_json TEXT NOT NULL DEFAULT '[]',
  maximum_price_minor INTEGER,
  allow_free INTEGER NOT NULL DEFAULT 1 CHECK (allow_free IN (0, 1)),
  allow_paid INTEGER NOT NULL DEFAULT 1 CHECK (allow_paid IN (0, 1)),
  allow_browser_games INTEGER NOT NULL DEFAULT 1 CHECK (allow_browser_games IN (0, 1)),
  exclude_nsfw INTEGER NOT NULL DEFAULT 1 CHECK (exclude_nsfw IN (0, 1)),
  minimum_score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE itch_preference_weights (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES itch_preference_profile(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL
    CHECK (feature_type IN ('tag', 'phrase', 'creator', 'platform', 'source')),
  feature_value TEXT NOT NULL,
  weight REAL NOT NULL,
  origin TEXT NOT NULL
    CHECK (origin IN ('manual', 'feedback', 'vault', 'default')),
  confidence REAL NOT NULL DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (profile_id, feature_type, feature_value, origin)
) STRICT;

CREATE TABLE itch_recommendations (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES itch_games(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES itch_preference_profile(id) ON DELETE CASCADE,
  batch_date TEXT NOT NULL,
  score REAL NOT NULL,
  score_breakdown_json TEXT NOT NULL,
  reason_text TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'unseen'
    CHECK (state IN ('unseen', 'seen', 'saved', 'hidden', 'opened', 'played')),
  recommended_at TEXT NOT NULL,
  first_seen_at TEXT,
  last_action_at TEXT,
  UNIQUE (game_id, profile_id)
) STRICT;

CREATE TABLE itch_user_signals (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES itch_games(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL
    CHECK (signal_type IN ('shown', 'opened', 'saved', 'hidden', 'played', 'more_like_this', 'less_like_this')),
  signal_value REAL,
  created_at TEXT NOT NULL,
  metadata_json TEXT
) STRICT;

CREATE TABLE itch_refresh_runs (
  id TEXT PRIMARY KEY,
  trigger TEXT NOT NULL
    CHECK (trigger IN ('manual', 'schedule', 'startup-stale')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  sources_attempted INTEGER NOT NULL DEFAULT 0,
  sources_succeeded INTEGER NOT NULL DEFAULT 0,
  entries_scanned INTEGER NOT NULL DEFAULT 0,
  unique_games_found INTEGER NOT NULL DEFAULT 0,
  new_games_added INTEGER NOT NULL DEFAULT 0,
  games_updated INTEGER NOT NULL DEFAULT 0,
  games_enriched INTEGER NOT NULL DEFAULT 0,
  games_rejected INTEGER NOT NULL DEFAULT 0,
  recommendations_created INTEGER NOT NULL DEFAULT 0,
  errors_json TEXT NOT NULL DEFAULT '[]'
) STRICT;

CREATE TABLE itch_game_watches (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL UNIQUE REFERENCES itch_games(id) ON DELETE CASCADE,
  watch_reason TEXT NOT NULL
    CHECK (watch_reason IN ('saved', 'manual', 'opened', 'played', 'creator-follow')),
  watch_devlogs INTEGER NOT NULL DEFAULT 1 CHECK (watch_devlogs IN (0, 1)),
  watch_price INTEGER NOT NULL DEFAULT 1 CHECK (watch_price IN (0, 1)),
  watch_metadata INTEGER NOT NULL DEFAULT 0 CHECK (watch_metadata IN (0, 1)),
  watch_platforms INTEGER NOT NULL DEFAULT 1 CHECK (watch_platforms IN (0, 1)),
  watch_sale INTEGER NOT NULL DEFAULT 1 CHECK (watch_sale IN (0, 1)),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  last_checked_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE itch_devlog_entries (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES itch_games(id) ON DELETE CASCADE,
  entry_guid TEXT NOT NULL,
  entry_url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  published_at TEXT,
  post_type TEXT NOT NULL DEFAULT 'unknown'
    CHECK (post_type IN ('major-update', 'update', 'announcement', 'long-form', 'unknown')),
  content_hash TEXT NOT NULL,
  first_seen_at TEXT NOT NULL,
  UNIQUE (game_id, entry_guid)
) STRICT;

CREATE TABLE itch_game_snapshots (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES itch_games(id) ON DELETE CASCADE,
  captured_at TEXT NOT NULL,
  metadata_hash TEXT NOT NULL,
  price_text TEXT,
  is_free INTEGER NOT NULL CHECK (is_free IN (0, 1)),
  is_on_sale INTEGER NOT NULL CHECK (is_on_sale IN (0, 1)),
  sale_text TEXT,
  platforms_json TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  title TEXT NOT NULL,
  short_description_hash TEXT,
  availability INTEGER NOT NULL CHECK (availability IN (0, 1))
) STRICT;

CREATE TABLE itch_change_events (
  id TEXT PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES itch_games(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL
    CHECK (change_type IN ('devlog', 'major-update', 'price', 'sale', 'platform', 'tags', 'page', 'availability')),
  confidence TEXT NOT NULL
    CHECK (confidence IN ('confirmed', 'observed', 'inferred')),
  summary TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  source_url TEXT,
  detected_at TEXT NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE
) STRICT;

CREATE TABLE itch_notifications (
  id TEXT PRIMARY KEY,
  change_event_id TEXT NOT NULL REFERENCES itch_change_events(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL REFERENCES itch_games(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high')),
  state TEXT NOT NULL DEFAULT 'unread'
    CHECK (state IN ('unread', 'read', 'dismissed', 'opened')),
  created_at TEXT NOT NULL,
  read_at TEXT,
  dismissed_at TEXT,
  UNIQUE (change_event_id, notification_type)
) STRICT;

CREATE TABLE itch_filter_presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  rules_json TEXT NOT NULL,
  sort_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE itch_tag_aliases (
  canonical_tag TEXT NOT NULL,
  alias TEXT NOT NULL PRIMARY KEY,
  source TEXT NOT NULL
    CHECK (source IN ('system', 'manual', 'learned'))
) STRICT;

CREATE INDEX idx_itch_games_last_discovered
  ON itch_games(last_discovered_at DESC);
CREATE INDEX idx_itch_games_availability_classification
  ON itch_games(is_available, classification);
CREATE INDEX idx_itch_game_tags_tag
  ON itch_game_tags(tag, game_id);
CREATE INDEX idx_itch_sources_enabled_priority
  ON itch_sources(enabled, priority DESC);
CREATE INDEX idx_itch_discoveries_game
  ON itch_discoveries(game_id, discovered_at DESC);
CREATE INDEX idx_itch_recommendations_profile_state_score
  ON itch_recommendations(profile_id, state, score DESC);
CREATE INDEX idx_itch_user_signals_game_created
  ON itch_user_signals(game_id, created_at DESC);
CREATE INDEX idx_itch_refresh_runs_started
  ON itch_refresh_runs(started_at DESC);
CREATE INDEX idx_itch_game_watches_enabled
  ON itch_game_watches(enabled, last_checked_at);
CREATE INDEX idx_itch_devlog_entries_game_published
  ON itch_devlog_entries(game_id, published_at DESC);
CREATE INDEX idx_itch_game_snapshots_game_captured
  ON itch_game_snapshots(game_id, captured_at DESC);
CREATE INDEX idx_itch_change_events_game_detected
  ON itch_change_events(game_id, detected_at DESC);
CREATE INDEX idx_itch_notifications_state_created
  ON itch_notifications(state, created_at DESC);
`;

const PRICE_KIND_MIGRATION_SQL = String.raw`
ALTER TABLE itch_games ADD COLUMN price_kind TEXT NOT NULL DEFAULT 'unknown'
  CHECK (price_kind IN ('free', 'paid', 'name-your-own-price', 'unknown'));

UPDATE itch_games
SET price_kind = CASE
  WHEN lower(COALESCE(price_text, '')) LIKE '%name your own price%'
    OR lower(COALESCE(price_text, '')) LIKE '%pay what you want%'
    THEN 'name-your-own-price'
  WHEN is_free = 1 THEN 'free'
  WHEN minimum_price_minor IS NOT NULL OR price_text IS NOT NULL THEN 'paid'
  ELSE 'unknown'
END;
`;


const CANONICAL_TAGS_MIGRATION_SQL = String.raw`
CREATE TABLE itch_canonical_tags (
  tag TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN (
      'genre', 'theme', 'perspective', 'mechanic', 'format', 'visual',
      'setting', 'content', 'technology', 'general', 'other'
    )),
  is_filterable INTEGER NOT NULL DEFAULT 1 CHECK (is_filterable IN (0, 1)),
  is_rankable INTEGER NOT NULL DEFAULT 1 CHECK (is_rankable IN (0, 1)),
  source TEXT NOT NULL DEFAULT 'discovered'
    CHECK (source IN ('system', 'manual', 'discovered')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE itch_game_raw_tags (
  game_id TEXT NOT NULL REFERENCES itch_games(id) ON DELETE CASCADE,
  raw_tag TEXT NOT NULL,
  normalized_key TEXT,
  canonical_tag TEXT REFERENCES itch_canonical_tags(tag)
    ON UPDATE CASCADE ON DELETE SET NULL,
  source TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0
    CHECK (confidence >= 0.0 AND confidence <= 1.0),
  resolution TEXT NOT NULL
    CHECK (resolution IN ('direct', 'alias', 'generated', 'legacy', 'rejected')),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  PRIMARY KEY (game_id, raw_tag, source)
) STRICT;

INSERT OR IGNORE INTO itch_canonical_tags (
  tag, display_name, category, is_filterable, is_rankable,
  source, created_at, updated_at
)
SELECT DISTINCT
  tag,
  tag,
  'other',
  1,
  1,
  'discovered',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM itch_game_tags;

INSERT OR IGNORE INTO itch_game_raw_tags (
  game_id, raw_tag, normalized_key, canonical_tag, source,
  confidence, resolution, first_seen_at, last_seen_at
)
SELECT
  game_id,
  tag,
  tag,
  tag,
  source,
  confidence,
  'legacy',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM itch_game_tags;

CREATE INDEX idx_itch_canonical_tags_category
  ON itch_canonical_tags(category, is_filterable, display_name);
CREATE INDEX idx_itch_game_raw_tags_game
  ON itch_game_raw_tags(game_id, last_seen_at DESC);
CREATE INDEX idx_itch_game_raw_tags_canonical
  ON itch_game_raw_tags(canonical_tag, game_id);
`;


const FILTER_INDEXES_MIGRATION_SQL = String.raw`
CREATE INDEX IF NOT EXISTS idx_itch_games_filter_price
  ON itch_games(price_kind, minimum_price_minor, is_free, is_on_sale);
CREATE INDEX IF NOT EXISTS idx_itch_games_filter_platforms
  ON itch_games(supports_windows, supports_linux, supports_macos, supports_browser);
CREATE INDEX IF NOT EXISTS idx_itch_games_filter_dates
  ON itch_games(published_at, updated_at_source, last_discovered_at);
CREATE INDEX IF NOT EXISTS idx_itch_games_filter_metadata
  ON itch_games(metadata_status, is_available, is_nsfw, classification);
CREATE INDEX IF NOT EXISTS idx_itch_games_filter_creator
  ON itch_games(creator_name);
`;

const RECOMMENDATION_RANKING_MIGRATION_SQL = String.raw`
ALTER TABLE itch_recommendations ADD COLUMN rank_position INTEGER;
ALTER TABLE itch_recommendations ADD COLUMN score_version TEXT NOT NULL DEFAULT 'stage-f-v1';

CREATE TABLE itch_recommendation_batches (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES itch_preference_profile(id) ON DELETE CASCADE,
  preset_id TEXT REFERENCES itch_filter_presets(id) ON DELETE SET NULL,
  batch_date TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Europe/Dublin',
  score_version TEXT NOT NULL,
  candidate_count INTEGER NOT NULL DEFAULT 0,
  eligible_count INTEGER NOT NULL DEFAULT 0,
  selected_count INTEGER NOT NULL DEFAULT 0,
  minimum_score REAL NOT NULL DEFAULT 0,
  batch_size INTEGER NOT NULL DEFAULT 20,
  generated_at TEXT NOT NULL,
  config_json TEXT NOT NULL DEFAULT '{}',
  UNIQUE (profile_id, batch_date)
) STRICT;

CREATE INDEX idx_itch_recommendations_profile_batch_score
  ON itch_recommendations(profile_id, batch_date DESC, score DESC);
CREATE INDEX idx_itch_recommendations_profile_rank
  ON itch_recommendations(profile_id, rank_position ASC);
CREATE INDEX idx_itch_recommendation_batches_profile_date
  ON itch_recommendation_batches(profile_id, batch_date DESC);
`;


const UPDATE_WATCHER_MIGRATION_SQL = String.raw`
ALTER TABLE itch_game_watches ADD COLUMN devlog_feed_url TEXT;
ALTER TABLE itch_game_watches ADD COLUMN devlog_etag TEXT;
ALTER TABLE itch_game_watches ADD COLUMN devlog_last_modified TEXT;
ALTER TABLE itch_game_watches ADD COLUMN devlog_initialized_at TEXT;
ALTER TABLE itch_game_watches ADD COLUMN last_snapshot_id TEXT REFERENCES itch_game_snapshots(id) ON DELETE SET NULL;
ALTER TABLE itch_game_watches ADD COLUMN last_success_at TEXT;
ALTER TABLE itch_game_watches ADD COLUMN last_error TEXT;
ALTER TABLE itch_game_watches ADD COLUMN last_error_at TEXT;

CREATE TABLE itch_update_watch_runs (
  id TEXT PRIMARY KEY,
  trigger TEXT NOT NULL
    CHECK (trigger IN ('manual', 'schedule', 'startup-stale')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  watches_attempted INTEGER NOT NULL DEFAULT 0,
  watches_succeeded INTEGER NOT NULL DEFAULT 0,
  devlog_entries_scanned INTEGER NOT NULL DEFAULT 0,
  devlog_entries_added INTEGER NOT NULL DEFAULT 0,
  snapshots_compared INTEGER NOT NULL DEFAULT 0,
  change_events_created INTEGER NOT NULL DEFAULT 0,
  notifications_created INTEGER NOT NULL DEFAULT 0,
  errors_json TEXT NOT NULL DEFAULT '[]'
) STRICT;

CREATE TABLE itch_notification_digests (
  id TEXT PRIMARY KEY,
  digest_date TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'Europe/Dublin',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  notification_ids_json TEXT NOT NULL DEFAULT '[]',
  state TEXT NOT NULL DEFAULT 'unread'
    CHECK (state IN ('unread', 'read')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  read_at TEXT
) STRICT;

CREATE INDEX idx_itch_game_watches_poll_due
  ON itch_game_watches(enabled, last_checked_at, last_success_at);
CREATE INDEX idx_itch_update_watch_runs_started
  ON itch_update_watch_runs(started_at DESC);
CREATE INDEX idx_itch_notification_digests_date
  ON itch_notification_digests(digest_date DESC);
`;



const PIPELINE_ORCHESTRATION_MIGRATION_SQL = String.raw`
CREATE TABLE itch_pipeline_runs (
  id TEXT PRIMARY KEY,
  trigger TEXT NOT NULL
    CHECK (trigger IN ('manual', 'schedule', 'startup-stale')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  current_phase TEXT NOT NULL DEFAULT 'starting'
    CHECK (current_phase IN (
      'starting', 'discovering', 'enriching', 'normalizing',
      'ranking', 'watching', 'digesting', 'completed'
    )),
  rss_refresh_run_id TEXT REFERENCES itch_refresh_runs(id) ON DELETE SET NULL,
  update_watch_run_id TEXT REFERENCES itch_update_watch_runs(id) ON DELETE SET NULL,
  recommendation_batch_id TEXT REFERENCES itch_recommendation_batches(id) ON DELETE SET NULL,
  notification_digest_id TEXT REFERENCES itch_notification_digests(id) ON DELETE SET NULL,
  metrics_json TEXT NOT NULL DEFAULT '{}',
  errors_json TEXT NOT NULL DEFAULT '[]',
  used_cached_catalogue INTEGER NOT NULL DEFAULT 0 CHECK (used_cached_catalogue IN (0, 1))
) STRICT;

CREATE TABLE itch_operation_locks (
  lock_name TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  acquired_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_itch_pipeline_runs_started
  ON itch_pipeline_runs(started_at DESC);
CREATE INDEX idx_itch_pipeline_runs_status
  ON itch_pipeline_runs(status, started_at DESC);
CREATE INDEX idx_itch_operation_locks_expiry
  ON itch_operation_locks(expires_at);
`;


const SCHEDULING_AND_FEEDBACK_MIGRATION_SQL = String.raw`
CREATE TABLE itch_feedback_learning_runs (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES itch_preference_profile(id) ON DELETE CASCADE,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  signals_scanned INTEGER NOT NULL DEFAULT 0,
  signals_applied INTEGER NOT NULL DEFAULT 0,
  weights_changed INTEGER NOT NULL DEFAULT 0,
  candidates_created INTEGER NOT NULL DEFAULT 0,
  summary_json TEXT NOT NULL DEFAULT '{}',
  errors_json TEXT NOT NULL DEFAULT '[]'
) STRICT;

CREATE TABLE itch_feedback_signal_applications (
  signal_id TEXT PRIMARY KEY REFERENCES itch_user_signals(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES itch_feedback_learning_runs(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL REFERENCES itch_preference_profile(id) ON DELETE CASCADE,
  applied_at TEXT NOT NULL,
  delta_json TEXT NOT NULL DEFAULT '{}'
) STRICT;

CREATE TABLE itch_feedback_candidates (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES itch_preference_profile(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL
    CHECK (feature_type IN ('tag', 'phrase', 'creator', 'platform', 'source')),
  feature_value TEXT NOT NULL,
  observed_weight REAL NOT NULL,
  observation_count INTEGER NOT NULL DEFAULT 1,
  confidence REAL NOT NULL DEFAULT 0.1 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  status TEXT NOT NULL DEFAULT 'candidate'
    CHECK (status IN ('candidate', 'approved', 'rejected', 'superseded')),
  evidence_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  reviewed_at TEXT,
  UNIQUE (profile_id, feature_type, feature_value)
) STRICT;

CREATE TABLE itch_scheduler_settings (
  id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  interval_hours INTEGER NOT NULL DEFAULT 24 CHECK (interval_hours BETWEEN 1 AND 720),
  stale_after_hours INTEGER NOT NULL DEFAULT 24 CHECK (stale_after_hours BETWEEN 1 AND 720),
  preferred_local_hour INTEGER NOT NULL DEFAULT 4 CHECK (preferred_local_hour BETWEEN 0 AND 23),
  timezone TEXT NOT NULL DEFAULT 'Europe/Dublin',
  run_on_startup INTEGER NOT NULL DEFAULT 1 CHECK (run_on_startup IN (0, 1)),
  last_checked_at TEXT,
  last_run_at TEXT,
  last_result TEXT NOT NULL DEFAULT 'never'
    CHECK (last_result IN ('never', 'not-due', 'disabled', 'locked', 'completed', 'partial', 'failed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE INDEX idx_itch_feedback_runs_started
  ON itch_feedback_learning_runs(started_at DESC);
CREATE INDEX idx_itch_feedback_candidates_status
  ON itch_feedback_candidates(profile_id, status, ABS(observed_weight) DESC);
CREATE INDEX idx_itch_feedback_applications_profile
  ON itch_feedback_signal_applications(profile_id, applied_at DESC);
`;




const ADULT_DISCOVERY_MIGRATION_SQL = String.raw`
ALTER TABLE itch_games ADD COLUMN adult_status TEXT NOT NULL DEFAULT 'unknown'
  CHECK (adult_status IN ('unknown', 'adult', 'non-adult', 'blocked'));
ALTER TABLE itch_games ADD COLUMN adult_confidence REAL NOT NULL DEFAULT 0.0
  CHECK (adult_confidence >= 0.0 AND adult_confidence <= 1.0);
ALTER TABLE itch_games ADD COLUMN adult_reasons_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE itch_games ADD COLUMN adult_content_tags_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE itch_adult_settings (
  id TEXT PRIMARY KEY CHECK (id = 'default'),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  adult_only INTEGER NOT NULL DEFAULT 1 CHECK (adult_only IN (0, 1)),
  age_gate_required INTEGER NOT NULL DEFAULT 1 CHECK (age_gate_required IN (0, 1)),
  blur_covers_by_default INTEGER NOT NULL DEFAULT 0 CHECK (blur_covers_by_default IN (0, 1)),
  discreet_notifications INTEGER NOT NULL DEFAULT 1 CHECK (discreet_notifications IN (0, 1)),
  hide_explicit_titles INTEGER NOT NULL DEFAULT 0 CHECK (hide_explicit_titles IN (0, 1)),
  block_unknown_age_content INTEGER NOT NULL DEFAULT 1 CHECK (block_unknown_age_content IN (0, 1)),
  hard_excluded_terms_json TEXT NOT NULL DEFAULT '[]',
  preferred_adult_tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE itch_adult_classification_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  games_scanned INTEGER NOT NULL DEFAULT 0,
  adult_count INTEGER NOT NULL DEFAULT 0,
  non_adult_count INTEGER NOT NULL DEFAULT 0,
  unknown_count INTEGER NOT NULL DEFAULT 0,
  blocked_count INTEGER NOT NULL DEFAULT 0
) STRICT;

UPDATE itch_games
SET adult_status = 'adult', adult_confidence = 1.0,
    adult_reasons_json = '["itch-nsfw-flag"]'
WHERE is_nsfw = 1;

UPDATE itch_preference_profile SET exclude_nsfw = 0 WHERE profile_name = 'Default';

CREATE INDEX idx_itch_games_adult_status
  ON itch_games(adult_status, is_available, last_discovered_at DESC);
CREATE INDEX idx_itch_adult_classification_runs_finished
  ON itch_adult_classification_runs(finished_at DESC);
`;

const RELEASE_HARDENING_MIGRATION_SQL = String.raw`
CREATE TABLE itch_maintenance_runs (
  id TEXT PRIMARY KEY,
  operation TEXT NOT NULL
    CHECK (operation IN ('diagnostic', 'backup', 'restore', 'recovery')),
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'partial', 'failed')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  error_message TEXT
) STRICT;

CREATE INDEX idx_itch_maintenance_runs_started
  ON itch_maintenance_runs(started_at DESC);
CREATE INDEX idx_itch_maintenance_runs_operation_status
  ON itch_maintenance_runs(operation, status, started_at DESC);
`;

const ADULT_TAXONOMY_MIGRATION_SQL = String.raw`
CREATE TABLE itch_taxonomy_categories (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 100,
  visible_in_filters INTEGER NOT NULL DEFAULT 1
    CHECK (visible_in_filters IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE itch_taxonomy_entries (
  tag TEXT PRIMARY KEY REFERENCES itch_canonical_tags(tag)
    ON UPDATE CASCADE ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES itch_taxonomy_categories(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  adult_evidence TEXT NOT NULL DEFAULT 'none'
    CHECK (adult_evidence IN ('strong', 'supporting', 'none')),
  safety_role TEXT NOT NULL DEFAULT 'normal'
    CHECK (safety_role IN ('normal', 'review', 'blocked')),
  description TEXT NOT NULL DEFAULT '',
  visible_in_filters INTEGER NOT NULL DEFAULT 1
    CHECK (visible_in_filters IN (0, 1)),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  implied_tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE itch_uncategorized_tags (
  canonical_tag TEXT PRIMARY KEY REFERENCES itch_canonical_tags(tag)
    ON UPDATE CASCADE ON DELETE CASCADE,
  occurrence_count INTEGER NOT NULL DEFAULT 0 CHECK (occurrence_count >= 0),
  game_count INTEGER NOT NULL DEFAULT 0 CHECK (game_count >= 0),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'mapped', 'ignored')),
  suggested_category_id TEXT REFERENCES itch_taxonomy_categories(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  notes TEXT
) STRICT;

CREATE TABLE itch_taxonomy_reclassification_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  games_scanned INTEGER NOT NULL DEFAULT 0,
  games_with_structured_tags INTEGER NOT NULL DEFAULT 0,
  tags_scanned INTEGER NOT NULL DEFAULT 0,
  taxonomy_matches INTEGER NOT NULL DEFAULT 0,
  uncategorised_tags INTEGER NOT NULL DEFAULT 0,
  implied_tags_added INTEGER NOT NULL DEFAULT 0,
  aliases_seeded INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE INDEX idx_itch_taxonomy_categories_order
  ON itch_taxonomy_categories(sort_order, display_name);
CREATE INDEX idx_itch_taxonomy_entries_category
  ON itch_taxonomy_entries(category_id, enabled, visible_in_filters, tag);
CREATE INDEX idx_itch_taxonomy_entries_safety
  ON itch_taxonomy_entries(safety_role, adult_evidence, enabled);
CREATE INDEX idx_itch_uncategorized_tags_review
  ON itch_uncategorized_tags(status, game_count DESC, occurrence_count DESC);
CREATE INDEX idx_itch_taxonomy_runs_finished
  ON itch_taxonomy_reclassification_runs(finished_at DESC);
`;


const EMBEDDED_LISTING_METADATA_MIGRATION_SQL = String.raw`
ALTER TABLE itch_games ADD COLUMN raw_title TEXT;

UPDATE itch_games
SET raw_title = title
WHERE raw_title IS NULL OR trim(raw_title) = '';
`;

const ADULT_DEFAULT_NSFW_VIEW_MIGRATION_SQL = String.raw`
UPDATE itch_adult_settings
SET enabled = 1,
    adult_only = 1,
    blur_covers_by_default = 0,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'default';

UPDATE itch_preference_profile
SET exclude_nsfw = 0,
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE profile_name = 'Default';
`;


const ADULT_PREFERENCE_FILTERS_MIGRATION_SQL = String.raw`
CREATE TABLE itch_adult_preference_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1)),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  metadata_mode TEXT NOT NULL DEFAULT 'permissive'
    CHECK (metadata_mode IN ('strict', 'permissive')),
  default_sort_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE TABLE itch_adult_preference_rules (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES itch_adult_preference_profiles(id) ON DELETE CASCADE,
  taxonomy_tag TEXT NOT NULL REFERENCES itch_canonical_tags(tag)
    ON UPDATE CASCADE ON DELETE CASCADE,
  category_id TEXT REFERENCES itch_taxonomy_categories(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  rule_state TEXT NOT NULL
    CHECK (rule_state IN ('neutral', 'prefer', 'require', 'exclude')),
  weight REAL NOT NULL DEFAULT 0 CHECK (weight >= -8.0 AND weight <= 8.0),
  source TEXT NOT NULL DEFAULT 'system'
    CHECK (source IN ('system', 'manual', 'learned')),
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (profile_id, taxonomy_tag)
) STRICT;

CREATE TABLE itch_adult_profile_compilations (
  id TEXT PRIMARY KEY,
  adult_profile_id TEXT NOT NULL REFERENCES itch_adult_preference_profiles(id) ON DELETE CASCADE,
  filter_preset_id TEXT REFERENCES itch_filter_presets(id) ON DELETE SET NULL,
  preference_profile_id TEXT REFERENCES itch_preference_profile(id) ON DELETE SET NULL,
  compiled_rules_json TEXT NOT NULL DEFAULT '[]',
  compiled_weights_json TEXT NOT NULL DEFAULT '[]',
  compiled_at TEXT NOT NULL,
  UNIQUE (adult_profile_id)
) STRICT;

CREATE INDEX idx_itch_adult_preference_profiles_default
  ON itch_adult_preference_profiles(is_default, enabled, name);
CREATE INDEX idx_itch_adult_preference_rules_profile_state
  ON itch_adult_preference_rules(profile_id, rule_state, taxonomy_tag);
CREATE INDEX idx_itch_adult_preference_rules_category
  ON itch_adult_preference_rules(category_id, rule_state, taxonomy_tag);
CREATE INDEX idx_itch_adult_profile_compilations_profile
  ON itch_adult_profile_compilations(adult_profile_id, compiled_at DESC);
`;


export const ITCH_DISCOVERY_MIGRATIONS: ItchDiscoveryMigration[] = [
  {
    version: 1,
    name: "initial_game_radar_schema",
    sql: INITIAL_SCHEMA_SQL,
  },
  {
    version: 2,
    name: "add_explicit_price_kind",
    sql: PRICE_KIND_MIGRATION_SQL,
  },
  {
    version: 3,
    name: "add_canonical_tag_vocabulary",
    sql: CANONICAL_TAGS_MIGRATION_SQL,
  },
  {
    version: 4,
    name: "add_filter_query_indexes",
    sql: FILTER_INDEXES_MIGRATION_SQL,
  },
  {
    version: 5,
    name: "add_explainable_recommendation_ranking",
    sql: RECOMMENDATION_RANKING_MIGRATION_SQL,
  },
  {
    version: 6,
    name: "add_update_watcher_and_notification_digests",
    sql: UPDATE_WATCHER_MIGRATION_SQL,
  },
  {
    version: 7,
    name: "add_pipeline_orchestration_and_locking",
    sql: PIPELINE_ORCHESTRATION_MIGRATION_SQL,
  },
  {
    version: 8,
    name: "add_scheduling_and_feedback_learning",
    sql: SCHEDULING_AND_FEEDBACK_MIGRATION_SQL,
  },
  {
    version: 9,
    name: "add_release_hardening_maintenance_audit",
    sql: RELEASE_HARDENING_MIGRATION_SQL,
  },
  {
    version: 10,
    name: "add_adult_discovery_safety_and_privacy",
    sql: ADULT_DISCOVERY_MIGRATION_SQL,
  },
  {
    version: 11,
    name: "add_adult_taxonomy_registry_and_review_queue",
    sql: ADULT_TAXONOMY_MIGRATION_SQL,
  },
  {
    version: 12,
    name: "repair_embedded_listing_metadata",
    sql: EMBEDDED_LISTING_METADATA_MIGRATION_SQL,
  },
  {
    version: 13,
    name: "set_adult_nsfw_view_defaults",
    sql: ADULT_DEFAULT_NSFW_VIEW_MIGRATION_SQL,
  },
  {
    version: 14,
    name: "add_adult_preference_profiles_and_four_state_rules",
    sql: ADULT_PREFERENCE_FILTERS_MIGRATION_SQL,
  },
];

export function runItchDiscoveryMigrations(db: Database.Database): number[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS itch_schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);

  const appliedRows = db
    .prepare("SELECT version FROM itch_schema_migrations")
    .all() as Array<{ version: number }>;
  const appliedVersions = new Set(appliedRows.map((row) => row.version));
  const newlyApplied: number[] = [];

  const applyMigration = db.transaction((migration: ItchDiscoveryMigration) => {
    db.exec(migration.sql);
    db.prepare(
      `INSERT INTO itch_schema_migrations (version, name, applied_at)
       VALUES (?, ?, ?)`,
    ).run(migration.version, migration.name, new Date().toISOString());
  });

  for (const migration of ITCH_DISCOVERY_MIGRATIONS) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    applyMigration(migration);
    newlyApplied.push(migration.version);
  }

  return newlyApplied;
}
