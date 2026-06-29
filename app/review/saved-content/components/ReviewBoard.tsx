import ActionButton from "./ActionButton";
import StatusBadge from "./StatusBadge";
import styles from "../saved-content-dashboard.module.css";

type ReviewBoardProps = {
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
  selectedReviewId: string | null;
  setSelectedReviewId: (id: string) => void;
  runAction: (request: unknown) => Promise<void>;
};

export default function ReviewBoard({
  reviews,
  selectedReviewId,
  setSelectedReviewId,
  runAction,
}: ReviewBoardProps) {
  return (
    <div>
      <div className={styles.workbenchHeader}>
        <div>
          <h2 className={styles.workbenchTitle}>Review Board</h2>
          <p className={styles.workbenchSubtitle}>
            Approve, reject, and apply extracted intelligence.
          </p>
        </div>
        <ActionButton
          request={{ type: "command", command: "create reviews for analyzed content" }}
          runAction={runAction}
        >
          Generate Reviews
        </ActionButton>
      </div>

      <div className={styles.reviewGrid}>
        {reviews.length === 0 ? (
          <div className={styles.emptyState}>No content reviews have been created yet.</div>
        ) : (
          reviews.map((review) => (
            <article
              className={`${styles.reviewCard} ${
                selectedReviewId === review.id ? styles.queueRowSelected : ""
              }`}
              key={review.id}
              onClick={() => setSelectedReviewId(review.id)}
            >
              <h3 className={styles.rowTitle}>{review.title}</h3>
              <div className={styles.rowMeta}>
                {review.id}{" // "}{review.platform}
              </div>
              <div className={styles.badgeRow}>
                <StatusBadge value={review.status} />
              </div>
              <div className={styles.actionRow} onClick={(event) => event.stopPropagation()}>
                <ActionButton
                  request={{ type: "review-action", action: "show", reviewId: review.id }}
                  runAction={runAction}
                >
                  Show
                </ActionButton>
                <ActionButton
                  request={{ type: "review-action", action: "approve-all", reviewId: review.id }}
                  runAction={runAction}
                >
                  Approve All
                </ActionButton>
                <ActionButton
                  request={{ type: "review-action", action: "reject-all", reviewId: review.id }}
                  runAction={runAction}
                  danger
                >
                  Reject All
                </ActionButton>
                <ActionButton
                  request={{ type: "review-action", action: "apply", reviewId: review.id }}
                  runAction={runAction}
                >
                  Apply
                </ActionButton>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
