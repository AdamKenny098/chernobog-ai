import { randomInt, randomUUID } from "node:crypto";

import {
  CharacterConceptGenerationError,
  CharacterProjectStateError,
} from "../errors";
import {
  readCharacterProject,
  writeCharacterProject,
} from "../projects/characterProjectStore";
import type { CharacterConcept, CharacterProject } from "../types";
import {
  clearCharacterConceptImages,
  writeCharacterConceptImage,
} from "./characterConceptAssetStore";
import {
  compileAllCharacterConceptPrompts,
  type CompiledCharacterConceptPrompt,
} from "./characterConceptPrompts";
import {
  createCharacterConceptImageProvider,
  type CharacterConceptImageProviderClient,
  type CharacterConceptProviderStatus,
} from "./comfyUiConceptProvider";

export type GeneratedCharacterConceptSet = {
  project: CharacterProject;
  provider: CharacterConceptProviderStatus;
};

function nowIso(): string {
  return new Date().toISOString();
}

function createConceptRecord(
  projectId: string,
  prompt: CompiledCharacterConceptPrompt
): CharacterConcept {
  const createdAt = nowIso();

  return {
    id: `concept-${prompt.id}-${randomUUID().slice(0, 8)}`,
    projectId,
    label: prompt.label,
    imagePath: "",
    generationPrompt: prompt.positivePrompt,
    variationNotes: prompt.variationNotes,
    seed: randomInt(1, 2_147_483_647),
    provider: "comfyui",
    model: "",
    imageMimeType: "image/png",
    width: 0,
    height: 0,
    status: "generating",
    selected: false,
    createdAt,
    updatedAt: createdAt,
  };
}

function requireReadyConcept(
  project: CharacterProject,
  conceptId: string
): CharacterConcept {
  const concept = project.concepts.find(
    (candidate) => candidate.id === conceptId
  );

  if (!concept || concept.status !== "ready") {
    throw new CharacterProjectStateError(
      `No ready concept exists with id ${conceptId}.`
    );
  }

  return concept;
}

export async function getCharacterConceptProviderStatus(
  provider: CharacterConceptImageProviderClient =
    createCharacterConceptImageProvider()
): Promise<CharacterConceptProviderStatus> {
  return provider.getStatus();
}

export async function generateCharacterProjectConcepts(
  projectId: string,
  provider: CharacterConceptImageProviderClient =
    createCharacterConceptImageProvider()
): Promise<GeneratedCharacterConceptSet | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "brief_ready" || !project.brief) {
    throw new CharacterProjectStateError(
      "Concept generation requires an explicitly approved structured brief."
    );
  }

  const providerStatus = await provider.getStatus();

  if (!providerStatus.ready) {
    throw new CharacterConceptGenerationError(
      providerStatus.error ??
        "The configured concept image provider is not ready."
    );
  }

  const compiledPrompts = compileAllCharacterConceptPrompts(project.brief);
  await clearCharacterConceptImages(project.id);

  let workingProject = await writeCharacterProject({
    ...project,
    status: "concepts_generating",
    concepts: compiledPrompts.map((prompt) =>
      createConceptRecord(project.id, prompt)
    ),
    selectedConceptId: null,
  });

  try {
    for (const [index, prompt] of compiledPrompts.entries()) {
      const concept = workingProject.concepts[index];

      if (!concept || concept.seed === undefined) {
        throw new CharacterConceptGenerationError(
          "Character Forge lost a planned concept generation record."
        );
      }

      const image = await provider.generate({
        projectId: project.id,
        conceptId: concept.id,
        positivePrompt: prompt.positivePrompt,
        negativePrompt: prompt.negativePrompt,
        seed: concept.seed,
      });
      const imagePath = await writeCharacterConceptImage({
        projectId: project.id,
        conceptId: concept.id,
        bytes: image.bytes,
        mimeType: image.mimeType,
      });
      const updatedAt = nowIso();
      const nextConcepts = workingProject.concepts.map((candidate) =>
        candidate.id === concept.id
          ? {
              ...candidate,
              imagePath,
              provider: image.provider,
              model: image.model,
              imageMimeType: image.mimeType,
              width: image.width,
              height: image.height,
              status: "ready" as const,
              updatedAt,
            }
          : candidate
      );

      workingProject = await writeCharacterProject({
        ...workingProject,
        concepts: nextConcepts,
      });
    }

    workingProject = await writeCharacterProject({
      ...workingProject,
      status: "concepts_ready",
    });

    return {
      project: workingProject,
      provider: providerStatus,
    };
  } catch (error) {
    await clearCharacterConceptImages(project.id);
    await writeCharacterProject({
      ...project,
      status: "brief_ready",
      concepts: [],
      selectedConceptId: null,
    });

    if (error instanceof CharacterConceptGenerationError) {
      throw error;
    }

    throw new CharacterConceptGenerationError(
      error instanceof Error
        ? `Concept generation failed: ${error.message}`
        : "Concept generation failed."
    );
  }
}

export async function selectCharacterProjectConcept(
  projectId: string,
  conceptId: string
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (
    project.status !== "concepts_ready" &&
    project.status !== "concept_selected"
  ) {
    throw new CharacterProjectStateError(
      "A concept can only be selected while the design gate is open."
    );
  }

  requireReadyConcept(project, conceptId);

  return writeCharacterProject({
    ...project,
    status: "concept_selected",
    selectedConceptId: conceptId,
    concepts: project.concepts.map((concept) => ({
      ...concept,
      selected: concept.id === conceptId,
      updatedAt: concept.id === conceptId ? nowIso() : concept.updatedAt,
    })),
  });
}

export async function clearCharacterProjectConceptSelection(
  projectId: string
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "concept_selected") {
    throw new CharacterProjectStateError(
      "There is no unapproved concept selection to clear."
    );
  }

  return writeCharacterProject({
    ...project,
    status: "concepts_ready",
    selectedConceptId: null,
    concepts: project.concepts.map((concept) => ({
      ...concept,
      selected: false,
    })),
  });
}

export async function approveCharacterProjectDesign(
  projectId: string
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "concept_selected" || !project.selectedConceptId) {
    throw new CharacterProjectStateError(
      "Select one concept before approving the character design."
    );
  }

  requireReadyConcept(project, project.selectedConceptId);

  return writeCharacterProject({
    ...project,
    status: "design_approved",
  });
}

export async function resetInterruptedCharacterConceptGeneration(
  projectId: string
): Promise<CharacterProject | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "concepts_generating" || !project.brief) {
    throw new CharacterProjectStateError(
      "Only an interrupted concept generation can be reset."
    );
  }

  await clearCharacterConceptImages(project.id);

  return writeCharacterProject({
    ...project,
    status: "brief_ready",
    concepts: [],
    selectedConceptId: null,
  });
}
