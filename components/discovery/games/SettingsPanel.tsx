"use client";

import { useState } from "react";

import { RadarIcon } from "./RadarIcon";
import type {
  AdultSettings,
  FeedbackCandidate,
  Platform,
  PreferenceProfile,
  PreferenceWeight,
  SchedulerSettings,
} from "./types";
import styles from "./game-radar.module.css";

const PLATFORMS: Array<{ value: Platform; label: string }> = [
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
  { value: "macos", label: "macOS" },
  { value: "browser", label: "Browser" },
];

export function SettingsPanel({
  open,
  profile,
  weights,
  scheduler,
  adultSettings,
  candidates,
  busy,
  onClose,
  onSave,
  onRunScheduleCheck,
  onCandidateReview,
}: {
  open: boolean;
  profile: PreferenceProfile | null;
  weights: PreferenceWeight[];
  scheduler: SchedulerSettings | null;
  adultSettings: AdultSettings;
  candidates: FeedbackCandidate[];
  busy: boolean;
  onClose: () => void;
  onSave: (
    profile: PreferenceProfile,
    scheduler: SchedulerSettings | null,
    adultSettings: AdultSettings,
  ) => Promise<void>;
  onRunScheduleCheck: () => Promise<void>;
  onCandidateReview: (
    id: string,
    status: "approved" | "rejected",
  ) => Promise<void>;
}) {
  if (!open || !profile) return null;

  return (
    <SettingsForm
      key={`${profile.id}:${profile.updatedAt}:${scheduler?.updatedAt ?? "none"}`}
      profile={profile}
      weights={weights}
      scheduler={scheduler}
      adultSettings={adultSettings}
      candidates={candidates}
      busy={busy}
      onClose={onClose}
      onSave={onSave}
      onRunScheduleCheck={onRunScheduleCheck}
      onCandidateReview={onCandidateReview}
    />
  );
}

