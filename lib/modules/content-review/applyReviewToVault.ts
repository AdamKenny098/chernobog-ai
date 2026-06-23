import fs from "node:fs/promises";
import path from "node:path";

import {
  updateSavedContentItemById,
} from "@/lib/modules/saved-content";

import {
  getVaultRootForContentReview,
  markReviewApplied,
  readContentReview,
  relativeToVault,
  writeAppliedChangesMarkdown,
} from "./store";
import {
  ApplyContentReviewResult,
  ContentReview,
  ReviewCandidate,
} from "./types";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "unsorted";
}

async function appendToFile(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.appendFile(filePath, content, "utf8");
  } catch {
    await fs.writeFile(filePath, content, "utf8");
  }
}

function approved(candidates: ReviewCandidate[]) {
  return candidates.filter((candidate) => candidate.status === "approved");
}

function pickTargetProject(review: ContentReview) {
  const approvedProject =
    approved(review.projectLinks)[0]?.targetProject ??
    approved(review.tasks)[0]?.targetProject ??
    approved(review.ideas)[0]?.targetProject;

  return approvedProject ?? "Unsorted";
}

function sourceFooter(review: ContentReview) {
  return [
    "",
    "Source:",
    `- Review ID: ${review.id}`,
    `- Platform: ${review.platform}`,
    `- Title: ${review.title}`,
    `- URL: ${review.sourceUrl}`,
    `- Created: ${review.createdAt}`,
    "",
  ].join("\n");
}

async function writeResearchNote(review: ContentReview, outPaths: string[]) {
  const vaultRoot = getVaultRootForContentReview();
  const researchPath = path.join(
    vaultRoot,
    "research",
    "saved-content",
    `${review.id}.md`
  );

  const lines = [
    `# Saved Content Review — ${review.title}`,
    "",
    "## Source",
    "",
    `- Review ID: ${review.id}`,
    `- Platform: ${review.platform}`,
    `- URL: ${review.sourceUrl}`,
    `- Creator: ${review.sourceMeta.creator ?? "unknown"}`,
    "",
    "## Approved Summary",
    "",
    review.summary?.status === "approved" ? review.summary.text : "_No approved summary._",
    "",
    "## Approved Reason",
    "",
    review.possibleReasonSaved?.status === "approved"
      ? review.possibleReasonSaved.text
      : "_No approved reason._",
    "",
    "## Approved Project Links",
    "",
    approved(review.projectLinks).length
      ? approved(review.projectLinks).map((candidate) => `- ${candidate.targetProject ?? candidate.text}`).join("\n")
      : "_None_",
    "",
    "## Approved Tasks",
    "",
    approved(review.tasks).length
      ? approved(review.tasks).map((candidate) => `- ${candidate.text}`).join("\n")
      : "_None_",
    "",
    "## Approved Ideas",
    "",
    approved(review.ideas).length
      ? approved(review.ideas).map((candidate) => `- ${candidate.text}`).join("\n")
      : "_None_",
    "",
    "## Approved Warnings",
    "",
    approved(review.warnings).length
      ? approved(review.warnings).map((candidate) => `- ${candidate.text}`).join("\n")
      : "_None_",
    "",
  ];

  await fs.mkdir(path.dirname(researchPath), { recursive: true });
  await fs.writeFile(researchPath, lines.join("\n"), "utf8");
  outPaths.push(relativeToVault(researchPath));
}

async function appendTasks(review: ContentReview, tasks: ReviewCandidate[], outPaths: string[]) {
  if (tasks.length === 0) {
    return;
  }

  const vaultRoot = getVaultRootForContentReview();

  for (const task of tasks) {
    const project = task.targetProject ?? pickTargetProject(review);
    const taskPath = path.join(vaultRoot, "projects", slugify(project), "Tasks.md");

    const entry = [
      "",
      `- [ ] ${task.text}`,
      `  - Source: ${review.title}`,
      `  - Review: ${review.id}`,
      `  - URL: ${review.sourceUrl}`,
    ].join("\n");

    await appendToFile(taskPath, `${entry}\n`);
    outPaths.push(relativeToVault(taskPath));
  }
}

async function appendIdeas(review: ContentReview, ideas: ReviewCandidate[], outPaths: string[]) {
  if (ideas.length === 0) {
    return;
  }

  const vaultRoot = getVaultRootForContentReview();

  for (const idea of ideas) {
    const project = idea.targetProject ?? pickTargetProject(review);
    const ideaPath = path.join(vaultRoot, "projects", slugify(project), "Ideas.md");

    const entry = [
      "",
      `- ${idea.text}`,
      `  - Source: ${review.title}`,
      `  - Review: ${review.id}`,
      `  - URL: ${review.sourceUrl}`,
    ].join("\n");

    await appendToFile(ideaPath, `${entry}\n`);
    outPaths.push(relativeToVault(ideaPath));
  }
}

export async function applyApprovedContentReview(
  reviewId: string
): Promise<ApplyContentReviewResult | null> {
  const review = await readContentReview(reviewId);

  if (!review) {
    return null;
  }

  const appliedTasks = approved(review.tasks);
  const appliedIdeas = approved(review.ideas);
  const appliedProjectLinks = approved(review.projectLinks);
  const outPaths: string[] = [];

  await writeResearchNote(review, outPaths);
  await appendTasks(review, appliedTasks, outPaths);
  await appendIdeas(review, appliedIdeas, outPaths);

  const appliedMarkdown = [
    `# Applied Content Review — ${review.id}`,
    "",
    `Applied at: ${new Date().toISOString()}`,
    "",
    "## Applied Paths",
    "",
    ...Array.from(new Set(outPaths)).map((outPath) => `- ${outPath}`),
    "",
    "## Applied Tasks",
    "",
    appliedTasks.length ? appliedTasks.map((task) => `- ${task.text}`).join("\n") : "_None_",
    "",
    "## Applied Ideas",
    "",
    appliedIdeas.length ? appliedIdeas.map((idea) => `- ${idea.text}`).join("\n") : "_None_",
    "",
  ].join("\n");

  const appliedChangesPath = await writeAppliedChangesMarkdown(review.id, appliedMarkdown);
  outPaths.push(appliedChangesPath);

  await markReviewApplied(review);

  try {
    await updateSavedContentItemById({
      id: review.sourceItemId,
      queueStatus: "analyzed",
      analysisStatus: "complete",
      patch: {
        updatedAt: new Date().toISOString(),
      },
    });
  } catch {
    // Queue feedback is best-effort because older V5.6J stores may not expose updateSavedContentItemById.
  }

  return {
    review,
    appliedPaths: Array.from(new Set(outPaths)),
    appliedTasks,
    appliedIdeas,
    appliedProjectLinks,
  };
}
