"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { RadarIcon } from "./RadarIcon";
import { clampScore, formatPrice, platformLabels } from "./formatting";
import type { FeedItem, Game, Recommendation } from "./types";
import styles from "./game-radar.module.css";

export type DisplayGame = {
  game: Game;
  recommendation?: Recommendation | Pick<Recommendation, "id" | "score" | "state" | "profileId" | "recommendedAt">;
  watched: boolean;
  reason?: string;
  warnings?: string[];
  metadataCompleteness?: number;
};

export function fromFeedItem(item: FeedItem): DisplayGame {
  return {
    game: item.game,
    recommendation: item.recommendation,
    watched: item.watched,
    reason: item.recommendation.reason,
  };
}

export function GameCard({
  item,
  featured = false,
  busy = false,
  blurCoverByDefault = false,
  onSelect,
  onAction,
  onWatch,
  onOpen,
}: {
  item: DisplayGame;
  featured?: boolean;
  busy?: boolean;
  blurCoverByDefault?: boolean;
  onSelect: (item: DisplayGame) => void;
  onAction: (item: DisplayGame, state: "saved" | "hidden" | "played") => void;
  onWatch: (item: DisplayGame) => void;
  onOpen: (item: DisplayGame) => void;
}) {
  const { game, recommendation } = item;
  const [coverRevealed, setCoverRevealed] = useState(!blurCoverByDefault);
  const platforms = platformLabels(game);
  const score = recommendation ? clampScore(recommendation.score) : null;
  const saved = recommendation?.state === "saved";
  const played = recommendation?.state === "played";

  return (
    <article className={`${styles.gameCard} ${featured ? styles.featuredCard : ""}`}>
      <button
        className={styles.coverButton}
        type="button"
        onClick={() => onSelect(item)}
        aria-label={`Open details for ${game.title}`}
      >
        {game.coverImageUrl ? (
          <img className={`${styles.coverImage} ${!coverRevealed ? styles.coverImageBlurred : ""}`} src={game.coverImageUrl} alt="" loading="lazy" />
        ) : (
          <div className={styles.coverFallback}>
            <RadarIcon name="gamepad" />
            <span>NO COVER SIGNAL</span>
          </div>
        )}
        <div className={styles.coverScrim} />
        {score !== null && (
          <div className={styles.scoreBadge} aria-label={`Recommendation score ${score}`}>
            <strong>{score}</strong>
            <span>MATCH</span>
          </div>
        )}
        {game.price.isOnSale && <span className={styles.saleBadge}>SALE</span>}
        <span className={styles.adultBadge}>{game.adultStatus === "blocked" ? "BLOCKED" : "18+"}</span>
      </button>
      {game.coverImageUrl && !coverRevealed && (
        <button className={styles.revealCoverButton} type="button" onClick={() => setCoverRevealed(true)}>REVEAL COVER</button>
      )}

      <div className={styles.cardBody}>
        <div className={styles.cardHeadingRow}>
          <div>
            <button className={styles.titleButton} type="button" onClick={() => onSelect(item)}>
              {game.title}
            </button>
            <p className={styles.creator}>{game.creatorName ?? "Unknown creator"}</p>
          </div>
          <span className={styles.price}>{formatPrice(game.price)}</span>
        </div>

        {game.shortDescription && (
          <p className={styles.cardDescription}>{game.shortDescription}</p>
        )}

        <div className={styles.tagRow}>
          {game.tags.slice(0, featured ? 6 : 4).map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
          {game.tags.length === 0 && <span className={styles.mutedTag}>UNTAGGED</span>}
        </div>

        <div className={styles.cardMetaRow}>
          <div className={styles.platformRow}>
            {platforms.map((platform) => (
              <span key={platform}>{platform}</span>
            ))}
            {platforms.length === 0 && <span>PLATFORM UNKNOWN</span>}
          </div>
          {item.watched && (
            <span className={styles.watchedState}>
              <RadarIcon name="signal" /> WATCHED
            </span>
          )}
        </div>

        {item.reason && <p className={styles.reason}>{item.reason}</p>}

        <div className={styles.cardActions}>
          <button
            type="button"
            className={`${styles.actionButton} ${saved ? styles.activeAction : ""}`}
            disabled={busy}
            onClick={() => onAction(item, "saved")}
          >
            <RadarIcon name="bookmark" /> {saved ? "SAVED" : "SAVE"}
          </button>
          <button
            type="button"
            className={`${styles.actionButton} ${played ? styles.activeAction : ""}`}
            disabled={busy}
            onClick={() => onAction(item, "played")}
          >
            <RadarIcon name="check" /> {played ? "PLAYED" : "MARK PLAYED"}
          </button>
          <button
            type="button"
            className={styles.iconAction}
            disabled={busy}
            onClick={() => onWatch(item)}
            aria-label={item.watched ? "Stop watching" : "Watch for updates"}
            title={item.watched ? "Stop watching" : "Watch for updates"}
          >
            <RadarIcon name={item.watched ? "signal" : "watch"} />
          </button>
          <button
            type="button"
            className={styles.iconAction}
            disabled={busy}
            onClick={() => onAction(item, "hidden")}
            aria-label="Hide recommendation"
            title="Hide recommendation"
          >
            <RadarIcon name="hide" />
          </button>
          <button
            type="button"
            className={styles.openButton}
            disabled={busy}
            onClick={() => onOpen(item)}
          >
            OPEN <RadarIcon name="chevron" />
          </button>
        </div>
      </div>
    </article>
  );
}
