import {
  createCharacterProject,
  listCharacterProjects,
  readCharacterProject,
} from "../projects/characterProjectStore";
import type {
  CharacterGeneratorCommandResult,
  CharacterGeneratorModuleCommand,
  CharacterProjectSummary,
} from "../types";

function formatProjectSummary(
  project: CharacterProjectSummary,
  index?: number
): string {
  const prefix = index === undefined ? "" : `${index}. `;
  return `${prefix}${project.name} | ${project.id} | ${project.status}`;
}

export async function executeCharacterGeneratorCommand(
  command: CharacterGeneratorModuleCommand
): Promise<CharacterGeneratorCommandResult> {
  if (command.kind === "character_generator_status") {
    const projects = await listCharacterProjects();

    return {
      ok: true,
      title: "Character Forge Status",
      message: [
        "Module foundation: ready",
        `Saved projects: ${projects.length}`,
        "Structured brief workflow: ready",
        "Concept design gate: ready (ComfyUI)",
        "Current capability: create projects, approve production briefs, generate four concepts, and approve one design.",
        "Rigged model generation: not connected yet.",
      ].join("\n"),
      data: {
        projectCount: projects.length,
        foundationReady: true,
        briefWorkflowReady: true,
        conceptGenerationReady: true,
        riggingReady: false,
      },
    };
  }

  if (command.kind === "character_project_create") {
    const project = await createCharacterProject({
      name: command.name,
      prompt: command.prompt,
    });

    return {
      ok: true,
      title: "Character Forge Project Created",
      message: [
        `Name: ${project.name}`,
        `Project ID: ${project.id}`,
        `Status: ${project.status}`,
        `Prompt: ${project.originalPrompt}`,
        `Workspace: /modules/character-forge/${project.id}`,
        "Next stage: generate and approve an editable character brief.",
      ].join("\n"),
      data: {
        projectId: project.id,
        projectStatus: project.status,
        project,
      },
    };
  }

  if (command.kind === "character_project_list") {
    const projects = await listCharacterProjects();

    return {
      ok: true,
      title: "Character Forge Projects",
      message:
        projects.length === 0
          ? "No Character Forge projects exist yet."
          : projects
              .map((project, index) =>
                formatProjectSummary(project, index + 1)
              )
              .join("\n"),
      data: {
        projects,
        projectCount: projects.length,
      },
    };
  }

  const project = await readCharacterProject(command.projectId);

  if (!project) {
    return {
      ok: false,
      title: "Character Forge Project Not Found",
      message: `No character project exists with id ${command.projectId}.`,
      data: { projectId: command.projectId },
    };
  }

  return {
    ok: true,
    title: "Character Forge Project",
    message: [
      `Name: ${project.name}`,
      `Project ID: ${project.id}`,
      `Status: ${project.status}`,
      `Prompt: ${project.originalPrompt}`,
      `Brief: ${
        !project.brief
          ? "not generated"
          : project.status === "brief_draft"
            ? "draft awaiting approval"
            : "approved"
      }`,
      `Concepts: ${project.concepts.length}`,
      `Selected concept: ${project.selectedConceptId ?? "none"}`,
      `Workspace: /modules/character-forge/${project.id}`,
    ].join("\n"),
    data: { project },
  };
}
