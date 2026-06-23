export type ContentReviewStatus =
  | "draft"
  | "pending-review"
  | "partially-approved"
  | "approved"
  | "rejected"
  | "applied";

export type ReviewCandidateStatus = "pending" | "approved" | "rejected";

export type ReviewCandidateKind =
  | "summary"
  | "reason"
  | "project"
  | "task"
  | "idea"
  | "warning";

export type ReviewCandidate = {
  id: string;
  kind: ReviewCandidateKind;
  text: string;
  confidence: number;
  status: ReviewCandidateStatus;
  evidence?: string[];
  targetProject?: string;
  targetVaultPath?: string;
};

export type ContentReview = {
  id: string;
  sourceType: "saved-content";
  sourceItemId: string;

  title: string;
  sourceUrl: string;
  platform: "youtube" | "tiktok";

  status: ContentReviewStatus;

  summary?: ReviewCandidate;
  possibleReasonSaved?: ReviewCandidate;

  projectLinks: ReviewCandidate[];
  tasks: ReviewCandidate[];
  ideas: ReviewCandidate[];
  warnings: ReviewCandidate[];

  sourceMeta: {
    creator?: string;
    sourceContentTitle?: string;
    sourceContainerTitle?: string;
    queueStatus?: string;
    analysisStatus?: string;
    transcriptStatus?: string;
    analysisPath?: string;
    candidateMemoryPath?: string;
  };

  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
};

export type ContentReviewIndexEntry = {
  id: string;
  title: string;
  status: ContentReviewStatus;
  platform: "youtube" | "tiktok";
  sourceItemId: string;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
};

export type ContentReviewIndex = {
  version: 1;
  updatedAt: string;
  reviews: ContentReviewIndexEntry[];
};

export type ContentReviewCommandResult = {
  ok: boolean;
  title: string;
  message: string;
  data?: unknown;
};

export type ApplyContentReviewResult = {
  review: ContentReview;
  appliedPaths: string[];
  appliedTasks: ReviewCandidate[];
  appliedIdeas: ReviewCandidate[];
  appliedProjectLinks: ReviewCandidate[];
};
