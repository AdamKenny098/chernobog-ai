export const CHARACTER_PROJECT_STATUSES = [
  "draft",
  "brief_draft",
  "brief_ready",
  "concepts_generating",
  "concepts_ready",
  "concept_selected",
  "design_approved",
  "identity_anchor_draft",
  "identity_anchor_ready",
  "canonical_pose_generating",
  "canonical_pose_review",
  "canonical_pose_ready",
  "reference_sheet_generating",
  "reference_sheet_review",
  "reference_sheet_ready",
  "model_generating",
  "model_ready",
  "rigged",
  "validated",
  "exported",
] as const;

export type CharacterProjectStatus =
  (typeof CHARACTER_PROJECT_STATUSES)[number];

export const CHARACTER_RENDERING_STYLES = [
  "stylised-realism",
  "anime",
  "low-poly",
] as const;

export type CharacterRenderingStyle =
  (typeof CHARACTER_RENDERING_STYLES)[number];

export type CharacterBrief = {
  characterType: "human" | "humanoid";
  presentation: string;
  ageRange: string;
  bodyType: string;
  proportions: string;
  face: {
    shape: string;
    features: string[];
    expression: string;
  };
  hair: {
    style: string;
    colour: string;
  };
  clothing: string[];
  armour: string[];
  accessories: string[];
  equipment: string[];
  style: {
    renderingStyle: CharacterRenderingStyle;
    theme: string;
    shapeLanguage: string;
    detailLevel: "low" | "medium" | "high";
  };
  colours: {
    primary: string;
    secondary: string;
    accent: string;
  };
  technical: {
    intendedEngine: "unity";
    cameraPerspective: "first-person" | "third-person" | "isometric";
    targetPlatform: "mobile" | "desktop" | "console";
    triangleBudget: number;
    textureResolution: 1024 | 2048 | 4096;
  };
  negativeRequirements: string[];
};

export type CharacterConceptStatus = "generating" | "ready" | "failed";

export type CharacterConceptImageProvider = "comfyui";

export type CharacterConcept = {
  id: string;
  projectId: string;
  label: string;
  imagePath: string;
  generationPrompt: string;
  variationNotes: string;
  seed?: number;
  provider: CharacterConceptImageProvider;
  model: string;
  imageMimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  status: CharacterConceptStatus;
  selected: boolean;
  createdAt: string;
  updatedAt: string;
};

export const CHARACTER_REFERENCE_VIEW_ANGLES = [
  "front",
  "left-profile",
  "back",
  "three-quarter",
] as const;

export type CharacterReferenceViewAngle =
  (typeof CHARACTER_REFERENCE_VIEW_ANGLES)[number];

export type CharacterReferenceView = {
  id: `reference-${CharacterReferenceViewAngle}`;
  label: string;
  angle: CharacterReferenceViewAngle;
  imagePath: string;
  generationPrompt: string;
  seed: number;
  provider: CharacterConceptImageProvider;
  model: string;
  imageMimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  status: CharacterConceptStatus;
  createdAt: string;
  updatedAt: string;
};

export type CharacterReferenceSheet = {
  sourceConceptId: string;
  views: CharacterReferenceView[];
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CharacterIdentityAnchorCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
};

export type CharacterIdentityAnchor = {
  id: "identity-anchor";
  sourceConceptId: string;
  imagePath: string;
  imageMimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  crop: CharacterIdentityAnchorCrop;
  sha256: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CharacterCanonicalPose = {
  id: "canonical-a-pose";
  sourceIdentityAnchorSha256: string;
  imagePath: string;
  imageMimeType: "image/png" | "image/jpeg" | "image/webp";
  width: number;
  height: number;
  seed: number;
  provider: "comfyui";
  checkpoint: string;
  ipAdapterModel: string;
  clipVisionModel: string;
  controlNetModel: string;
  workflowVersion: 1;
  poseGuideSha256: string;
  ipAdapterWeight: number;
  controlNetStrength: number;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
  generationPrompt: string;
  negativePrompt: string;
  sha256: string;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CharacterModelRemeshMode = "none" | "triangle" | "quad";

export type CharacterModelAsset = {
  id: "generated-model";
  sourceCanonicalPoseSha256: string;
  filePath: string;
  format: "glb";
  mimeType: "model/gltf-binary";
  provider: "stable-fast-3d";
  providerVersion: string | null;
  model: "stabilityai/stable-fast-3d";
  textureResolution: 1024 | 2048;
  remeshMode: CharacterModelRemeshMode;
  targetTriangleBudget: number;
  targetVertexCount: number;
  foregroundRatio: 0.85;
  generationSeconds: number | null;
  sha256: string;
  byteLength: number;
  topology: {
    vertices: number | null;
    triangles: number | null;
    materials: number | null;
  };
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CharacterProject = {
  schemaVersion: 1;
  id: string;
  name: string;
  originalPrompt: string;
  status: CharacterProjectStatus;
  brief: CharacterBrief | null;
  concepts: CharacterConcept[];
  selectedConceptId: string | null;
  identityAnchor: CharacterIdentityAnchor | null;
  canonicalPose: CharacterCanonicalPose | null;
  modelAsset: CharacterModelAsset | null;
  referenceSheet: CharacterReferenceSheet | null;
  createdAt: string;
  updatedAt: string;
};

export type CharacterProjectSummary = Pick<
  CharacterProject,
  "id" | "name" | "status" | "selectedConceptId" | "createdAt" | "updatedAt"
>;

export type CharacterProjectManifest = {
  version: 1;
  updatedAt: string;
  projects: CharacterProjectSummary[];
};

export type CreateCharacterProjectInput = {
  name?: string;
  prompt: string;
};

export type UpdateCharacterProjectInput = {
  name?: string;
  originalPrompt?: string;
};

export type CharacterBriefAction = "approve" | "reopen";

export type CharacterConceptAction =
  | "select"
  | "clear-selection"
  | "approve"
  | "reset-generation";

export type CharacterReferenceAction =
  | "reset-generation"
  | "rebuild"
  | "approve";

export type CharacterModelAction =
  | "approve"
  | "reject"
  | "reset-generation";

export type CharacterGeneratorModuleCommand =
  | { kind: "character_generator_status" }
  | { kind: "character_project_create"; name?: string; prompt: string }
  | { kind: "character_project_list" }
  | { kind: "character_project_show"; projectId: string };

export type CharacterGeneratorCommandResult = {
  ok: boolean;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};
