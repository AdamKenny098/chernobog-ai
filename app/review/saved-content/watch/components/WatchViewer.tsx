import { useEffect, useMemo, useState } from "react";

import styles from "../saved-content-watch.module.css";

type WatchViewerProps = {
  item: {
    id: string;
    title: string;
    platform: string;
    sourceType: string;
    creator?: string;
    url: string;
    externalId?: string;
    sourceContainerTitle?: string;
    queueStatus: string;
    analysisStatus: string;
    transcriptStatus?: string;
    summary?: string;
    possibleReasonSaved?: string;
    topics: string[];
    relatedProjects: string[];
    decision: string;
    thumbnail?: {
      thumbnailUrl?: string;
      fallbackUrl?: string;
      thumbnailUrls?: string[];
      status: string;
      source: string;
      error?: string;
    };
  } | null;
  session: {
    title: string;
    status: string;
  } | null;
  openCurrent: () => void;
  runAction: (action: string) => Promise<void>;
  isBusy: boolean;
};

type PlayerMode = "embed" | "thumbnail";

export default function WatchViewer({
  item,
  session,
  openCurrent,
  runAction,
  isBusy,
}: WatchViewerProps) {
  const [playerMode, setPlayerMode] = useState<PlayerMode>("embed");

  useEffect(() => {
    queueMicrotask(() => setPlayerMode("embed"));
  }, [item?.id]);

  if (!session) {
    return (
      <section className={styles.emptyState}>
        No active watch session. Create one from the left panel.
      </section>
    );
  }

  if (!item) {
    return (
      <section className={styles.emptyState}>
        This session has no current item.
      </section>
    );
  }

  const embed = getEmbedInfo(item);

  return (
    <section>
      <div className={styles.viewerHeader}>
        <div>
          <h2 className={styles.viewerTitle}>{item.title}</h2>
          <div className={styles.viewerMeta}>
            {item.platform}{" // "}{item.sourceType}
            {item.creator ? ` // ${item.creator}` : ""}
          </div>
        </div>
      </div>

      <div className={styles.playerModeToggle}>
        <button
          className={playerMode === "embed" ? styles.primaryButton : styles.controlButton}
          onClick={() => setPlayerMode("embed")}
          type="button"
        >
          Embedded Player
        </button>
        <button
          className={playerMode === "thumbnail" ? styles.primaryButton : styles.controlButton}
          onClick={() => setPlayerMode("thumbnail")}
          type="button"
        >
          Thumbnail Fallback
        </button>
      </div>

      {playerMode === "embed" && embed ? (
        <EmbeddedPlayer embed={embed} title={item.title} />
      ) : (
        <ThumbnailLarge title={item.title} platform={item.platform} thumbnail={item.thumbnail} />
      )}

      {playerMode === "embed" && !embed ? (
        <section className={styles.detailPanel}>
          <h3>Embedded Player Unavailable</h3>
          <p>
            Chernobog cannot build an embedded player for this item. This usually means the item
            came from a short/hash-only URL instead of a full post/video ID. Use Open Original.
          </p>
        </section>
      ) : null}

      <div className={styles.badgeRow}>
        <Badge value={item.decision} />
        <Badge value={item.queueStatus} />
        <Badge value={item.analysisStatus} />
        <Badge value={item.transcriptStatus ?? "no-transcript-state"} />
        <Badge value={item.thumbnail?.status ?? "no-thumbnail"} />
        <Badge value={embed ? "embed-ready" : "embed-unavailable"} />
      </div>

      <div className={styles.viewerActions}>
        <button className={styles.secondaryButton} onClick={openCurrent} type="button">
          Open Original [O]
        </button>
        <button
          className={styles.primaryButton}
          disabled={isBusy}
          onClick={() => void runAction("mark-watched")}
          type="button"
        >
          Watched [W]
        </button>
        <button
          className={styles.primaryButton}
          disabled={isBusy}
          onClick={() => void runAction("analyze-later")}
          type="button"
        >
          Analyze Later [A]
        </button>
        <button
          className={styles.controlButton}
          disabled={isBusy}
          onClick={() => void runAction("skip")}
          type="button"
        >
          Skip [S]
        </button>
        <button
          className={styles.dangerButton}
          disabled={isBusy}
          onClick={() => void runAction("dismiss")}
          type="button"
        >
          Dismiss [D]
        </button>
        <button
          className={styles.controlButton}
          disabled={isBusy}
          onClick={() => void runAction("previous")}
          type="button"
        >
          Previous [B]
        </button>
        <button
          className={styles.controlButton}
          disabled={isBusy}
          onClick={() => void runAction("next")}
          type="button"
        >
          Next [N]
        </button>
      </div>

      <div className={styles.detailGrid}>
        <section className={styles.detailPanel}>
          <h3>Source</h3>
          <p>{item.sourceContainerTitle ?? "No source container title."}</p>
          <p>{item.url}</p>
          <p>External ID: {item.externalId ?? "none"}</p>
        </section>

        <section className={styles.detailPanel}>
          <h3>Reason / Summary</h3>
          <p>{item.possibleReasonSaved ?? "No reason-saved inference yet."}</p>
          <p>{item.summary ?? "No summary yet."}</p>
        </section>

        <ListSection title="Topics" values={item.topics} />
        <ListSection title="Related Projects" values={item.relatedProjects} />
      </div>
    </section>
  );
}

