import styles from "./schematicVisualLibrary.module.css";

type SchematicViewerErrorStateProps = {
  title: string;
  message: string;
  details?: string[];
  tone?: "warning" | "error" | "empty";
};

export function SchematicViewerErrorState({
  title,
  message,
  details = [],
  tone = "error",
}: SchematicViewerErrorStateProps) {
  const toneClassName = getToneClassName(tone);

  return (
    <div className={`${styles.viewerState} ${toneClassName}`}>
      <h2 className={styles.viewerStateTitle}>{title}</h2>
      <p className={styles.viewerStateMessage}>{message}</p>

      {details.length > 0 ? (
        <ul className={styles.viewerStateDetails}>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function getToneClassName(tone: "warning" | "error" | "empty"): string {
  switch (tone) {
    case "warning":
      return styles.viewerStateWarning;
    case "empty":
      return styles.viewerStateEmpty;
    case "error":
    default:
      return styles.viewerStateError;
  }
}
