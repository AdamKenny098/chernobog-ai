import Link from "next/link";

import type { VisualSchematicLibraryFilters } from "../../visual-library/types";
import { hasActiveVisualSchematicFilters } from "../../visual-library/filterVisualSchematicLibrary";
import styles from "./schematicVisualLibrary.module.css";

type SchematicLibraryEmptyStateProps = {
  filters: VisualSchematicLibraryFilters;
  totalSchematics: number;
};

export function SchematicLibraryEmptyState({
  filters,
  totalSchematics,
}: SchematicLibraryEmptyStateProps) {
  const hasFilters = hasActiveVisualSchematicFilters(filters);

  return (
    <section className={styles.emptyState}>
      <h2>{hasFilters ? "No matching schematics" : "No schematics found"}</h2>
      <p>
        {hasFilters && totalSchematics > 0
          ? "The library has managed assets, but none match the current filters. Reset the filters or search for a broader term."
          : "No managed schematic metadata was discovered. If Milestone 7 stores assets in a different folder, set CHERNOBOG_SCHEMATIC_LIBRARY_DIR to that relative path."}
      </p>

      {hasFilters ? (
        <Link className={styles.secondaryButton} href="/schematics">
          Reset filters
        </Link>
      ) : null}
    </section>
  );
}
