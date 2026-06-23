import fs from "node:fs/promises";
import path from "node:path";

import {
  ContentReview,
  ContentReviewIndex,
  ContentReviewIndexEntry,
  ContentReviewStatus,
  ReviewCandidate,
  ReviewCandidateKind,
  ReviewCandidateStatus,
} from "./types";

function getVaultRoot() {
  const configuredPath =
    process.env.CHERNOBOG_VAULT_PATH ?? process.env.OBSIDIAN_VAULT_PATH;

  if (configuredPath) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.join(process.cwd(), configuredPath);
  }

  return path.join(process.cwd(), "vault", "chernobog");
}

export function getContentReviewRoot() {
  return path.join(getVaultRoot(), "content-reviews");
}

function getIndexPath() {
  return path.join(getContentReviewRoot(), "_index.json");
}

function getReviewDir(reviewId: string) {
  return path.join(getContentReviewRoot(), reviewId);
}

function getReviewJsonPath(reviewId: string) {
  return path.join(getReviewDir(reviewId), "review.json");
}

function getReviewMarkdownPath(reviewId: string) {
  return path.join(getReviewDir(reviewId), "review.md");
}

export function relativeToVault(absolutePath: string) {
  return path.relative(getVaultRoot(), absolutePath).replace(/\\/g, "/");
}

async function pathExists(absolutePath: string) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

function reviewToIndexEntry(review: ContentReview): ContentReviewIndexEntry {
  return {
    id: review.id,
    title: review.title,
    status: review.status,
    platform: review.platform,
    sourceItemId: review.sourceItemId,
    sourceUrl: review.sourceUrl,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    appliedAt: review.appliedAt,
  };
}

async function readIndex(): Promise<ContentReviewIndex> {
  const indexPath = getIndexPath();

  if (!(await pathExists(indexPath))) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      reviews: [],
    };
  }

  try {
    const raw = await fs.readFile(indexPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<ContentReviewIndex>;

    return {
      version: 1,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    };
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      reviews: [],
    };
  }
}

async function writeIndex(index: ContentReviewIndex) {
  const indexPath = getIndexPath();

  await fs.mkdir(path.dirname(indexPath), { recursive: true });
  await fs.writeFile(
    indexPath,
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        reviews: index.reviews,
      },
      null,
      2
    ),
    "utf8"
  );
}

function formatCandidateList(candidates: ReviewCandidate[]) {
  if (candidates.length === 0) {
    return "_None_";
  }

  return candidates
    .map((candidate, index) => {
      const target = candidate.targetProject
        ? ` Target: ${candidate.targetProject}.`
        : "";

      return `${index + 1}. [${candidate.status}] (${candidate.confidence}%) ${candidate.text}${target}`;
    })
    .join("\n");
}

