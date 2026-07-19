"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AdvancedFilterPanel } from "./AdvancedFilterPanel";
import { GameCard, fromFeedItem, type DisplayGame } from "./GameCard";
import { GameDetailsDrawer } from "./GameDetailsDrawer";
import { NotificationPanel } from "./NotificationPanel";
import { RadarIcon } from "./RadarIcon";
import { SettingsPanel } from "./SettingsPanel";
import {
  buildRulesFromDraft,
  getCatalogueByPreset,
  getFeed,
  getFeedback,
  getFilters,
  getNotifications,
  getScheduler,
  getSettings,
  getStatus,
  getWatches,
  runCustomFilter,
  runSchedulerCheck,
  runPipeline,
  sendFeedback,
  setWatch,
  updateAdultSettings,
  updateFeedbackCandidate,
  updateNotification,
  updateRecommendation,
  updateScheduler,
  updateSettings,
} from "./gameRadarApi";
import { formatRelativeTime } from "./formatting";
import type {
  AdultSettings,
  AdvancedFilterDraft,
  CatalogueResponse,
  DiscoveryStatus,
  FeedResponse,
  FeedbackCandidate,
  FilterPreset,
  GameWatch,
  Notification,
  NotificationDigest,
  Platform,
  PreferenceProfile,
  PreferenceWeight,
  RecommendationState,
  SchedulerSettings,
} from "./types";
import styles from "./game-radar.module.css";

type ViewMode = "unseen" | "saved" | "played" | "catalogue";
type QuickPlatform = "all" | Platform;

const VIEW_OPTIONS: Array<{ id: ViewMode; label: string }> = [
  { id: "unseen", label: "FOR YOU" },
  { id: "saved", label: "SAVED" },
  { id: "played", label: "PLAYED" },
  { id: "catalogue", label: "CATALOGUE" },
];

