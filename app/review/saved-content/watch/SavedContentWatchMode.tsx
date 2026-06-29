"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import WatchControls from "./components/WatchControls";
import WatchHotkeyPanel from "./components/WatchHotkeyPanel";
import WatchQueue from "./components/WatchQueue";
import WatchStats from "./components/WatchStats";
import WatchViewer from "./components/WatchViewer";
import styles from "./saved-content-watch.module.css";

type WatchSessionPlatform = "all" | "youtube" | "tiktok";
type WatchSessionFilter =
  | "active"
  | "unwatched"
  | "unprocessed"
  | "needs-transcript"
  | "ready-to-analyze"
  | "all";
type WatchSessionOrder = "oldest" | "newest" | "random";

type WatchQueueItem = {
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
  importedAt?: string;
  updatedAt?: string;
  summary?: string;
  possibleReasonSaved?: string;
  topics: string[];
  relatedProjects: string[];
  decision: string;
  position: number;
  thumbnail?: {
    thumbnailUrl?: string;
    fallbackUrl?: string;
    thumbnailUrls?: string[];
    status: string;
    source: string;
    error?: string;
  };
};

type WatchSessionView = {
  ok: true;
  generatedAt: string;
  session: {
    id: string;
    title: string;
    status: string;
    platform: WatchSessionPlatform;
    filter: WatchSessionFilter;
    order: WatchSessionOrder;
    batchSize: number;
    sourceLabel: string;
    currentIndex: number;
    itemIds: string[];
  } | null;
  sessions: Array<{
    id: string;
    title: string;
    status: string;
    platform: WatchSessionPlatform;
    itemCount: number;
    currentIndex: number;
    pendingCount: number;
    watchedCount: number;
    analyzeLaterCount: number;
    skippedCount: number;
    dismissedCount: number;
    updatedAt: string;
  }>;
  stats: {
    total: number;
    currentPosition: number;
    pending: number;
    watched: number;
    analyzeLater: number;
    skipped: number;
    dismissed: number;
    progressPercent: number;
  } | null;
  currentItem: WatchQueueItem | null;
  items: WatchQueueItem[];
};

export default function SavedContentWatchMode() {
  const [view, setView] = useState<WatchSessionView | null>(null);
  const [platform, setPlatform] = useState<WatchSessionPlatform>("tiktok");
  const [filter, setFilter] = useState<WatchSessionFilter>("active");
  const [order, setOrder] = useState<WatchSessionOrder>("oldest");
  const [batchSize, setBatchSize] = useState(50);
  const [sourceLabel, setSourceLabel] = useState("TikTok Favourites");
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentItem = view?.currentItem ?? null;
  const session = view?.session ?? null;

  const loadSession = useCallback(async (sessionId?: string) => {
    setIsBusy(true);
    setError(null);

    try {
      const suffix = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
      const response = await fetch(`/api/content-watch/session${suffix}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to load watch session.");
      }

      setView(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusy(false);
    }
  }, []);

  async function createSession() {
    setIsBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/content-watch/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform,
          filter,
          order,
          batchSize,
          sourceLabel,
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? "Failed to create watch session.");
      }

      setView(payload);
      setLastAction(`Created watch session: ${payload.session?.title ?? "No items"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsBusy(false);
    }
  }

  const runAction = useCallback(
    async (action: string) => {
      if (!session) {
        setLastAction("No active watch session.");
        return;
      }

      setIsBusy(true);

      try {
        const response = await fetch("/api/content-watch/action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: session.id,
            action,
            itemId: currentItem?.id,
          }),
        });

        const payload = await response.json();

        if (!response.ok || !payload.ok) {
          throw new Error(payload.message ?? "Watch action failed.");
        }

        setView(payload.view);
        setLastAction(`${payload.title}\n${payload.message}`);
      } catch (err) {
        setLastAction(err instanceof Error ? err.message : String(err));
      } finally {
        setIsBusy(false);
      }
    },
    [currentItem, session]
  );

  function openCurrent() {
    if (!currentItem?.url) {
      setLastAction("No current item URL.");
      return;
    }

    window.open(currentItem.url, "_blank", "noopener,noreferrer");
    setLastAction(`Opened original source:\n${currentItem.url}`);
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadSession();
    });
  }, [loadSession]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (tagName === "input" || tagName === "select" || tagName === "textarea") {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "o") {
        event.preventDefault();
        openCurrent();
      }

      if (key === "w") {
        event.preventDefault();
        void runAction("mark-watched");
      }

      if (key === "a") {
        event.preventDefault();
        void runAction("analyze-later");
      }

      if (key === "s") {
        event.preventDefault();
        void runAction("skip");
      }

      if (key === "d") {
        event.preventDefault();
        void runAction("dismiss");
      }

      if (key === "n") {
        event.preventDefault();
        void runAction("next");
      }

      if (key === "b") {
        event.preventDefault();
        void runAction("previous");
      }

      if (key === "r") {
        event.preventDefault();
        void loadSession(session?.id);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentItem, loadSession, openCurrent, runAction, session?.id]);

  const pendingItems = useMemo(
    () => view?.items.filter((item) => item.decision === "pending") ?? [],
    [view?.items]
  );

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div className={styles.eyeCore} />
        <div>
          <p className={styles.kicker}>Chernobog Saved Content // Watch Mode</p>
          <h1>WATCH SESSION CONTROL</h1>
          <p className={styles.subtitle}>
            Mass viewing, triage, and decision tracking for TikTok, YouTube, and saved-content queues.
          </p>
        </div>
        <div className={styles.headerActions}>
          <a className={styles.secondaryButton} href="/review/saved-content">
            Dashboard
          </a>
          <button
            className={styles.primaryButton}
            onClick={() => void loadSession(session?.id)}
            type="button"
          >
            {isBusy ? "SYNCING..." : "SYNC"}
          </button>
        </div>
      </section>

      {error ? <section className={styles.errorPanel}>{error}</section> : null}

      <WatchStats stats={view?.stats ?? null} session={session} />

      <section className={styles.layout}>
        <aside className={styles.leftPanel}>
          <WatchControls
            platform={platform}
            setPlatform={setPlatform}
            filter={filter}
            setFilter={setFilter}
            order={order}
            setOrder={setOrder}
            batchSize={batchSize}
            setBatchSize={setBatchSize}
            sourceLabel={sourceLabel}
            setSourceLabel={setSourceLabel}
            createSession={createSession}
            isBusy={isBusy}
            sessions={view?.sessions ?? []}
            loadSession={loadSession}
          />

          <WatchHotkeyPanel />
        </aside>

        <section className={styles.viewerPanel}>
          <WatchViewer
            item={currentItem}
            session={session}
            openCurrent={openCurrent}
            runAction={runAction}
            isBusy={isBusy}
          />
        </section>

        <aside className={styles.queuePanel}>
          <WatchQueue
            items={view?.items ?? []}
            currentItemId={currentItem?.id ?? null}
            pendingCount={pendingItems.length}
            loadSession={loadSession}
            sessionId={session?.id ?? null}
          />
        </aside>
      </section>

      {lastAction ? (
        <section className={styles.actionLog}>
          <div className={styles.panelTitle}>Directive Feed</div>
          <pre>{lastAction}</pre>
        </section>
      ) : null}
    </main>
  );
}
