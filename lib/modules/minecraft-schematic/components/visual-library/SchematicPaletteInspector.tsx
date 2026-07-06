import Link from "next/link";

import type { VisualSchematicDetail } from "../../visual-library/types";
import styles from "./schematicVisualLibrary.module.css";

type SchematicPaletteInspectorProps = {
  schematic: VisualSchematicDetail;
  highlightedBlockId: string;
};

export function SchematicPaletteInspector({
  schematic,
  highlightedBlockId,
}: SchematicPaletteInspectorProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeaderRow}>
        <h2 className={styles.panelTitle}>Palette Inspector</h2>
        {highlightedBlockId ? (
          <Link
            className={styles.secondaryButtonCompact}
            href={`/schematics/${encodeURIComponent(schematic.id)}`}
          >
            Clear
          </Link>
        ) : null}
      </div>

      {schematic.highlightCandidates.length > 0 ? (
        <ul className={styles.paletteList}>
          {schematic.highlightCandidates.map((entry) => {
            const isActive = entry.blockId === highlightedBlockId;

            return (
              <li
                key={entry.blockId}
                className={isActive ? styles.activePaletteInspectorItem : styles.paletteInspectorItem}
              >
                <span
                  className={styles.swatch}
                  style={{ backgroundColor: entry.color }}
                />
                <span className={styles.paletteTextBlock}>
                  <span className={styles.palettePrimaryText}>{entry.blockId}</span>
                  <span className={styles.paletteSecondaryText}>
                    {entry.displayName} · {entry.count.toLocaleString()} blocks
                  </span>
                </span>
                <Link
                  className={styles.inspectLink}
                  href={`/schematics/${encodeURIComponent(schematic.id)}?highlight=${encodeURIComponent(entry.blockId)}`}
                >
                  Inspect
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.statusLine}>
          Palette data is not available yet. This inspector is ready for richer block extraction and block highlighting.
        </p>
      )}
    </section>
  );
}