function getEmbedInfo(item: {
  platform: string;
  url: string;
  externalId?: string;
}) {
  if (item.platform === "tiktok") {
    const postId = getTikTokPostId(item.url, item.externalId);

    if (!postId) {
      return null;
    }

    return {
      kind: "tiktok" as const,
      src: `https://www.tiktok.com/player/v1/${postId}?controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=1&timestamp=1&music_info=1&description=1&rel=0&autoplay=0`,
      note: "TikTok embedded player",
    };
  }

  if (item.platform === "youtube") {
    const videoId = getYouTubeVideoId(item.url, item.externalId);

    if (!videoId) {
      return null;
    }

    return {
      kind: "youtube" as const,
      src: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
      note: "YouTube embedded player",
    };
  }

  return null;
}

function getTikTokPostId(url: string, externalId?: string) {
  const normalizedExternalId = (externalId ?? "")
    .replace(/^tiktok:/i, "")
    .trim();

  if (/^\d{10,}$/.test(normalizedExternalId)) {
    return normalizedExternalId;
  }

  try {
    const parsed = new URL(url);
    const videoMatch =
      parsed.pathname.match(/\/video\/(\d+)/) ??
      parsed.pathname.match(/\/share\/video\/(\d+)/);

    return videoMatch?.[1] ?? null;
  } catch {
    return null;
  }
}

function getYouTubeVideoId(url: string, externalId?: string) {
  const normalizedExternalId = (externalId ?? "")
    .replace(/^youtube:/i, "")
    .trim();

  if (
    normalizedExternalId &&
    !normalizedExternalId.startsWith("url-hash:") &&
    /^[a-zA-Z0-9_-]{6,}$/.test(normalizedExternalId)
  ) {
    return normalizedExternalId;
  }

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      return parsed.pathname.replace("/", "").split(/[?&/]/)[0] || null;
    }

    if (parsed.pathname.startsWith("/watch")) {
      return parsed.searchParams.get("v");
    }

    if (parsed.pathname.startsWith("/shorts/")) {
      return parsed.pathname.split("/")[2] || null;
    }

    if (parsed.pathname.startsWith("/embed/")) {
      return parsed.pathname.split("/")[2] || null;
    }

    return null;
  } catch {
    return null;
  }
}

function EmbeddedPlayer({
  embed,
  title,
}: {
  embed: {
    kind: "tiktok" | "youtube";
    src: string;
    note: string;
  };
  title: string;
}) {
  return (
    <div
      className={`${styles.embedShell} ${
        embed.kind === "youtube" ? styles.embedShellYouTube : ""
      }`}
    >
      <iframe
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        className={styles.embedFrame}
        referrerPolicy="strict-origin-when-cross-origin"
        src={embed.src}
        title={`${title} embedded player`}
      />
      <div className={styles.embedNotice}>{embed.note}</div>
    </div>
  );
}

function ThumbnailLarge({
  title,
  platform,
  thumbnail,
}: {
  title: string;
  platform: string;
  thumbnail?: {
    thumbnailUrl?: string;
    fallbackUrl?: string;
    thumbnailUrls?: string[];
  };
}) {
  const urls = useMemo(() => {
    const candidates = [
      ...(thumbnail?.thumbnailUrls ?? []),
      thumbnail?.thumbnailUrl,
      thumbnail?.fallbackUrl,
    ].filter((value): value is string => Boolean(value));
return Array.from(new Set(candidates));
  }, [thumbnail?.fallbackUrl, thumbnail?.thumbnailUrl, thumbnail?.thumbnailUrls]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    queueMicrotask(() => setIndex(0));
  }, [urls.join("|")]);

  const src = urls[index];

  return (
    <div className={styles.thumbnailLarge}>
      {src ? (
        <img
          alt={`${title} thumbnail`}
          src={src}
          onError={() => {
            setIndex((current) => {
              const next = current + 1;
              return next < urls.length ? next : current;
            });
          }}
        />
      ) : (
        <span className={styles.thumbnailFallback}>{platform}</span>
      )}
    </div>
  );
}

function Badge({ value }: { value: string }) {
  const green = ["complete", "available", "watched", "analyze-later", "embed-ready"].includes(value);
  const blue = ["processing", "analyze-next", "pending", "unprocessed"].includes(value);
  const red = ["failed", "unavailable", "dismissed", "embed-unavailable"].includes(value);

  return (
    <span
      className={`${styles.badge} ${green ? styles.badgeGreen : ""} ${
        blue ? styles.badgeBlue : ""
      } ${red ? styles.badgeRed : ""}`}
    >
      {value}
    </span>
  );
}

function ListSection({ title, values }: { title: string; values: string[] }) {
  return (
    <section className={styles.detailPanel}>
      <h3>{title}</h3>
      {values.length === 0 ? (
        <p>None.</p>
      ) : (
        <ul>
          {values.map((value, index) => (
            <li key={`${title}-${index}`}>{value}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
