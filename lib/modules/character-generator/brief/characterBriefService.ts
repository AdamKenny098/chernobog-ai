import { CharacterProjectStateError } from "../errors";
import {
  readCharacterProject,
  writeCharacterProject,
} from "../projects/characterProjectStore";
import type { CharacterBrief } from "../types";
import { parseCharacterBrief } from "./characterBriefSchema";
import {
  generateCharacterBriefDraft,
  type CharacterBriefGenerationResult,
} from "./characterBriefGenerator";

export type GeneratedCharacterProjectBrief = {
  project: NonNullable<Awaited<ReturnType<typeof readCharacterProject>>>;
  generation: Omit<CharacterBriefGenerationResult, "brief">;
};

export async function generateCharacterProjectBrief(
  projectId: string
): Promise<GeneratedCharacterProjectBrief | null> {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "draft") {
    throw new CharacterProjectStateError(
      "A structured brief can only be generated from a draft project."
    );
  }

  const generated = await generateCharacterBriefDraft(project);
  const updatedProject = await writeCharacterProject({
    ...project,
    brief: generated.brief,
    status: "brief_draft",
  });

  return {
    project: updatedProject,
    generation: {
      source: generated.source,
      model: generated.model,
      warning: generated.warning,
    },
  };
}

export async function saveCharacterProjectBrief(
  projectId: string,
  brief: CharacterBrief
) {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "brief_draft") {
    throw new CharacterProjectStateError(
      "The structured brief can only be edited while it is awaiting approval."
    );
  }

  return writeCharacterProject({
    ...project,
    brief: parseCharacterBrief(brief),
  });
}

export async function approveCharacterProjectBrief(
  projectId: string,
  brief: CharacterBrief
) {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "brief_draft") {
    throw new CharacterProjectStateError(
      "Only a structured brief awaiting approval can be approved."
    );
  }

  return writeCharacterProject({
    ...project,
    brief: parseCharacterBrief(brief),
    status: "brief_ready",
  });
}

export async function reopenCharacterProjectBrief(projectId: string) {
  const project = await readCharacterProject(projectId);

  if (!project) {
    return null;
  }

  if (project.status !== "brief_ready" || !project.brief) {
    throw new CharacterProjectStateError(
      "Only an approved brief can be reopened for editing."
    );
  }

  return writeCharacterProject({
    ...project,
    status: "brief_draft",
  });
}