function SettingsForm({
  profile,
  weights,
  scheduler,
  adultSettings,
  candidates,
  busy,
  onClose,
  onSave,
  onRunScheduleCheck,
  onCandidateReview,
}: {
  profile: PreferenceProfile;
  weights: PreferenceWeight[];
  scheduler: SchedulerSettings | null;
  adultSettings: AdultSettings;
  candidates: FeedbackCandidate[];
  busy: boolean;
  onClose: () => void;
  onSave: (
    profile: PreferenceProfile,
    scheduler: SchedulerSettings | null,
    adultSettings: AdultSettings,
  ) => Promise<void>;
  onRunScheduleCheck: () => Promise<void>;
  onCandidateReview: (
    id: string,
    status: "approved" | "rejected",
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState(profile);
  const [scheduleDraft, setScheduleDraft] = useState(scheduler);
  const [adultDraft, setAdultDraft] = useState(adultSettings);

  const togglePlatform = (platform: Platform) => {
    setDraft((current) => ({
      ...current,
      preferredPlatforms: current.preferredPlatforms.includes(platform)
        ? current.preferredPlatforms.filter((item) => item !== platform)
        : [...current.preferredPlatforms, platform],
    }));
  };

  const topWeights = [...weights]
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, 12);
  const reviewCandidates = candidates
    .filter(
      (candidate) =>
        candidate.status === "candidate" &&
        (candidate.observationCount >= 3 || Math.abs(candidate.observedWeight) >= 2),
    )
    .slice(0, 8);

  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={onClose}>
      <aside
        className={`${styles.detailsDrawer} ${styles.settingsDrawer}`}
        role="dialog"
        aria-modal="true"
        aria-label="Game Radar settings"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <div>
            <span className={styles.eyebrow}>PREFERENCE CORE // STAGE J</span>
            <h2>Radar Settings</h2>
          </div>
          <button className={styles.iconAction} type="button" onClick={onClose} aria-label="Close settings">
            <RadarIcon name="close" />
          </button>
        </div>

        <div className={styles.formGrid}>
          <fieldset className={styles.fieldWide}>
            <legend>PREFERRED PLATFORMS</legend>
            <div className={styles.checkRow}>
              {PLATFORMS.map((platform) => (
                <label className={styles.checkPill} key={platform.value}>
                  <input
                    type="checkbox"
                    checked={draft.preferredPlatforms.includes(platform.value)}
                    onChange={() => togglePlatform(platform.value)}
                  />
                  <span>{platform.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            <span>MAXIMUM PRICE</span>
            <input
              inputMode="decimal"
              value={draft.maximumPriceMinor === undefined ? "" : String(draft.maximumPriceMinor / 100)}
              onChange={(event) => {
                const value = event.target.value.trim();
                setDraft({
                  ...draft,
                  maximumPriceMinor: value === "" ? undefined : Math.max(0, Math.round(Number(value) * 100)),
                });
              }}
              placeholder="No limit"
            />
          </label>

          <label>
            <span>MINIMUM SCORE</span>
            <input
              type="number"
              min="0"
              max="100"
              value={draft.minimumScore}
              onChange={(event) => setDraft({ ...draft, minimumScore: Number(event.target.value) })}
            />
          </label>

          <label className={styles.toggleField}>
            <input type="checkbox" checked={draft.allowFree} onChange={(event) => setDraft({ ...draft, allowFree: event.target.checked })} />
            <span>Allow free games</span>
          </label>
          <label className={styles.toggleField}>
            <input type="checkbox" checked={draft.allowPaid} onChange={(event) => setDraft({ ...draft, allowPaid: event.target.checked })} />
            <span>Allow paid games</span>
          </label>
          <label className={styles.toggleField}>
            <input type="checkbox" checked={draft.allowBrowserGames} onChange={(event) => setDraft({ ...draft, allowBrowserGames: event.target.checked })} />
            <span>Allow browser games</span>
          </label>
          <label className={styles.toggleField}>
            <input type="checkbox" checked={adultDraft.blurCoversByDefault} onChange={(event) => setAdultDraft({ ...adultDraft, blurCoversByDefault: event.target.checked })} />
            <span>Blur covers by default</span>
          </label>
          <label className={styles.toggleField}>
            <input type="checkbox" checked={adultDraft.discreetNotifications} onChange={(event) => setAdultDraft({ ...adultDraft, discreetNotifications: event.target.checked })} />
            <span>Use discreet notification text</span>
          </label>
          <label className={styles.toggleField}>
            <input type="checkbox" checked={adultDraft.ageGateRequired} onChange={(event) => setAdultDraft({ ...adultDraft, ageGateRequired: event.target.checked })} />
            <span>Require 18+ confirmation each session</span>
          </label>
          <label className={styles.toggleField}>
            <input type="checkbox" checked={adultDraft.blockUnknownAgeContent} onChange={(event) => setAdultDraft({ ...adultDraft, blockUnknownAgeContent: event.target.checked })} />
            <span>Block unclear age-related content</span>
          </label>
        </div>

        {scheduleDraft && (
          <section className={styles.drawerSection}>
            <h3>AUTOMATIC REFRESH</h3>
            <div className={styles.formGrid}>
              <label className={styles.toggleField}>
                <input
                  type="checkbox"
                  checked={scheduleDraft.enabled}
                  onChange={(event) => setScheduleDraft({ ...scheduleDraft, enabled: event.target.checked })}
                />
                <span>Enable scheduler</span>
              </label>
              <label className={styles.toggleField}>
                <input
                  type="checkbox"
                  checked={scheduleDraft.runOnStartup}
                  onChange={(event) => setScheduleDraft({ ...scheduleDraft, runOnStartup: event.target.checked })}
                />
                <span>Run stale check on startup</span>
              </label>
              <label>
                <span>CHECK INTERVAL HOURS</span>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={scheduleDraft.intervalHours}
                  onChange={(event) => setScheduleDraft({ ...scheduleDraft, intervalHours: Number(event.target.value) })}
                />
              </label>
              <label>
                <span>STALE AFTER HOURS</span>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={scheduleDraft.staleAfterHours}
                  onChange={(event) => setScheduleDraft({ ...scheduleDraft, staleAfterHours: Number(event.target.value) })}
                />
              </label>
              <label>
                <span>PREFERRED LOCAL HOUR</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={scheduleDraft.preferredLocalHour}
                  onChange={(event) => setScheduleDraft({ ...scheduleDraft, preferredLocalHour: Number(event.target.value) })}
                />
              </label>
              <label>
                <span>TIMEZONE</span>
                <input
                  value={scheduleDraft.timezone}
                  onChange={(event) => setScheduleDraft({ ...scheduleDraft, timezone: event.target.value })}
                />
              </label>
            </div>
            <div className={styles.systemReadout}>
              <span>LAST SCHEDULER RESULT</span>
              <strong>{scheduleDraft.lastResult.toUpperCase()}</strong>
              <span>LAST CHECK</span>
              <strong>{scheduleDraft.lastCheckedAt ?? "NOT RECORDED"}</strong>
            </div>
            <button className={styles.actionButton} type="button" disabled={busy} onClick={() => void onRunScheduleCheck()}>
              <RadarIcon name="refresh" /> RUN STALE CHECK
            </button>
          </section>
        )}

        <section className={styles.drawerSection}>
          <h3>STRONGEST ACTIVE WEIGHTS</h3>
          <div className={styles.weightGrid}>
            {topWeights.map((weight) => (
              <div key={weight.id}>
                <span>{weight.featureType}</span>
                <strong>{weight.featureValue}</strong>
                <i className={weight.weight >= 0 ? styles.positiveWeight : styles.negativeWeight}>
                  {weight.weight > 0 ? "+" : ""}{weight.weight.toFixed(1)}
                </i>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.drawerSection}>
          <h3>REVIEWABLE TASTE OBSERVATIONS</h3>
          {reviewCandidates.length === 0 ? (
            <p className={styles.reasonPanel}>No feedback observation has crossed the review threshold yet.</p>
          ) : (
            <div className={styles.feedbackCandidateList}>
              {reviewCandidates.map((candidate) => (
                <div key={candidate.id}>
                  <span>{candidate.featureType}</span>
                  <strong>{candidate.featureValue}</strong>
                  <i>{candidate.observedWeight > 0 ? "+" : ""}{candidate.observedWeight.toFixed(2)}</i>
                  <small>{candidate.observationCount} observations</small>
                  <button type="button" disabled={busy} onClick={() => void onCandidateReview(candidate.id, "approved")}>APPROVE</button>
                  <button type="button" disabled={busy} onClick={() => void onCandidateReview(candidate.id, "rejected")}>REJECT</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className={styles.drawerActions}>
          <button className={styles.openButton} type="button" disabled={busy} onClick={() => onSave({ ...draft, excludeNsfw: false }, scheduleDraft, adultDraft)}>
            SAVE SETTINGS <RadarIcon name="check" />
          </button>
        </div>
      </aside>
    </div>
  );
}
