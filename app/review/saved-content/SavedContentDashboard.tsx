"use client";

import { useEffect, useMemo, useState } from "react";

import DiagnosticsPanel from "./components/DiagnosticsPanel";
import FilterRail from "./components/FilterRail";
import ImportPanel from "./components/ImportPanel";
import ItemInspector from "./components/ItemInspector";
import QueueWorkbench from "./components/QueueWorkbench";
import ReviewBoard from "./components/ReviewBoard";
import SummaryBar from "./components/SummaryBar";
import styles from "./saved-content-dashboard.module.css";

type DashboardView = "queue" | "reviews" | "ingest" | "diagnostics";

type DashboardQueueItem = {
  id: string;
  title: string;
  platform: string;
  sourceType: string;
  creator?: string;
  url: string;
  externalId?: string;
  sourceContainerId?: string;
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
  extractedTasks: string[];
  extractedIdeas: string[];
  extractedWarnings: string[];
  review?: {
    id: string;
    status: string;
  };
  lane: string;
  thumbnail?: {
    thumbnailUrl?: string;
    fallbackUrl?: string;
    thumbnailUrls?: string[];
    status: string;
    source: string;
    error?: string;
  };
};

type DashboardData = {
  ok: true;
  generatedAt: string;
  summary: {
    totalItems: number;
    activeItems: number;
    closedItems: number;
    youtubeItems: number;
    tiktokItems: number;
    needsTranscript: number;
    readyToAnalyze: number;
    readyForReview: number;
    pendingReviews: number;
    ingestRuns: number;
    reviews: number;
    duplicateGroups: number;
  };
  queue: DashboardQueueItem[];
  ingestRuns: Array<{
    id: string;
    kind: string;
    status: string;
    platform?: string;
    archivePath?: string;
    createdAt: string;
    completedAt?: string;
    candidatesFound: number;
    queueItems: number;
  }>;
  reviews: Array<{
    id: string;
    title: string;
    status: string;
    platform: string;
    sourceItemId: string;
    sourceUrl: string;
    createdAt: string;
    updatedAt: string;
    appliedAt?: string;
  }>;
  diagnostics: Record<string, unknown>;
};

export default function SavedContentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [view, setView] = useState<DashboardView>("queue");
  const [filter, setFilter] = useState("active");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function loadDashboard() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/content-ingest/dashboard", {
        cache: "no-store",
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.details ?? payload.error ?? "Dashboard load failed.");
      }

      setData(payload);

      if (!selectedItemId && payload.queue?.[0]) {
        setSelectedItemId(payload.queue[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function runAction(request: unknown) {
    setLastAction("Running dashboard action...");

    try {
      const response = await fetch("/api/content-ingest/dashboard-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const payload = await response.json();

      setLastAction(`${payload.title ?? "Action"}\n\n${payload.message ?? ""}`);

      if (response.ok && payload.ok) {
        await loadDashboard();
      }
    } catch (err) {
      setLastAction(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedItem = useMemo(() => {
    if (!data || !selectedItemId) {
      return null;
    }

    return data.queue.find((item) => item.id === selectedItemId) ?? null;
  }, [data, selectedItemId]);

  return (
    <main className={styles.page}>
      <section className={styles.topShell}>
        <div className={styles.brandMark}>
          <div className={styles.eyeCore} />
        </div>

        <div className={styles.headerCopy}>
          <p className={styles.kicker}>God Program Interface // Saved Content</p>
          <h1>CHERNOBOG // INGEST CONTROL</h1>
          <p>
            YouTube/TikTok queue, archive imports, reviews, diagnostics, and thumbnail acquisition.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.primaryButton} onClick={loadDashboard} type="button">
            {isLoading ? "SYNCING..." : "SYNC STATE"}
          </button>
          <button
            className={styles.secondaryButton}
            onClick={() =>
              void runAction({ type: "refresh-thumbnails", limit: 150, force: true })
            }
            type="button"
          >
            SCRAPE THUMBNAILS
          </button>
        </div>
      </section>

      {error ? <section className={styles.errorPanel}>{error}</section> : null}

      {data ? <SummaryBar summary={data.summary} /> : null}

      <section className={styles.commandGrid}>
        <FilterRail
          activeView={view}
          activeFilter={filter}
          setView={setView}
          setFilter={setFilter}
        />

        <section className={styles.workbench}>
          {data ? (
            <>
              {view === "queue" ? (
                <QueueWorkbench
                  items={data.queue}
                  filter={filter}
                  selectedItemId={selectedItemId}
                  setSelectedItemId={setSelectedItemId}
                  runAction={runAction}
                />
              ) : null}

              {view === "reviews" ? (
                <ReviewBoard
                  reviews={data.reviews}
                  selectedReviewId={selectedReviewId}
                  setSelectedReviewId={setSelectedReviewId}
                  runAction={runAction}
                />
              ) : null}

              {view === "ingest" ? (
                <ImportPanel
                  ingestRuns={data.ingestRuns}
                  runAction={runAction}
                />
              ) : null}

              {view === "diagnostics" ? (
                <DiagnosticsPanel
                  diagnostics={data.diagnostics}
                  runAction={runAction}
                />
              ) : null}
            </>
          ) : (
            <div className={styles.emptyState}>Loading saved-content command state...</div>
          )}
        </section>

        <aside className={styles.inspector}>
          <ItemInspector item={selectedItem} runAction={runAction} />
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
