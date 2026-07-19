"use client";

import { RadarIcon } from "./RadarIcon";
import { formatRelativeTime } from "./formatting";
import type { Notification, NotificationDigest } from "./types";
import styles from "./game-radar.module.css";

export function NotificationPanel({
  open,
  notifications,
  digests,
  busyId,
  onClose,
  onAction,
}: {
  open: boolean;
  notifications: Notification[];
  digests: NotificationDigest[];
  busyId: string | null;
  onClose: () => void;
  onAction: (notification: Notification, action: "read" | "opened" | "dismiss") => void;
}) {
  if (!open) return null;

  return (
    <div className={styles.drawerBackdrop} role="presentation" onMouseDown={onClose}>
      <aside
        className={`${styles.detailsDrawer} ${styles.notificationDrawer}`}
        role="dialog"
        aria-modal="true"
        aria-label="Game update notifications"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.drawerHeader}>
          <div>
            <span className={styles.eyebrow}>UPDATE RELAY</span>
            <h2>Notifications</h2>
          </div>
          <button className={styles.iconAction} type="button" onClick={onClose} aria-label="Close notifications">
            <RadarIcon name="close" />
          </button>
        </div>

        {digests.length > 0 && (
          <section className={styles.digestSection}>
            <h3>DAILY DIGESTS</h3>
            {digests.slice(0, 3).map((digest) => (
              <article className={styles.digestCard} key={digest.id}>
                <div>
                  <strong>{digest.title}</strong>
                  <span>{digest.itemCount} update{digest.itemCount === 1 ? "" : "s"}</span>
                </div>
                <p>{digest.body}</p>
              </article>
            ))}
          </section>
        )}

        <section className={styles.notificationList}>
          <h3>EVENT STREAM</h3>
          {notifications.length === 0 && (
            <div className={styles.emptyPanel}>
              <RadarIcon name="signal" />
              <strong>No update signals</strong>
              <span>Watched games have not produced any new events.</span>
            </div>
          )}
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`${styles.notificationCard} ${notification.state === "unread" ? styles.unreadNotification : ""}`}
            >
              <div className={styles.notificationHeader}>
                <span className={`${styles.priorityDot} ${styles[`priority_${notification.priority}`]}`} />
                <strong>{notification.title}</strong>
                <time>{formatRelativeTime(notification.createdAt)}</time>
              </div>
              <p>{notification.body}</p>
              <div className={styles.notificationActions}>
                {notification.state === "unread" && (
                  <button type="button" disabled={busyId === notification.id} onClick={() => onAction(notification, "read")}>MARK READ</button>
                )}
                <button type="button" disabled={busyId === notification.id} onClick={() => onAction(notification, "opened")}>OPEN</button>
                <button type="button" disabled={busyId === notification.id} onClick={() => onAction(notification, "dismiss")}>DISMISS</button>
              </div>
            </article>
          ))}
        </section>
      </aside>
    </div>
  );
}
