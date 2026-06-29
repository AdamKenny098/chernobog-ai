import { useEffect, useMemo, useState } from "react";

import styles from "../saved-content-dashboard.module.css";

type ThumbnailFrameProps = {
  title: string;
  platform: string;
  thumbnail?: {
    thumbnailUrl?: string;
    fallbackUrl?: string;
    thumbnailUrls?: string[];
    status: string;
  };
};

export default function ThumbnailFrame({ title, platform, thumbnail }: ThumbnailFrameProps) {
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
    <div className={styles.thumbnail}>
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

      {src && index >= urls.length - 1 && thumbnail?.status === "failed" ? (
        <span className={styles.thumbnailFallback}>{platform}</span>
      ) : null}
    </div>
  );
}
