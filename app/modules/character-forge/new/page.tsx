import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";
import { CharacterProjectCreateForm } from "@/lib/modules/character-generator/components/CharacterProjectCreateForm";
import styles from "@/lib/modules/character-generator/components/characterForge.module.css";

export default function NewCharacterProjectPage() {
  return (
    <ChernobogShell currentArea="Character Forge / New Project">
      <main className={styles.page}>
        <section className={styles.workspaceHeader}>
          <div>
            <p className={styles.eyebrow}>Character Forge / Intake</p>
            <h1 className={styles.workspaceTitle}>Create Character Project</h1>
            <p className={styles.heroText}>
              Start with a strong source prompt. After creation, Chernobog can
              turn it into an editable production brief for your approval.
            </p>
          </div>
          <span className={styles.systemMarker}>Stage 01 / Prompt</span>
        </section>

        <CharacterProjectCreateForm />
      </main>
    </ChernobogShell>
  );
}
