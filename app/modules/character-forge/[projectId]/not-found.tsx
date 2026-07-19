import Link from "next/link";

import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
import styles from "@/lib/modules/character-generator/components/characterForge.module.css";

export default function CharacterProjectNotFound() {
  return (
    <ChernobogShell currentArea="Character Forge / Missing Project">
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <div className={styles.emptyStateInner}>
            <p className={styles.eyebrow}>Character Forge / 404</p>
            <h1 className={styles.emptyStateTitle}>Project not found</h1>
            <p className={styles.mutedText}>
              The requested character project does not exist or its ID is invalid.
            </p>
            <div style={{ marginTop: 20 }}>
              <Link
                href="/modules/character-forge"
                className={styles.primaryButton}
              >
                Return to Project Library
              </Link>
            </div>
          </div>
        </section>
      </main>
    </ChernobogShell>
  );
}
