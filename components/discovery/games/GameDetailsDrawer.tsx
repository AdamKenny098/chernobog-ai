"use client";
/* eslint-disable @next/next/no-img-element */

import { RadarIcon } from "./RadarIcon";
import { formatDate, formatPrice, platformLabels, scoreRows } from "./formatting";
import type { DisplayGame } from "./GameCard";
import styles from "./game-radar.module.css";

export function GameDetailsDrawer({
  item,
  busy,
  onClose,
  onAction,
  onWatch,
  onOpen,
  onFeedback,
}: {
  item: DisplayGame | null;
  busy: boolean;
  onClose: () => void;
  onAction: (item: DisplayGame, state: "saved" | "hidden" | "played") => void;
  onWatch: (item: DisplayGame) => void;
  onOpen: (item: DisplayGame) => void;
  onFeedback: (item: DisplayGame, signalType: "more_like_this" | "less_like_this") => void;
}) {
  if (!item) return null;
  const { game, recommendation } = item;
  const fullRecommendation = recommendation && "scoreBreakdown" in recommendation
    ? recommendation
    : null;

  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={onClose}>
      <aside
        className={styles.detailsDrawer}
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${game.title}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <div>
            <span className={styles.eyebrow}>TARGET DOSSIER</span>
            <h2>{game.title}</h2>
          </div>
          <button className={styles.iconAction} type="button" onClick={onClose} aria-label="Close details">
            <RadarIcon name="close" />
          </button>
        </div>

        {game.coverImageUrl ? (
          <img className={styles.drawerCover} src={game.coverImageUrl} alt="" />
        ) : (
          <div className={`${styles.coverFallback} ${styles.drawerFallback}`}>
            <RadarIcon name="gamepad" />
            <span>NO COVER SIGNAL</span>
          </div>
        )}

        <div className={styles.drawerIdentity}>
          <div>
            <span>CREATOR</span>
            <strong>{game.creatorName ?? "Unknown"}</strong>
          </div>
          <div>
            <span>PRICE</span>
            <strong>{formatPrice(game.price)}</strong>
          </div>
          <div>
            <span>DISCOVERED</span>
            <strong>{formatDate(game.firstDiscoveredAt)}</strong>
          </div>
          <div>
            <span>UPDATED</span>
            <strong>{formatDate(game.sourceUpdatedAt ?? game.lastEnrichedAt)}</strong>
          </div>
        </div>

        {game.shortDescription && <p className={styles.drawerDescription}>{game.shortDescription}</p>}

        <section className={styles.drawerSection}>
          <h3>ADULT CLASSIFICATION</h3>
          <div className={styles.platformGrid}>
            <span>{game.adultStatus ?? (game.isNsfw ? "adult" : "unknown")}</span>
            <span>{Math.round((game.adultConfidence ?? 0) * 100)}% confidence</span>
          </div>
        </section>

        <section className={styles.drawerSection}>
          <h3>CLASSIFICATION</h3>
          <div className={styles.tagRow}>
            {game.tags.map((tag) => <span className={styles.tag} key={tag}>{tag}</span>)}
          </div>
        </section>

        <section className={styles.drawerSection}>
          <h3>DELIVERY SYSTEMS</h3>
          <div className={styles.platformGrid}>
            {platformLabels(game).map((platform) => <span key={platform}>{platform}</span>)}
            {platformLabels(game).length === 0 && <span>UNKNOWN</span>}
          </div>
        </section>

        {item.reason && (
          <section className={styles.drawerSection}>
            <h3>RECOMMENDATION BASIS</h3>
            <p className={styles.reasonPanel}>{item.reason}</p>
          </section>
        )}

        {fullRecommendation && (
          <section className={styles.drawerSection}>
            <h3>SCORE TELEMETRY</h3>
            <div className={styles.scoreTable}>
              {scoreRows(fullRecommendation.scoreBreakdown).map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <div><i style={{ width: `${Math.max(0, Math.min(100, Math.abs(value) * 3))}%` }} /></div>
                  <strong>{value.toFixed(1)}</strong>
                </div>
              ))}
            </div>
          </section>
        )}

        {item.warnings && item.warnings.length > 0 && (
          <section className={styles.drawerSection}>
            <h3>METADATA WARNINGS</h3>
            <ul className={styles.warningList}>
              {item.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </section>
        )}

        <div className={styles.drawerActions}>
          <button className={styles.actionButton} type="button" disabled={busy} onClick={() => onAction(item, "saved")}>
            <RadarIcon name="bookmark" /> SAVE
          </button>
          <button className={styles.actionButton} type="button" disabled={busy} onClick={() => onAction(item, "played")}>
            <RadarIcon name="check" /> MARK PLAYED
          </button>
          <button className={styles.actionButton} type="button" disabled={busy} onClick={() => onWatch(item)}>
            <RadarIcon name={item.watched ? "signal" : "watch"} /> {item.watched ? "UNWATCH" : "WATCH"}
          </button>
          <button className={styles.actionButton} type="button" disabled={busy} onClick={() => onFeedback(item, "more_like_this")}>
            MORE LIKE THIS
          </button>
          <button className={styles.actionButton} type="button" disabled={busy} onClick={() => onFeedback(item, "less_like_this")}>
            LESS LIKE THIS
          </button>
          <button className={styles.openButton} type="button" disabled={busy} onClick={() => onOpen(item)}>
            OPEN ON ITCH.IO <RadarIcon name="chevron" />
          </button>
        </div>
      </aside>
    </div>
  );
}
