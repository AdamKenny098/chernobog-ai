import { useState } from "react";

import ActionButton from "./ActionButton";
import StatusBadge from "./StatusBadge";
import styles from "../saved-content-dashboard.module.css";

type ImportPanelProps = {
  ingestRuns: Array<{
    id: string;
    kind: string;
    status: string;
    platform?: string;
    archivePath?: string;
    createdAt: string;
    candidatesFound: number;
    queueItems: number;
  }>;
  runAction: (request: unknown) => Promise<void>;
};

export default function ImportPanel({ ingestRuns, runAction }: ImportPanelProps) {
  const [platform, setPlatform] = useState<"youtube" | "tiktok">("youtube");
  const [source, setSource] = useState<"archive" | "playlist-url">("archive");
  const [mode, setMode] = useState<"scan" | "import" | "scan-import">("scan");
  const [value, setValue] = useState("");

  return (
    <div>
      <div className={styles.workbenchHeader}>
        <div>
          <h2 className={styles.workbenchTitle}>Import Control</h2>
          <p className={styles.workbenchSubtitle}>
            Scan archives, import folders, or bridge a YouTube playlist URL into the saved-content queue.
          </p>
        </div>
      </div>

      <div className={styles.importGrid}>
        <section className={styles.importPanel}>
          <label className={styles.label}>
            Platform
            <select
              className={styles.select}
              value={platform}
              onChange={(event) => setPlatform(event.target.value as "youtube" | "tiktok")}
            >
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
            </select>
          </label>

          <label className={styles.label}>
            Source
            <select
              className={styles.select}
              value={source}
              onChange={(event) => setSource(event.target.value as "archive" | "playlist-url")}
            >
              <option value="archive">Archive / Folder</option>
              <option value="playlist-url">YouTube Playlist URL</option>
            </select>
          </label>

          <label className={styles.label}>
            Mode
            <select
              className={styles.select}
              value={mode}
              onChange={(event) => setMode(event.target.value as "scan" | "import" | "scan-import")}
            >
              <option value="scan">Scan</option>
              <option value="import">Import</option>
              <option value="scan-import">Scan then Import</option>
            </select>
          </label>

          <label className={styles.label}>
            Path or URL
            <input
              className={styles.input}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder={
                source === "playlist-url"
                  ? "https://www.youtube.com/playlist?list=..."
                  : ".\\imports\\youtube"
              }
            />
          </label>

          <ActionButton
            request={{ type: "import", platform, source, mode, value }}
            runAction={runAction}
          >
            Execute Import Operation
          </ActionButton>
        </section>

        <section className={styles.importPanel}>
          <div className={styles.panelTitle}>Recent Runs</div>
          <div className={styles.queueList}>
            {ingestRuns.slice(0, 20).map((run) => (
              <article className={styles.runCard} key={run.id}>
                <div className={styles.rowTitle}>{run.id}</div>
                <div className={styles.rowMeta}>
                  {run.platform ?? "mixed"}{" // "}{run.kind}{" // candidates "}{run.candidatesFound}{" // queue "}{run.queueItems}
                </div>
                <StatusBadge value={run.status} />
                <div className={styles.actionRow}>
                  <ActionButton
                    request={{ type: "command", command: `show content ingest run ${run.id}` }}
                    runAction={runAction}
                  >
                    Show Run
                  </ActionButton>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