export function reviewToMarkdown(review: ContentReview) {
  return [
    "---",
    `review_id: ${review.id}`,
    `status: ${review.status}`,
    `source_type: ${review.sourceType}`,
    `source_item_id: ${review.sourceItemId}`,
    `platform: ${review.platform}`,
    `created_at: ${review.createdAt}`,
    `updated_at: ${review.updatedAt}`,
    review.appliedAt ? `applied_at: ${review.appliedAt}` : "",
    "---",
    "",
    `# Content Review — ${review.title}`,
    "",
    "## Source",
    "",
    `- Platform: ${review.platform}`,
    `- Title: ${review.sourceMeta.sourceContentTitle ?? review.title}`,
    `- Creator: ${review.sourceMeta.creator ?? "unknown"}`,
    `- URL: ${review.sourceUrl}`,
    `- Queue status: ${review.sourceMeta.queueStatus ?? "unknown"}`,
    `- Analysis status: ${review.sourceMeta.analysisStatus ?? "unknown"}`,
    `- Transcript status: ${review.sourceMeta.transcriptStatus ?? "unknown"}`,
    "",
    "## Summary Candidate",
    "",
    review.summary
      ? `[${review.summary.status}] (${review.summary.confidence}%) ${review.summary.text}`
      : "_None_",
    "",
    "## Possible Reason Saved",
    "",
    review.possibleReasonSaved
      ? `[${review.possibleReasonSaved.status}] (${review.possibleReasonSaved.confidence}%) ${review.possibleReasonSaved.text}`
      : "_None_",
    "",
    "## Project Link Candidates",
    "",
    formatCandidateList(review.projectLinks),
    "",
    "## Task Candidates",
    "",
    formatCandidateList(review.tasks),
    "",
    "## Idea Candidates",
    "",
    formatCandidateList(review.ideas),
    "",
    "## Warning Candidates",
    "",
    formatCandidateList(review.warnings),
    "",
    "## Apply Rule",
    "",
    "Only approved candidates are applied to project vault notes.",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function writeContentReview(review: ContentReview) {
  const dir = getReviewDir(review.id);
  const jsonPath = getReviewJsonPath(review.id);
  const markdownPath = getReviewMarkdownPath(review.id);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(review, null, 2), "utf8");
  await fs.writeFile(markdownPath, reviewToMarkdown(review), "utf8");

  const index = await readIndex();
  const existingIndex = index.reviews.findIndex((entry) => entry.id === review.id);
  const entry = reviewToIndexEntry(review);

  if (existingIndex >= 0) {
    index.reviews[existingIndex] = entry;
  } else {
    index.reviews.unshift(entry);
  }

  await writeIndex(index);

  return {
    jsonPath: relativeToVault(jsonPath),
    markdownPath: relativeToVault(markdownPath),
  };
}

export async function readContentReview(reviewId: string) {
  try {
    const raw = await fs.readFile(getReviewJsonPath(reviewId), "utf8");
    return JSON.parse(raw) as ContentReview;
  } catch {
    return null;
  }
}

export async function listContentReviews(status?: ContentReviewStatus) {
  const index = await readIndex();

  return status
    ? index.reviews.filter((entry) => entry.status === status)
    : index.reviews;
}

function allCandidates(review: ContentReview) {
  return [
    ...(review.summary ? [review.summary] : []),
    ...(review.possibleReasonSaved ? [review.possibleReasonSaved] : []),
    ...review.projectLinks,
    ...review.tasks,
    ...review.ideas,
    ...review.warnings,
  ];
}

function getCandidateList(review: ContentReview, kind: ReviewCandidateKind) {
  if (kind === "summary") {
    return review.summary ? [review.summary] : [];
  }

  if (kind === "reason") {
    return review.possibleReasonSaved ? [review.possibleReasonSaved] : [];
  }

  if (kind === "project") {
    return review.projectLinks;
  }

  if (kind === "task") {
    return review.tasks;
  }

  if (kind === "idea") {
    return review.ideas;
  }

  return review.warnings;
}

function calculateReviewStatus(review: ContentReview): ContentReviewStatus {
  if (review.status === "applied") {
    return "applied";
  }

  const candidates = allCandidates(review);

  if (candidates.length === 0) {
    return "rejected";
  }

  const approved = candidates.filter((candidate) => candidate.status === "approved").length;
  const rejected = candidates.filter((candidate) => candidate.status === "rejected").length;

  if (approved === candidates.length) {
    return "approved";
  }

  if (rejected === candidates.length) {
    return "rejected";
  }

  if (approved > 0 || rejected > 0) {
    return "partially-approved";
  }

  return "pending-review";
}

export async function setReviewCandidateStatus(params: {
  reviewId: string;
  kind: ReviewCandidateKind;
  visibleIndex: number;
  status: ReviewCandidateStatus;
}) {
  const review = await readContentReview(params.reviewId);

  if (!review) {
    return null;
  }

  const list = getCandidateList(review, params.kind);
  const candidate = list[params.visibleIndex - 1];

  if (!candidate) {
    return null;
  }

  candidate.status = params.status;
  review.status = calculateReviewStatus(review);
  review.updatedAt = new Date().toISOString();

  const paths = await writeContentReview(review);

  return {
    review,
    candidate,
    paths,
  };
}

export async function setAllReviewCandidateStatuses(params: {
  reviewId: string;
  status: ReviewCandidateStatus;
}) {
  const review = await readContentReview(params.reviewId);

  if (!review) {
    return null;
  }

  for (const candidate of allCandidates(review)) {
    candidate.status = params.status;
  }

  review.status = calculateReviewStatus(review);
  review.updatedAt = new Date().toISOString();

  const paths = await writeContentReview(review);

  return {
    review,
    paths,
  };
}

export async function markReviewApplied(review: ContentReview) {
  review.status = "applied";
  review.appliedAt = new Date().toISOString();
  review.updatedAt = review.appliedAt;

  return writeContentReview(review);
}

export function getAppliedChangesPath(reviewId: string) {
  return path.join(getReviewDir(reviewId), "applied-vault-changes.md");
}

export async function writeAppliedChangesMarkdown(reviewId: string, markdown: string) {
  const outPath = getAppliedChangesPath(reviewId);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, markdown, "utf8");

  return relativeToVault(outPath);
}

export function getVaultRootForContentReview() {
  return getVaultRoot();
}
