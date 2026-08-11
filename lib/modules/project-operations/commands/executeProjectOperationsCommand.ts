import {
  createProject,
  createTaskCard,
  findProjectByQuery,
  findTaskByIdentifier,
  getDashboardSnapshot,
  getProjectStats,
  moveTaskCard,
  updateProjectFocus,
  updateProjectNextAction,
} from "../service";
import type {
  Project,
  ProjectOperationsCommandResult,
  ProjectOperationsModuleCommand,
  ProjectTaskResult,
} from "../types";

function projectLine(project: Project, index?: number): string {
  const stats = getProjectStats(project);
  const prefix = index === undefined ? "" : `${index}. `;
  return `${prefix}${project.name} | ${project.status} | ${stats.doingCount} doing | ${stats.urgentCount} urgent | /projects/${project.slug}`;
}

function taskLine(result: ProjectTaskResult, index?: number): string {
  const prefix = index === undefined ? "" : `${index}. `;
  return `${prefix}${result.card.title} | ${result.project.name} | ${result.card.priority} | ${result.card.column} | task ${result.card.id.slice(0, 8)}`;
}

function projectNotFound(query: string): ProjectOperationsCommandResult {
  return {
    ok: false,
    title: "Project Not Found",
    message: `No active Project Operations workspace matched: ${query}`,
    data: { query },
  };
}

function taskNotFound(identifier: string): ProjectOperationsCommandResult {
  return {
    ok: false,
    title: "Task Not Found",
    message: `No active task matched identifier: ${identifier}`,
    data: { taskIdentifier: identifier },
  };
}

export async function executeProjectOperationsCommand(
  command: ProjectOperationsModuleCommand,
): Promise<ProjectOperationsCommandResult> {
  if (command.kind === "project_operations_status") {
    const snapshot = getDashboardSnapshot();
    return {
      ok: true,
      title: "Project Operations Status",
      message: [
        `Active projects: ${snapshot.projects.length}`,
        `Doing now: ${snapshot.doingTasks.length}`,
        `Urgent tasks: ${snapshot.urgentTasks.length}`,
        `Blocked projects: ${snapshot.blockedProjects.length}`,
        `Stale projects: ${snapshot.staleProjects.length}`,
        `Command focus: ${snapshot.commandFocus?.name ?? "none"}`,
        "Workspace: /projects",
      ].join("\n"),
      data: { snapshot },
    };
  }

  if (command.kind === "project_list") {
    const projects = getDashboardSnapshot().projects;
    return {
      ok: true,
      title: "Active Projects",
      message:
        projects.length === 0
          ? "No active projects are recorded."
          : projects.map((project, index) => projectLine(project, index + 1)).join("\n"),
      data: { projects },
    };
  }

  if (command.kind === "project_urgent_list") {
    const tasks = getDashboardSnapshot().urgentTasks;
    return {
      ok: true,
      title: "Urgent Project Tasks",
      message:
        tasks.length === 0
          ? "No unfinished tasks are marked urgent."
          : tasks.map((task, index) => taskLine(task, index + 1)).join("\n"),
      data: { tasks },
    };
  }

  if (command.kind === "project_show") {
    const project = findProjectByQuery(command.projectQuery);
    if (!project) return projectNotFound(command.projectQuery);
    const stats = getProjectStats(project);

    return {
      ok: true,
      title: `Project: ${project.name}`,
      message: [
        `Status: ${project.status}`,
        `Repository: ${project.repoName} | ${project.repoHealth}`,
        `Focus: ${project.focus}`,
        `Next action: ${project.nextAction}`,
        `Progress: ${stats.progress}% | ${stats.doingCount} doing | ${stats.urgentCount} urgent`,
        `Blockers: ${project.blockers.length === 0 ? "none" : project.blockers.join("; ")}`,
        `Workspace: /projects/${project.slug}`,
      ].join("\n"),
      data: { project, stats },
    };
  }

  if (command.kind === "project_create") {
    const project = createProject({
      name: command.name,
      summary: "Project tracked through Chernobog Project Operations.",
      repoName: command.name.trim().replace(/\s+/g, "-"),
    });
    return {
      ok: true,
      title: "Project Workspace Created",
      message: [
        `Name: ${project.name}`,
        `Status: ${project.status}`,
        `Workspace: /projects/${project.slug}`,
        "Next: set the project focus and add its first concrete task.",
      ].join("\n"),
      data: { project },
    };
  }

  if (command.kind === "project_task_add") {
    const project = findProjectByQuery(command.projectQuery);
    if (!project) return projectNotFound(command.projectQuery);
    const board = project.boards[0];
    if (!board) {
      return {
        ok: false,
        title: "Project Board Missing",
        message: `${project.name} has no task board available.`,
      };
    }

    const card = createTaskCard(project.slug, board.id, {
      title: command.title,
      description: `Created from Chernobog directive: ${command.title}`,
      priority: command.urgent ? "High" : "Medium",
      due: command.urgent ? "Now" : "Later",
      urgent: command.urgent,
      column: "backlog",
    });

    return {
      ok: true,
      title: "Project Task Created",
      message: [
        `Project: ${project.name}`,
        `Task: ${card.title}`,
        `Task ID: ${card.id.slice(0, 8)}`,
        `Column: ${card.column}`,
        `Workspace: /projects/${project.slug}`,
      ].join("\n"),
      data: { projectId: project.id, card },
    };
  }

  if (
    command.kind === "project_task_move" ||
    command.kind === "project_task_complete"
  ) {
    const target = findTaskByIdentifier(command.taskIdentifier);
    if (!target) return taskNotFound(command.taskIdentifier);
    const column = command.kind === "project_task_complete" ? "done" : command.column;
    const card = moveTaskCard(
      target.project.slug,
      target.board.id,
      target.card.id,
      column,
    );

    return {
      ok: true,
      title: column === "done" ? "Project Task Completed" : "Project Task Moved",
      message: [
        `Project: ${target.project.name}`,
        `Task: ${card.title}`,
        `Task ID: ${card.id.slice(0, 8)}`,
        `Column: ${card.column}`,
      ].join("\n"),
      data: { card, column },
    };
  }

  const project = findProjectByQuery(command.projectQuery);
  if (!project) return projectNotFound(command.projectQuery);

  if (command.kind === "project_focus_set") {
    const updated = updateProjectFocus(project.slug, command.focus);
    return {
      ok: true,
      title: "Project Focus Updated",
      message: `${updated.name}\nFocus: ${updated.focus}\nWorkspace: /projects/${updated.slug}`,
      data: { project: updated },
    };
  }

  const updated = updateProjectNextAction(project.slug, command.nextAction);
  return {
    ok: true,
    title: "Project Next Action Updated",
    message: `${updated.name}\nNext action: ${updated.nextAction}\nWorkspace: /projects/${updated.slug}`,
    data: { project: updated },
  };
}
