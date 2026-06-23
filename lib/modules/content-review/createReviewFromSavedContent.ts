import crypto from "node:crypto";

import {
  getActiveSavedContentItems,
} from "@/lib/modules/saved-content";

import {
  ContentReview,
  ReviewCandidate,
} from "./types";
import { writeContentReview } from "./store";

function shortId() {
  return crypto.randomUUID().slice(0, 8);
}

function createReviewId() {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");

  return `scr-${stamp}-${shortId()}`;
}

function candidate(params: {
  kind: ReviewCandidate["kind"];
  text: string;
  confidence?: number;
  evidence?: string[];
  targetProject?: string;
}): ReviewCandidate {
  return {
    id: `${params.kind}-${shortId()}`,
    kind: params.kind,
    text: params.text,
    confidence: params.confidence ?? 60,
    status: "pending",
    evidence: params.evidence ?? [],
    targetProject: params.targetProject,
  };
}

function nonEmptyStrings(values: unknown): string[] {
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
}

export async function createContentReviewFromSavedContentIndex(activeIndex: number) {
  const items = await getActiveSavedContentItems(100);
  const item = items[activeIndex - 1];

  if (!item) {
    return null;
  }

  const now = new Date().toISOString();
  const reviewId = createReviewId();

  const projectLinks = nonEmptyStrings(item.relatedProjects).map((project) =>
    candidate({
      kind: "project",
      text: `Link this saved content to project: ${project}`,
      confidence: 70,
      evidence: [`SavedContentItem.relatedProjects contains "${project}".`],
      targetProject: project,
    })
  );

  const defaultProject = projectLinks[0]?.targetProject;

  const tasks = nonEmptyStrings(item.extractedTasks).map((task) =>
    candidate({
      kind: "task",
      text: task,
      confidence: 65,
      evidence: ["Extracted from saved-content analysis."],
      targetProject: defaultProject,
    })
  );

  const ideas = nonEmptyStrings(item.extractedIdeas).map((idea) =>
    candidate({
      kind: "idea",
      text: idea,
      confidence: 65,
      evidence: ["Extracted from saved-content analysis."],
      targetProject: defaultProject,
    })
  );

  const warnings = nonEmptyStrings(item.extractedWarnings).map((warning) =>
    candidate({
      kind: "warning",
      text: warning,
      confidence: 60,
      evidence: ["Extracted from saved-content analysis."],
      targetProject: defaultProject,
    })
  );

  const review: ContentReview = {
    id: reviewId,
    sourceType: "saved-content",
    sourceItemId: item.id,

    title: item.title,
    sourceUrl: item.url,
    platform: item.platform,

    status: "pending-review",

    summary: item.summary
      ? candidate({
          kind: "summary",
          text: item.summary,
          confidence: 70,
          evidence: item.analysisPath
            ? [`Analysis path: ${item.analysisPath}`]
            : ["SavedContentItem.summary"],
          targetProject: defaultProject,
        })
      : undefined,

    possibleReasonSaved: item.possibleReasonSaved
      ? candidate({
          kind: "reason",
          text: item.possibleReasonSaved,
          confidence: item.reasonConfidence ?? 50,
          evidence: nonEmptyStrings(item.reasonEvidence),
          targetProject: defaultProject,
        })
      : undefined,

    projectLinks,
    tasks,
    ideas,
    warnings,

    sourceMeta: {
      creator: item.creator,
      sourceContentTitle: item.title,
      sourceContainerTitle: item.sourceContainerTitle,
      queueStatus: item.queueStatus,
      analysisStatus: item.analysisStatus,
      transcriptStatus: item.transcriptStatus,
      analysisPath: item.analysisPath,
      candidateMemoryPath: item.candidateMemoryPath,
    },

    createdAt: now,
    updatedAt: now,
  };

  const paths = await writeContentReview(review);

  return {
    review,
    paths,
    item,
  };
}
