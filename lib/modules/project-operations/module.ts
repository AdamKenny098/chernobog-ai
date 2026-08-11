import type { ChernobogModule } from "@/lib/modules/types";

import { executeProjectOperationsCommand } from "./commands/executeProjectOperationsCommand";
import { parseProjectOperationsCommand } from "./commands/parseProjectOperationsCommand";
import type { ProjectOperationsModuleCommand } from "./types";

function isProjectOperationsModuleCommand(
  value: unknown,
): value is ProjectOperationsModuleCommand {
  if (!value || typeof value !== "object") return false;
  const command = value as { kind?: unknown };

  return (
    command.kind === "project_operations_status" ||
    command.kind === "project_list" ||
    command.kind === "project_urgent_list" ||
    command.kind === "project_show" ||
    command.kind === "project_create" ||
    command.kind === "project_task_add" ||
    command.kind === "project_task_move" ||
    command.kind === "project_task_complete" ||
    command.kind === "project_focus_set" ||
    command.kind === "project_next_action_set"
  );
}

export const projectOperationsModule: ChernobogModule = {
  id: "project-operations",
  displayName: "Project Operations",
  domains: ["project"],
  followUpPriority: 25,
  parseCommand: parseProjectOperationsCommand,

  async handleCommand(context) {
    if (!isProjectOperationsModuleCommand(context.command.moduleCommand)) {
      return {
        route: "tools",
        moduleId: "project-operations",
        reply:
          "Project Operations could not resolve that command. Use an explicit project or task command.",
      };
    }

    const result = await executeProjectOperationsCommand(
      context.command.moduleCommand,
    );

    return {
      route: "tools",
      moduleId: "project-operations",
      reply: [result.title, "", result.message].join("\n"),
      modulePayload: { result },
    };
  },
};
