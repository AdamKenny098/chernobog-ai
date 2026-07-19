"use client";

import { useMemo, useState } from "react";

import { buildRulesFromDraft, savePreset } from "./gameRadarApi";
import { RadarIcon } from "./RadarIcon";
import type { AdvancedFilterDraft, FilterPreset, Platform } from "./types";
import styles from "./game-radar.module.css";

const INITIAL_DRAFT: AdvancedFilterDraft = {
  name: "",
  includeAnyTags: "",
  includeAllTags: "",
  excludeTags: "",
  platforms: ["windows"],
  delivery: "any",
  priceMode: "any",
  maximumPrice: "",
  saleOnly: false,
  metadataMode: "permissive",
  sortField: "score",
  sortDirection: "desc",
};

const PLATFORM_OPTIONS: Array<{ value: Platform; label: string }> = [
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
  { value: "macos", label: "macOS" },
  { value: "browser", label: "Browser" },
];

export function AdvancedFilterPanel({
  open,
  presets,
  busy,
  onClose,
  onApply,
  onPresetSaved,
}: {
  open: boolean;
  presets: FilterPreset[];
  busy: boolean;
  onClose: () => void;
  onApply: (draft: AdvancedFilterDraft) => Promise<void>;
  onPresetSaved: (preset: FilterPreset) => void;
}) {
  const [draft, setDraft] = useState<AdvancedFilterDraft>(INITIAL_DRAFT);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const summary = useMemo(() => {
    const { rules } = buildRulesFromDraft(draft);
    return `${rules.length} active rule${rules.length === 1 ? "" : "s"}`;
  }, [draft]);

  if (!open) return null;

  const togglePlatform = (platform: Platform) => {
    setDraft((current) => ({
      ...current,
      platforms: current.platforms.includes(platform)
        ? current.platforms.filter((value) => value !== platform)
        : [...current.platforms, platform],
    }));
  };

  const handleSave = async () => {
    const name = draft.name.trim();
    if (!name) {
      setSaveError("A preset name is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const { rules, sort } = buildRulesFromDraft(draft);
      const response = await savePreset({
        name,
        description: `Created from Game Radar advanced filters. ${summary}.`,
        rules,
        sort,
      });
      onPresetSaved(response.preset);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Preset could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={onClose}>
      <aside
        className={`${styles.detailsDrawer} ${styles.filterDrawer}`}
        role="dialog"
        aria-modal="true"
        aria-label="Advanced game filters"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <div>
            <span className={styles.eyebrow}>ELIGIBILITY MATRIX</span>
            <h2>Advanced Filters</h2>
          </div>
          <button className={styles.iconAction} type="button" onClick={onClose} aria-label="Close filters">
            <RadarIcon name="close" />
          </button>
        </div>

        <p className={styles.panelIntro}>
          Hard filters remove games before ranking. Comma-separated tags are resolved through the canonical alias system.
        </p>

        <div className={styles.formGrid}>
          <label className={styles.fieldWide}>
            <span>INCLUDE ANY TAG</span>
            <input
              value={draft.includeAnyTags}
              onChange={(event) => setDraft({ ...draft, includeAnyTags: event.target.value })}
              placeholder="horror, atmospheric, exploration"
            />
          </label>
          <label className={styles.fieldWide}>
            <span>REQUIRE ALL TAGS</span>
            <input
              value={draft.includeAllTags}
              onChange={(event) => setDraft({ ...draft, includeAllTags: event.target.value })}
              placeholder="first-person, survival-horror"
            />
          </label>
          <label className={styles.fieldWide}>
            <span>EXCLUDE TAGS</span>
            <input
              value={draft.excludeTags}
              onChange={(event) => setDraft({ ...draft, excludeTags: event.target.value })}
              placeholder="visual-novel, asset-pack"
            />
          </label>

          <fieldset className={styles.fieldWide}>
            <legend>PLATFORMS</legend>
            <div className={styles.checkRow}>
              {PLATFORM_OPTIONS.map((option) => (
                <label key={option.value} className={styles.checkPill}>
                  <input
                    type="checkbox"
                    checked={draft.platforms.includes(option.value)}
                    onChange={() => togglePlatform(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            <span>DELIVERY</span>
            <select value={draft.delivery} onChange={(event) => setDraft({ ...draft, delivery: event.target.value as AdvancedFilterDraft["delivery"] })}>
              <option value="any">Any</option>
              <option value="downloadable">Downloadable</option>
              <option value="browser">Browser</option>
            </select>
          </label>

          <label>
            <span>PRICE TYPE</span>
            <select value={draft.priceMode} onChange={(event) => setDraft({ ...draft, priceMode: event.target.value as AdvancedFilterDraft["priceMode"] })}>
              <option value="any">Any</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </label>

          <label>
            <span>MAXIMUM PRICE</span>
            <input
              inputMode="decimal"
              value={draft.maximumPrice}
              onChange={(event) => setDraft({ ...draft, maximumPrice: event.target.value })}
              placeholder="15.00"
            />
          </label>

          <label>
            <span>METADATA MODE</span>
            <select value={draft.metadataMode} onChange={(event) => setDraft({ ...draft, metadataMode: event.target.value as AdvancedFilterDraft["metadataMode"] })}>
              <option value="permissive">Permissive</option>
              <option value="strict">Strict</option>
            </select>
          </label>

          <label>
            <span>SORT FIELD</span>
            <select value={draft.sortField} onChange={(event) => setDraft({ ...draft, sortField: event.target.value as AdvancedFilterDraft["sortField"] })}>
              <option value="score">Recommendation score</option>
              <option value="sourceUpdatedAt">Recently updated</option>
              <option value="firstDiscoveredAt">Recently discovered</option>
              <option value="price">Price</option>
              <option value="title">Title</option>
              <option value="metadataCompleteness">Metadata completeness</option>
            </select>
          </label>

          <label>
            <span>SORT DIRECTION</span>
            <select value={draft.sortDirection} onChange={(event) => setDraft({ ...draft, sortDirection: event.target.value as AdvancedFilterDraft["sortDirection"] })}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>

          <label className={styles.toggleField}>
            <input
              type="checkbox"
              checked={draft.saleOnly}
              onChange={(event) => setDraft({ ...draft, saleOnly: event.target.checked })}
            />
            <span>Only show games currently on sale</span>
          </label>
        </div>

        <div className={styles.filterSummary}>
          <span>{summary}</span>
          <span>{presets.length} saved presets available</span>
        </div>

        <div className={styles.drawerActions}>
          <button
            className={styles.openButton}
            type="button"
            disabled={busy}
            onClick={() => onApply(draft)}
          >
            APPLY FILTER <RadarIcon name="filter" />
          </button>
        </div>

        <div className={styles.savePresetBlock}>
          <label>
            <span>SAVE AS PRESET</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Free atmospheric horror"
            />
          </label>
          <button className={styles.actionButton} type="button" disabled={saving} onClick={handleSave}>
            <RadarIcon name="bookmark" /> {saving ? "SAVING" : "SAVE PRESET"}
          </button>
          {saveError && <p className={styles.errorText}>{saveError}</p>}
        </div>
      </aside>
    </div>
  );
}
