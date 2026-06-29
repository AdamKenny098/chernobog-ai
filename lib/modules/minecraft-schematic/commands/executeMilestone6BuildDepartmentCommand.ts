import { runBuildDepartmentAction } from "../build-department";
import type { Milestone6BuildDepartmentParsedCommand } from "./parseMilestone6BuildDepartmentCommand";

export type Milestone6BuildDepartmentExecutionResult = {
  ok: boolean;
  kind: "milestone6_build_department_result";
  summary: string;
  data?: unknown;
};

export async function executeMilestone6BuildDepartmentCommand(
  command: Milestone6BuildDepartmentParsedCommand,
): Promise<Milestone6BuildDepartmentExecutionResult> {
  const result = await runBuildDepartmentAction(command.action, command.prompt);

  return {
    ok: result.ok,
    kind: "milestone6_build_department_result",
    summary: result.summary,
    data: result,
  };
}
