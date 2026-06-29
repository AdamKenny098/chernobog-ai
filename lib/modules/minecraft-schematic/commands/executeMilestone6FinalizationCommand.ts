import { renderMilestone6FinalStatus, writeMilestone6Docs } from "../finalization";
import type { Milestone6FinalizationParsedCommand } from "./parseMilestone6FinalizationCommand";

export type Milestone6FinalizationExecutionResult = {
  ok: boolean;
  kind: "milestone6_finalization_result";
  summary: string;
  data?: unknown;
};

export async function executeMilestone6FinalizationCommand(
  command: Milestone6FinalizationParsedCommand,
): Promise<Milestone6FinalizationExecutionResult> {
  if (command.action === "write_docs") {
    const docs = await writeMilestone6Docs();

    return {
      ok: docs.ok,
      kind: "milestone6_finalization_result",
      summary: docs.summary,
      data: docs,
    };
  }

  return {
    ok: true,
    kind: "milestone6_finalization_result",
    summary: renderMilestone6FinalStatus(),
  };
}
