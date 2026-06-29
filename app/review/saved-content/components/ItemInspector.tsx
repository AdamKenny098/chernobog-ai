import ActionButton from "./ActionButton";
import StatusBadge from "./StatusBadge";
import ThumbnailFrame from "./ThumbnailFrame";
import styles from "../saved-content-dashboard.module.css";

type ItemInspectorProps = {
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
    extractedTasks: string[];
    extractedIdeas: string[];
    extractedWarnings: string[];
    review?: {
      id: string;
      status: string;
    };
    thumbnail?: {
      thumbnailUrl?: string;
      fallbackUrl?: string;
      thumbnailUrls?: string[];
      status: string;
      source: string;
      error?: string;
    };
  } | null;
  runAction: (request: unknown) => Promise<void>;
};

export default function ItemInspector({ item, runAction }: ItemInspectorProps) {
  if (!item) {
    return <div className={styles.inspectorEmpty}>No item selected.</div>;
  }

  return (
    <div>
      <ThumbnailFrame title={item.title} platform={item.platform} thumbnail={item.thumbnail} />

      <div className={styles.inspectorSection}>
        <h2 className={styles.inspectorTitle}>{item.title}</h2>
        <div className={styles.inspectorMeta}>
          {item.platform}{" // "}{item.sourceType}{" // "}{item.externalId ?? "no external id"}
        </div>

        <div className={styles.badgeRow}>
          <StatusBadge value={item.queueStatus} />
          <StatusBadge value={item.analysisStatus} />
          <StatusBadge value={item.transcriptStatus} />
          <StatusBadge value={item.thumbnail?.status ?? "no-thumbnail"} />
          {item.review ? <StatusBadge value={item.review.status} /> : null}
        </div>

        <div className={styles.actionRow}>
          <ActionButton
            request={{ type: "queue-action", action: "fetch-transcript", itemId: item.id }}
            runAction={runAction}
          >
            Fetch Transcript
          </ActionButton>
          <ActionButton
            request={{ type: "queue-action", action: "summarize", itemId: item.id }}
            runAction={runAction}
          >
            Summarize
          </ActionButton>
          <ActionButton
            request={{ type: "queue-action", action: "reason", itemId: item.id }}
            runAction={runAction}
          >
            Reason Saved
          </ActionButton>
          <ActionButton
            request={{ type: "queue-action", action: "extract-candidates", itemId: item.id }}
            runAction={runAction}
          >
            Extract
          </ActionButton>
          <ActionButton
            request={{ type: "queue-action", action: "create-review", itemId: item.id }}
            runAction={runAction}
          >
            Create Review
          </ActionButton>
        </div>
      </div>

      <div className={styles.inspectorSection}>
        <h3>Source</h3>
        <p>
          <a className={styles.link} href={item.url} target="_blank" rel="noreferrer">
            Open original source
          </a>
        </p>
        <p>{item.sourceContainerTitle ?? "No source container title."}</p>
      </div>

      <div className={styles.inspectorSection}>
        <h3>Thumbnail</h3>
        <p>Status: {item.thumbnail?.status ?? "not cached"}</p>
        <p>Source: {item.thumbnail?.source ?? "none"}</p>
        <p>Fallback URLs: {item.thumbnail?.thumbnailUrls?.length ?? 0}</p>
        {item.thumbnail?.error ? <p>Error: {item.thumbnail.error}</p> : null}
      </div>

      <div className={styles.inspectorSection}>
        <h3>Summary</h3>
        <p>{item.summary ?? "No summary generated yet."}</p>
      </div>

      <div className={styles.inspectorSection}>
        <h3>Possible Reason Saved</h3>
        <p>{item.possibleReasonSaved ?? "No reason inference generated yet."}</p>
      </div>

      <ListSection title="Topics" values={item.topics} />
      <ListSection title="Related Projects" values={item.relatedProjects} />
      <ListSection title="Tasks" values={item.extractedTasks} />
      <ListSection title="Ideas" values={item.extractedIdeas} />
      <ListSection title="Warnings" values={item.extractedWarnings} />

      {item.review ? (
        <div className={styles.inspectorSection}>
          <h3>Review</h3>
          <p>{item.review.id}</p>
          <div className={styles.actionRow}>
            <ActionButton
              request={{ type: "review-action", action: "show", reviewId: item.review.id }}
              runAction={runAction}
            >
              Show
            </ActionButton>
            <ActionButton
              request={{ type: "review-action", action: "approve-all", reviewId: item.review.id }}
              runAction={runAction}
            >
              Approve All
            </ActionButton>
            <ActionButton
              request={{ type: "review-action", action: "apply", reviewId: item.review.id }}
              runAction={runAction}
            >
              Apply
            </ActionButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ListSection({ title, values }: { title: string; values: string[] }) {
  return (
    <div className={styles.inspectorSection}>
      <h3>{title}</h3>
      {values.length ? (
        <ul>
          {values.map((value, index) => (
            <li key={`${title}-${index}`}>{value}</li>
          ))}
        </ul>
      ) : (
        <p>None.</p>
      )}
    </div>
  );
}
