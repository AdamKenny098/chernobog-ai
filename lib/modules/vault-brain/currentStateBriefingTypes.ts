import type { VaultMemoryType } from "./memoryTypes";
import type {
  CurrentProjectMemoryState,
  ProjectMemoryProfile,
  VersionMemoryProfile,
} from "./projectProfileStore";

export const CURRENT_STATE_BRIEFING_SECTION_KEYS = [
  "project-state",
  "roadmap",
  "decisions",
  "tasks",
  "bugs",
  "summaries",
  "code-summaries",
] as const;

export type CurrentStateBriefingSectionKey =
  (typeof CURRENT_STATE_BRIEFING_SECTION_KEYS)[number];

export type CurrentStateBriefingRequest = {
  query?: string;
  projectId?: string;
  version?: string;
  limitPerSection?: number;
  includeCodeSummaries?: boolean;
};

export type CurrentStateBriefingSource = {
  id: string;
  title: string;
  memoryType: VaultMemoryType;
  projectId?: string;
  version?: string;
  confidence: number;
  updatedAt: string;
  excerpt: string;
};

export type CurrentStateBriefingSection = {
  key: CurrentStateBriefingSectionKey;
  title: string;
  sources: CurrentStateBriefingSource[];
};

export type CurrentStateBriefingPolicy = {
  approvedOnly: true;
  allowRawMemory: false;
  allowCandidateMemory: false;
  allowReviewedMemory: false;
  allowOutsideModelMemory: false;
};

export type CurrentStateBriefingResult = {
  ok: boolean;
  generatedAt: string;
  query: string;
  projectId?: string;
  version?: string;
  currentState: CurrentProjectMemoryState;
  projectProfile?: ProjectMemoryProfile;
  activeVersionProfile?: VersionMemoryProfile;
  latestCompletedVersionProfile?: VersionMemoryProfile;
  nextRecommendedVersionProfile?: VersionMemoryProfile;
  summary: string;
  sections: CurrentStateBriefingSection[];
  sourceEntryIds: string[];
  warnings: string[];
  policy: CurrentStateBriefingPolicy;
};
