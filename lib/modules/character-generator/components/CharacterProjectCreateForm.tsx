"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "./characterForge.module.css";

type CreateProjectResponse = {
  ok: boolean;
  error?: string;
  project?: {
    id: string;
  };
};

export function CharacterProjectCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/character-generator/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim() || undefined,
          prompt: prompt.trim(),
        }),
      });

      const result = (await response.json()) as CreateProjectResponse;

      if (!response.ok || !result.ok || !result.project?.id) {
        throw new Error(result.error ?? "Character project creation failed.");
      }

      router.push(`/modules/character-forge/${result.project.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Character project creation failed."
      );
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.formPanel} onSubmit={handleSubmit}>
      <div className={styles.formIntro}>
        <p className={styles.eyebrow}>Project intake</p>
        <h2 className={styles.sectionTitle}>Define the Character</h2>
        <p className={styles.mutedText}>
          Give Chernobog enough design intent to build an editable brief in the
          next stage. Technical requirements can stay in the same prompt.
        </p>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Project name</span>
        <span className={styles.fieldHint}>Optional — inferred from the prompt if empty.</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          placeholder="Rook"
          className={styles.input}
          disabled={submitting}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Character prompt</span>
        <span className={styles.fieldHint}>
          Include identity, silhouette, clothing, equipment, style, and game use.
        </span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={8_000}
          minLength={1}
          required
          rows={10}
          placeholder="A battle-worn monster hunter with a brass prosthetic arm, heavy winter clothing and an old military rifle. Stylised dark fantasy for a third-person Unity game."
          className={styles.textarea}
          disabled={submitting}
        />
        <span className={styles.characterCount}>{prompt.length.toLocaleString()} / 8,000</span>
      </label>

      {error ? <div className={styles.errorMessage}>{error}</div> : null}

      <div className={styles.formActions}>
        <Link href="/modules/character-forge" className={styles.secondaryButton}>
          Cancel
        </Link>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={submitting || prompt.trim().length === 0}
        >
          {submitting ? "Creating project..." : "Create Character Project"}
        </button>
      </div>
    </form>
  );
}