export function GameRadarShell({ adultSettings }: { adultSettings: AdultSettings }) {
  const [adultPrivacy, setAdultPrivacy] = useState<AdultSettings>(adultSettings);
  const [status, setStatus] = useState<DiscoveryStatus | null>(null);
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [catalogue, setCatalogue] = useState<CatalogueResponse | null>(null);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [catalogueLabel, setCatalogueLabel] = useState("CATALOGUE");
  const [customFilter, setCustomFilter] = useState<{ rules: ReturnType<typeof buildRulesFromDraft>["rules"]; sort: ReturnType<typeof buildRulesFromDraft>["sort"] } | null>(null);
  const [watches, setWatches] = useState<GameWatch[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [digests, setDigests] = useState<NotificationDigest[]>([]);
  const [profile, setProfile] = useState<PreferenceProfile | null>(null);
  const [weights, setWeights] = useState<PreferenceWeight[]>([]);
  const [scheduler, setScheduler] = useState<SchedulerSettings | null>(null);
  const [feedbackCandidates, setFeedbackCandidates] = useState<FeedbackCandidate[]>([]);
  const [activeView, setActiveView] = useState<ViewMode>("unseen");
  const [selectedGame, setSelectedGame] = useState<DisplayGame | null>(null);
  const [search, setSearch] = useState("");
  const [quickPlatform, setQuickPlatform] = useState<QuickPlatform>("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyGameId, setBusyGameId] = useState<string | null>(null);
  const [busyNotificationId, setBusyNotificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const watchedIds = useMemo(
    () => new Set(watches.filter((watch) => watch.enabled).map((watch) => watch.gameId)),
    [watches],
  );

  const loadAncillary = useCallback(async () => {
    const [
      nextStatus,
      filterResponse,
      notificationResponse,
      settingsResponse,
      watchResponse,
      schedulerResponse,
      feedbackResponse,
    ] = await Promise.all([
      getStatus(),
      getFilters(),
      getNotifications(),
      getSettings(),
      getWatches(),
      getScheduler(),
      getFeedback(),
    ]);

    setStatus(nextStatus);
    setPresets(filterResponse.presets);
    setNotifications(notificationResponse.notifications);
    setDigests(notificationResponse.digests);
    setProfile(settingsResponse.profile);
    setWeights(settingsResponse.weights);
    setWatches(watchResponse.watches);
    setScheduler(schedulerResponse.settings);
    setFeedbackCandidates(feedbackResponse.candidates);

    const defaultPreset = filterResponse.presets.find((preset) => preset.isDefault)
      ?? filterResponse.presets[0];
    setSelectedPresetId((current) => current || defaultPreset?.id || "");
  }, []);

  const loadFeedView = useCallback(async (state: RecommendationState) => {
    const response = await getFeed(state, 60, 0);
    setFeed(response);
  }, []);

  const loadPresetCatalogue = useCallback(async (presetId: string, presetName?: string) => {
    if (!presetId) return;
    const response = await getCatalogueByPreset(presetId, 100, 0);
    setCatalogue(response);
    setCatalogueLabel((presetName ?? "Catalogue").toUpperCase());
  }, []);

  const loadInitial = useCallback(async () => {
    setError(null);
    try {
      await Promise.all([loadAncillary(), loadFeedView("unseen")]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Game Radar could not initialize.");
    } finally {
      setLoading(false);
    }
  }, [loadAncillary, loadFeedView]);

  useEffect(() => {
    queueMicrotask(() => {
      void loadInitial();
    });
  }, [loadInitial]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const sourceItems = useMemo<DisplayGame[]>(() => {
    if (activeView === "catalogue") {
      return (catalogue?.items ?? []).map((item) => ({
        game: item.game,
        recommendation: item.recommendation,
        watched: watchedIds.has(item.game.id),
        reason: item.matchedReasons.join(" ") || undefined,
        warnings: item.warnings,
        metadataCompleteness: item.metadataCompleteness,
      }));
    }
    return (feed?.items ?? []).map((item) => ({
      ...fromFeedItem(item),
      watched: watchedIds.has(item.game.id),
    }));
  }, [activeView, catalogue, feed, watchedIds]);

  const visibleItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sourceItems.filter((item) => {
      const game = item.game;
      if (query) {
        const haystack = [
          game.title,
          game.creatorName ?? "",
          game.shortDescription ?? "",
          game.tags.join(" "),
        ].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (quickPlatform !== "all" && !game.platforms[quickPlatform]) return false;
      if (freeOnly && !game.price.isFree) return false;
      if (saleOnly && !game.price.isOnSale) return false;
      return true;
    });
  }, [freeOnly, quickPlatform, saleOnly, search, sourceItems]);

  const featured = activeView === "unseen" && visibleItems.length > 0 ? visibleItems[0] : null;
  const gridItems = featured ? visibleItems.slice(1) : visibleItems;

  const refreshCurrentView = useCallback(async () => {
    if (activeView === "catalogue") {
      if (customFilter) {
        setCatalogue(await runCustomFilter(customFilter.rules, customFilter.sort, 100, 0));
      } else if (selectedPresetId) {
        const preset = presets.find((item) => item.id === selectedPresetId);
        await loadPresetCatalogue(selectedPresetId, preset?.name);
      }
    } else {
      await loadFeedView(activeView);
    }
  }, [activeView, customFilter, loadFeedView, loadPresetCatalogue, presets, selectedPresetId]);

  const selectView = async (view: ViewMode) => {
    setActiveView(view);
    setError(null);
    try {
      if (view === "catalogue") {
        setCustomFilter(null);
        const preset = presets.find((item) => item.id === selectedPresetId)
          ?? presets.find((item) => item.isDefault)
          ?? presets[0];
        if (preset) {
          setSelectedPresetId(preset.id);
          await loadPresetCatalogue(preset.id, preset.name);
        }
      } else {
        await loadFeedView(view);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The selected view could not be loaded.");
    }
  };

  const handlePresetChange = async (presetId: string) => {
    setSelectedPresetId(presetId);
    setCustomFilter(null);
    const preset = presets.find((item) => item.id === presetId);
    try {
      await loadPresetCatalogue(presetId, preset?.name);
      setActiveView("catalogue");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The filter preset could not be executed.");
    }
  };

  const handleCustomFilter = async (draft: AdvancedFilterDraft) => {
    setLoading(true);
    setError(null);
    try {
      const { rules, sort } = buildRulesFromDraft(draft);
      const response = await runCustomFilter(rules, sort, 100, 0);
      setCustomFilter({ rules, sort });
      setCatalogue(response);
      setCatalogueLabel("CUSTOM FILTER");
      setActiveView("catalogue");
      setFiltersOpen(false);
      setToast(`${response.totalMatched} catalogue matches found.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The custom filter could not be executed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    item: DisplayGame,
    state: "saved" | "hidden" | "played",
  ) => {
    setBusyGameId(item.game.id);
    setError(null);
    try {
      await updateRecommendation({
        recommendationId: item.recommendation?.id,
        gameId: item.game.id,
        state,
      });
      setToast(
        state === "saved"
          ? `${item.game.title} saved and watched for updates.`
          : state === "played"
            ? `${item.game.title} moved to played.`
            : `${item.game.title} removed from recommendations.`,
      );
      setSelectedGame(null);
      await Promise.all([refreshCurrentView(), loadAncillary()]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The game action failed.");
    } finally {
      setBusyGameId(null);
    }
  };

  const handleFeedback = async (
    item: DisplayGame,
    signalType: "more_like_this" | "less_like_this",
  ) => {
    setBusyGameId(item.game.id);
    setError(null);
    try {
      await sendFeedback({
        gameId: item.game.id,
        recommendationId: item.recommendation?.id,
        signalType,
      });
      const response = await getFeedback();
      setFeedbackCandidates(response.candidates);
      const settingsResponse = await getSettings();
      setWeights(settingsResponse.weights);
      setToast(
        signalType === "more_like_this"
          ? `Game Radar will favor titles resembling ${item.game.title}.`
          : `Game Radar will reduce titles resembling ${item.game.title}.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Feedback could not be recorded.");
    } finally {
      setBusyGameId(null);
    }
  };

  const handleWatch = async (item: DisplayGame) => {
    setBusyGameId(item.game.id);
    setError(null);
    try {
      await setWatch({
        gameId: item.game.id,
        action: item.watched ? "unwatch" : "watch",
        watchMetadata: true,
      });
      const response = await getWatches();
      setWatches(response.watches);
      setSelectedGame((current) => current?.game.id === item.game.id
        ? { ...current, watched: !item.watched }
        : current);
      setToast(item.watched ? "Update watch disabled." : "Update watch enabled.");
      setStatus(await getStatus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The watch state could not be changed.");
    } finally {
      setBusyGameId(null);
    }
  };

  const handleOpen = (item: DisplayGame) => {
    window.open(item.game.canonicalUrl, "_blank", "noopener,noreferrer");
    void updateRecommendation({
      recommendationId: item.recommendation?.id,
      gameId: item.game.id,
      state: "opened",
    }).catch(() => undefined);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await runPipeline();
      await Promise.all([loadAncillary(), refreshCurrentView()]);
      setToast("Game Radar refresh completed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The refresh pipeline failed.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleNotificationAction = async (
    notification: Notification,
    action: "read" | "opened" | "dismiss",
  ) => {
    setBusyNotificationId(notification.id);
    try {
      await updateNotification(notification.id, action);
      const response = await getNotifications();
      setNotifications(response.notifications);
      setDigests(response.digests);
      setStatus(await getStatus());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The notification could not be updated.");
    } finally {
      setBusyNotificationId(null);
    }
  };

  const handleSettingsSave = async (
    draft: PreferenceProfile,
    scheduleDraft: SchedulerSettings | null,
    adultDraft: AdultSettings,
  ) => {
    setLoading(true);
    try {
      const response = await updateSettings({
        id: draft.id,
        preferredPlatforms: draft.preferredPlatforms,
        maximumPriceMinor: draft.maximumPriceMinor ?? null,
        allowFree: draft.allowFree,
        allowPaid: draft.allowPaid,
        allowBrowserGames: draft.allowBrowserGames,
        excludeNsfw: false,
        minimumScore: draft.minimumScore,
      });
      setProfile(response.profile);
      setWeights(response.weights);
      const adultResponse = await updateAdultSettings({
        enabled: adultDraft.enabled,
        adultOnly: true,
        ageGateRequired: adultDraft.ageGateRequired,
        blurCoversByDefault: adultDraft.blurCoversByDefault,
        discreetNotifications: adultDraft.discreetNotifications,
        hideExplicitTitles: adultDraft.hideExplicitTitles,
        blockUnknownAgeContent: adultDraft.blockUnknownAgeContent,
      });
      setAdultPrivacy(adultResponse.settings);
      if (scheduleDraft) {
        const schedulerResponse = await updateScheduler({
          enabled: scheduleDraft.enabled,
          intervalHours: scheduleDraft.intervalHours,
          staleAfterHours: scheduleDraft.staleAfterHours,
          preferredLocalHour: scheduleDraft.preferredLocalHour,
          timezone: scheduleDraft.timezone,
          runOnStartup: scheduleDraft.runOnStartup,
        });
        setScheduler(schedulerResponse.settings);
      }
      setSettingsOpen(false);
      setToast("Preference and scheduling settings updated.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Settings could not be saved.");
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleCheck = async () => {
    setLoading(true);
    try {
      await runSchedulerCheck("startup-stale");
      const response = await getScheduler();
      setScheduler(response.settings);
      await Promise.all([loadAncillary(), refreshCurrentView()]);
      setToast("Game Radar stale check completed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The stale check failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateReview = async (
    id: string,
    status: "approved" | "rejected",
  ) => {
    try {
      await updateFeedbackCandidate(id, status);
      const response = await getFeedback();
      setFeedbackCandidates(response.candidates);
      setToast(`Feedback observation ${status}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Feedback review failed.");
    }
  };

  const currentCount = activeView === "catalogue"
    ? catalogue?.totalMatched ?? 0
    : feed?.total ?? 0;

  return (
    <main className={styles.radarPage}>
      <div className={styles.backgroundGrid} />
      <header className={styles.commandHeader}>
        <div className={styles.brandBlock}>
          <div className={styles.sigil}><RadarIcon name="gamepad" /></div>
          <div>
            <span className={styles.eyebrow}>DISCOVERY SUBSYSTEM // ITCH.IO</span>
            <h1>CHERNOBOG // GAME RADAR</h1>
            <p>Local catalogue intelligence, deterministic recommendations and monitored updates.</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.headerButton} type="button" onClick={() => setFiltersOpen(true)}>
            <RadarIcon name="filter" /> FILTER MATRIX
          </button>
          <button className={styles.headerButton} type="button" onClick={() => setNotificationsOpen(true)}>
            <RadarIcon name="bell" /> UPDATES
            {(status?.unreadNotifications ?? 0) > 0 && <b>{status?.unreadNotifications}</b>}
          </button>
          <button className={styles.headerButton} type="button" onClick={() => setSettingsOpen(true)}>
            <RadarIcon name="settings" /> SETTINGS
          </button>
          <button className={styles.primaryHeaderButton} type="button" disabled={refreshing} onClick={handleRefresh}>
            <RadarIcon name="refresh" /> {refreshing ? "REFRESHING" : "REFRESH"}
          </button>
        </div>
      </header>

      <section className={styles.statusDeck} aria-label="Game Radar status">
        <StatusCell label="SYSTEM" value={status?.healthy ? "NOMINAL" : "DEGRADED"} tone={status?.healthy ? "good" : "warning"} />
        <StatusCell label="CATALOGUE" value={String(status?.catalogueGames ?? 0)} detail={`${status?.enrichedGames ?? 0} enriched`} />
        <StatusCell label="UNSEEN" value={String(status?.unseenRecommendations ?? 0)} detail="recommendations" />
        <StatusCell label="WATCHES" value={String(status?.watchedGames ?? 0)} detail="active targets" />
        <StatusCell label="LAST REFRESH" value={formatRelativeTime(status?.latestPipelineRun?.finishedAt)} detail={status?.latestPipelineRun?.status ?? "not recorded"} tone={status?.stale ? "warning" : "neutral"} />
      </section>

      {status?.stale && (
        <div className={styles.warningBanner}>
          <RadarIcon name="signal" />
          <span>{status.staleReason ?? "The local catalogue is stale."}</span>
        </div>
      )}
      {error && (
        <div className={styles.errorBanner}>
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>DISMISS</button>
        </div>
      )}

      <section className={styles.controlStrip}>
        <nav className={styles.viewTabs} aria-label="Game Radar views">
          {VIEW_OPTIONS.map((view) => (
            <button
              type="button"
              key={view.id}
              className={activeView === view.id ? styles.activeTab : ""}
              onClick={() => void selectView(view.id)}
            >
              {view.label}
            </button>
          ))}
        </nav>
        <div className={styles.searchBox}>
          <RadarIcon name="search" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search NSFW games by title, creator, description or tag"
            aria-label="Search visible games"
          />
        </div>
      </section>

      <div className={styles.contentLayout}>
        <aside className={styles.filterRail}>
          <div className={styles.railHeader}>
            <span>VIEW CONTROL</span>
            <strong>{currentCount} RESULTS</strong>
          </div>

          <label className={styles.railField}>
            <span>FILTER PRESET</span>
            <select value={selectedPresetId} onChange={(event) => void handlePresetChange(event.target.value)}>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>{preset.name}{preset.isDefault ? " — DEFAULT" : ""}</option>
              ))}
            </select>
          </label>

          <div className={styles.quickFilterGroup}>
            <span>QUICK PLATFORM</span>
            {(["all", "windows", "linux", "macos", "browser"] as QuickPlatform[]).map((platform) => (
              <button
                type="button"
                key={platform}
                className={quickPlatform === platform ? styles.quickActive : ""}
                onClick={() => setQuickPlatform(platform)}
              >
                {platform.toUpperCase()}
              </button>
            ))}
          </div>

          <label className={styles.railToggle}>
            <input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} />
            <span>FREE ONLY</span>
          </label>
          <label className={styles.railToggle}>
            <input type="checkbox" checked={saleOnly} onChange={(event) => setSaleOnly(event.target.checked)} />
            <span>ON SALE</span>
          </label>

          <button className={styles.advancedButton} type="button" onClick={() => setFiltersOpen(true)}>
            <RadarIcon name="filter" /> ADVANCED MATRIX
          </button>

          <div className={styles.systemReadout}>
            <span>ACTIVE VIEW</span>
            <strong>{activeView === "catalogue" ? catalogueLabel : activeView.toUpperCase()}</strong>
            <span>VISIBLE AFTER QUICK FILTERS</span>
            <strong>{visibleItems.length}</strong>
            <span>ENABLED SOURCES</span>
            <strong>{status?.enabledSources ?? 0}</strong>
          </div>
        </aside>

        <section className={styles.feedArea}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>ACTIVE DISCOVERY FEED</span>
              <h2>{activeView === "catalogue" ? catalogueLabel : VIEW_OPTIONS.find((item) => item.id === activeView)?.label}</h2>
            </div>
            <span>{visibleItems.length} displayed / {currentCount} stored</span>
          </div>

          {loading ? (
            <LoadingState />
          ) : visibleItems.length === 0 ? (
            <EmptyState activeView={activeView} onRefresh={handleRefresh} />
          ) : (
            <>
              {featured && (
                <GameCard
                  item={featured}
                  blurCoverByDefault={adultPrivacy.blurCoversByDefault}
                  featured
                  busy={busyGameId === featured.game.id}
                  onSelect={setSelectedGame}
                  onAction={handleAction}
                  onWatch={handleWatch}
                  onOpen={handleOpen}
                />
              )}
              <div className={styles.gameGrid}>
                {gridItems.map((item) => (
                  <GameCard
                    key={item.game.id}
                    item={item}
                    blurCoverByDefault={adultPrivacy.blurCoversByDefault}
                    busy={busyGameId === item.game.id}
                    onSelect={setSelectedGame}
                    onAction={handleAction}
                    onWatch={handleWatch}
                    onOpen={handleOpen}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <footer className={styles.footerReadout}>
        <span>GAME RADAR UI // STAGE J</span>
        <span>CATALOGUE CACHE: {status?.catalogueGames ?? 0} RECORDS</span>
        <span>DATABASE: {status?.databaseReady ? "READY" : "OFFLINE"}</span>
      </footer>

      <GameDetailsDrawer
        item={selectedGame}
        busy={selectedGame ? busyGameId === selectedGame.game.id : false}
        onClose={() => setSelectedGame(null)}
        onAction={handleAction}
        onWatch={handleWatch}
        onOpen={handleOpen}
        onFeedback={handleFeedback}
      />
      <AdvancedFilterPanel
        open={filtersOpen}
        presets={presets}
        busy={loading}
        onClose={() => setFiltersOpen(false)}
        onApply={handleCustomFilter}
        onPresetSaved={(preset) => {
          setPresets((current) => [...current.filter((item) => item.id !== preset.id), preset]);
          setSelectedPresetId(preset.id);
          setToast(`Filter preset “${preset.name}” saved.`);
        }}
      />
      <NotificationPanel
        open={notificationsOpen}
        notifications={notifications}
        digests={digests}
        busyId={busyNotificationId}
        onClose={() => setNotificationsOpen(false)}
        onAction={handleNotificationAction}
      />
      <SettingsPanel
        open={settingsOpen}
        profile={profile}
        weights={weights}
        scheduler={scheduler}
        adultSettings={adultPrivacy}
        candidates={feedbackCandidates}
        busy={loading}
        onClose={() => setSettingsOpen(false)}
        onSave={handleSettingsSave}
        onRunScheduleCheck={handleScheduleCheck}
        onCandidateReview={handleCandidateReview}
      />

      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}

function StatusCell({
  label,
  value,
  detail,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "good" | "warning";
}) {
  return (
    <div className={`${styles.statusCell} ${styles[`tone_${tone}`]}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}

function LoadingState() {
  return (
    <div className={styles.loadingState}>
      <div className={styles.radarSpinner}><i /><i /><i /></div>
      <strong>ACQUIRING LOCAL CATALOGUE</strong>
      <span>Reading recommendations, filters and update telemetry.</span>
    </div>
  );
}

function EmptyState({ activeView, onRefresh }: { activeView: ViewMode; onRefresh: () => void }) {
  const message = activeView === "unseen"
    ? "The active recommendation queue is dry. This is intentional; Game Radar does not recycle filler."
    : activeView === "catalogue"
      ? "No catalogue records satisfy the current hard filters and quick filters."
      : `No games are currently marked ${activeView}.`;

  return (
    <div className={styles.emptyState}>
      <RadarIcon name="signal" />
      <strong>NO ACTIVE TARGETS</strong>
      <p>{message}</p>
      <button className={styles.openButton} type="button" onClick={onRefresh}>
        RUN REFRESH <RadarIcon name="refresh" />
      </button>
    </div>
  );
}
