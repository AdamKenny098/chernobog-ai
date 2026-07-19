import {
  CharacterConceptGenerationError,
  CharacterProjectStateError,
} from "../errors";
import { readCharacterConceptImage } from "../concepts/characterConceptAssetStore";
import {
  readCharacterProject,
  writeCharacterProject,
} from "../projects/characterProjectStore";
import type {
  CharacterConcept,
  CharacterProject,
  CharacterReferenceSheet,
  CharacterReferenceView,
} from "../types";
import {
  clearCharacterReferenceImages,
  writeCharacterReferenceImage,
} from "./characterReferenceAssetStore";
import { compileCharacterReferencePrompts } from "./characterReferencePrompts";
import {
  createCharacterReferenceImageProvider,
  type CharacterReferenceImageProviderClient,
} from "./comfyUiReferenceProvider";
import type { CharacterConceptProviderStatus } from "../concepts/comfyUiConceptProvider";

export type GeneratedCharacterReferenceSet = {
  project: CharacterProject;
  provider: CharacterConceptProviderStatus;
};

function nowIso(): string {
  return new Date().toISOString();
}

function requireApprovedConcept(project: CharacterProject): CharacterConcept {
  const concept = project.concepts.find(
    (candidate) => candidate.id === project.selectedConceptId
  );

  if (!concept || concept.status !== "ready" || !concept.imagePath) {
    throw new CharacterProjectStateError(
      "Reference generation requires a ready approved concept image."
    );
  }

  return concept;
}

export async function getCharacterReferenceProviderStatus(
  provider: CharacterReferenceImageProviderClient =
    createCharacterReferenceImageProvider()
): Promise<CharacterConceptProviderStatus> {
  return provider.getStatus();
}

export async function generateCharacterReferenceSheet(
  projectId: string,
  provider: CharacterReferenceImageProviderClient =
    createCharacterReferenceImageProvider()
): Promise<GeneratedCharacterReferenceSet | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "design_approved" || !project.brief) {
    throw new CharacterProjectStateError(
      "Reference generation requires an explicitly approved character design."
    );
  }

  const concept = requireApprovedConcept(project);
  const sourceBytes = await readCharacterConceptImage({
    projectId,
    conceptId: concept.id,
    imagePath: concept.imagePath,
  });

  if (!sourceBytes) {
    throw new CharacterProjectStateError(
      "The approved concept image is missing from project storage."
    );
  }

  const providerStatus = await provider.getStatus();

  if (!providerStatus.ready) {
    throw new CharacterConceptGenerationError(
      providerStatus.error ?? "The reference image provider is not ready."
    );
  }

  const prompts = compileCharacterReferencePrompts(project.brief, concept);
  const createdAt = nowIso();
  const baseSeed = concept.seed ?? 1;
  const plannedViews: CharacterReferenceView[] = prompts.map((prompt) => ({
    id: `reference-${prompt.angle}`,
    label: prompt.label,
    angle: prompt.angle,
    imagePath: "",
    generationPrompt: prompt.positivePrompt,
    seed: baseSeed,
    provider: "comfyui",
    model: "",
    imageMimeType: "image/png",
    width: concept.width,
    height: concept.height,
    status: "generating",
    createdAt,
    updatedAt: createdAt,
  }));
  let sheet: CharacterReferenceSheet = {
    sourceConceptId: concept.id,
    views: plannedViews,
    approvedAt: null,
    createdAt,
    updatedAt: createdAt,
  };

  await clearCharacterReferenceImages(project.id);
  let workingProject = await writeCharacterProject({
    ...project,
    status: "reference_sheet_generating",
    referenceSheet: sheet,
  });

  try {
    for (const [index, prompt] of prompts.entries()) {
      const image = await provider.generateView({
        projectId: project.id,
        angle: prompt.angle,
        positivePrompt: prompt.positivePrompt,
        negativePrompt: prompt.negativePrompt,
        seed: baseSeed,
        width: concept.width,
        height: concept.height,
      });
      const imagePath = await writeCharacterReferenceImage({
        projectId: project.id,
        angle: prompt.angle,
        bytes: image.bytes,
        mimeType: image.mimeType,
      });
      const updatedAt = nowIso();

      sheet = {
        ...sheet,
        updatedAt,
        views: sheet.views.map((view, viewIndex) =>
          viewIndex === index
            ? {
                ...view,
                imagePath,
                model: image.model,
                imageMimeType: image.mimeType,
                width: image.width,
                height: image.height,
                status: "ready" as const,
                updatedAt,
              }
            : view
        ),
      };
      workingProject = await writeCharacterProject({
        ...workingProject,
        referenceSheet: sheet,
      });
    }

    workingProject = await writeCharacterProject({
      ...workingProject,
      status: "reference_sheet_review",
      referenceSheet: sheet,
    });

    return { project: workingProject, provider: providerStatus };
  } catch (error) {
    await clearCharacterReferenceImages(project.id);
    await writeCharacterProject({
      ...project,
      status: "design_approved",
      referenceSheet: null,
    });

    if (error instanceof CharacterConceptGenerationError) {
      throw error;
    }

    throw new CharacterConceptGenerationError(
      error instanceof Error
        ? `Reference generation failed: ${error.message}`
        : "Reference generation failed."
    );
  }
}

export async function resetInterruptedCharacterReferenceGeneration(
  projectId: string
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "reference_sheet_generating") {
    throw new CharacterProjectStateError(
      "Reference generation can only be reset while it is marked as generating."
    );
  }

  await clearCharacterReferenceImages(project.id);
  return writeCharacterProject({
    ...project,
    status: "design_approved",
    referenceSheet: null,
  });
}

export async function rebuildCharacterReferenceSheet(
  projectId: string
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (
    project.status !== "reference_sheet_review" &&
    project.status !== "reference_sheet_ready"
  ) {
    throw new CharacterProjectStateError(
      "Only a completed reference sheet can be rebuilt."
    );
  }

  await clearCharacterReferenceImages(project.id);
  return writeCharacterProject({
    ...project,
    status: "design_approved",
    referenceSheet: null,
  });
}

export async function approveCharacterReferenceSheet(
  projectId: string
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "reference_sheet_review") {
    throw new CharacterProjectStateError(
      "The turnaround can only be approved while it is awaiting review."
    );
  }

  if (
    !project.referenceSheet ||
    project.referenceSheet.views.length !== 4 ||
    project.referenceSheet.views.some(
      (view) => view.status !== "ready" || !view.imagePath
    )
  ) {
    throw new CharacterProjectStateError(
      "Four ready reference views are required before turnaround approval."
    );
  }

  const approvedAt = nowIso();
  return writeCharacterProject({
    ...project,
    status: "reference_sheet_ready",
    referenceSheet: {
      ...project.referenceSheet,
      approvedAt,
      updatedAt: approvedAt,
    },
  });
}
