"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import type { CharacterProjectStatus } from "../types";
import styles from "./characterForge.module.css";

type UpdateProjectResponse = {
  ok: boolean;
  error?: string;
  project?: {
    name: string;
    originalPrompt: string;
  };
};

export function CharacterProjectEditor({
  projectId,
  initialName,
  initialPrompt,
  status,
}: {
  projectId: string;
  initialName: string;
  initialPrompt: string;
  status: CharacterProjectStatus;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const promptEditable = status === "draft";
  const changed =
    name.trim() !== initialName ||
    (promptEditable && prompt.trim() !== initialPrompt);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const body: { name?: string; originalPrompt?: string } = {};

      if (name.trim() !== initialName) {
        body.name = name.trim();
      }

      if (promptEditable && prompt.trim() !== initialPrompt) {
        body.originalPrompt = prompt.trim();
      }

      const response = await fetch(
        `/api/character-generator/projects/${projectId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const result = (await response.json()) as UpdateProjectResponse;

      if (!response.ok || !result.ok || !result.project) {
        throw new Error(result.error ?? "Character project update failed.");
      }

      setName(result.project.name);
      setPrompt(result.project.originalPrompt);
      setSuccess("Project details saved.");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Character project update failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.editorPanel} onSubmit={handleSubmit}>
      <div className={styles.sectionHeadingRow}>
        <div>
          <p className={styles.eyebrow}>Source definition</p>
          <h2 className={styles.sectionTitle}>Project Details</h2>
        </div>
        <span className={styles.statusBadge}>{status.replaceAll("_", " ")}</span>
      </div>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Project name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
          className={styles.input}
          disabled={submitting}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.fieldLabel}>Original prompt</span>
        <span className={styles.fieldHint}>
          {promptEditable
            ? "Editable until the structured brief is approved."
            : "Locked because this project has progressed beyond draft."}
        </span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          maxLength={8_000}
          required
          rows={12}
          className={styles.textarea}
          disabled={submitting || !promptEditable}
        />
      </label>

      {error ? <div className={styles.errorMessage}>{error}</div> : null}
      {success ? <div className={styles.successMessage}>{success}</div> : null}

      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={submitting || !changed || name.trim().length === 0}
        >
          {submitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
