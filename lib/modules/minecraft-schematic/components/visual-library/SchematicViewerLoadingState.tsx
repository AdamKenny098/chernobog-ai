import styles from "./schematicVisualLibrary.module.css";

type SchematicViewerLoadingStateProps = {
  message?: string;
};

export function SchematicViewerLoadingState({
  message = "Preparing schematic preview...",
}: SchematicViewerLoadingStateProps) {
  return (
    <div className={styles.viewerLoadingState} aria-live="polite">
      <div className={styles.viewerLoadingSpinner} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
