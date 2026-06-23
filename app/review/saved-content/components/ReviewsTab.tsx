import ActionButton from "./ActionButton";
import StatusBadge from "./StatusBadge";

type Review = {
  id: string;
  title: string;
  status: string;
  platform: string;
  sourceItemId: string;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
};

type ReviewsTabProps = {
  reviews: Review[];
  runAction: (command: string) => Promise<void>;
};

export default function ReviewsTab({ reviews, runAction }: ReviewsTabProps) {
  return (
    <div>
      <h2 style={styles.heading}>Content Reviews</h2>
      <p style={styles.muted}>
        Review, approve, reject, and apply extracted intelligence from saved content.
      </p>

      <div style={styles.actionRow}>
        <ActionButton command="show saved content reviews" runAction={runAction}>
          Show reviews
        </ActionButton>
        <ActionButton command="show pending content reviews" runAction={runAction}>
          Pending
        </ActionButton>
        <ActionButton command="show applied content reviews" runAction={runAction}>
          Applied
        </ActionButton>
        <ActionButton command="create reviews for analyzed content" runAction={runAction}>
          Create reviews for analyzed
        </ActionButton>
      </div>

      <div style={styles.list}>
        {reviews.length === 0 ? (
          <p style={styles.muted}>No content reviews found yet.</p>
        ) : (
          reviews.map((review) => (
            <article key={review.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <h3 style={styles.cardTitle}>{review.title}</h3>
                  <p style={styles.meta}>
                    {review.id} / {review.platform}
                  </p>
                  <a href={review.sourceUrl} target="_blank" rel="noreferrer" style={styles.link}>
                    Open source
                  </a>
                </div>
                <StatusBadge value={review.status} />
              </div>

              <div style={styles.actionRow}>
                <ActionButton command={`show saved content review ${review.id}`} runAction={runAction}>
                  Show
                </ActionButton>
                <ActionButton command={`approve all review ${review.id}`} runAction={runAction}>
                  Approve all
                </ActionButton>
                <ActionButton command={`reject all review ${review.id}`} runAction={runAction}>
                  Reject all
                </ActionButton>
                <ActionButton command={`apply saved content review ${review.id}`} runAction={runAction}>
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

const styles: Record<string, React.CSSProperties> = {
  heading: {
    margin: 0,
    fontSize: "20px",
  },
  muted: {
    color: "#8F9CA3",
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    margin: "12px 0",
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  card: {
    border: "1px solid #26323A",
    background: "#10161A",
    borderRadius: "12px",
    padding: "14px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "16px",
  },
  meta: {
    margin: "6px 0",
    color: "#8F9CA3",
    fontSize: "13px",
  },
  link: {
    color: "#9EC7E6",
    fontSize: "13px",
  },
};
