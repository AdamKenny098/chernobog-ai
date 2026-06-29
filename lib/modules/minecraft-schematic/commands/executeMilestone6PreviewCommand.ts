import { exportLatestVanillaPreviewPack } from "../packs";
import type { Milestone6PreviewParsedCommand } from "./parseMilestone6PreviewCommand";

export type Milestone6PreviewExecutionResult = {
  ok: boolean;
  kind: "milestone6_preview_pack_result";
  summary: string;
  data?: unknown;
};

export async function executeMilestone6PreviewCommand(
  _command: Milestone6PreviewParsedCommand,
): Promise<Milestone6PreviewExecutionResult> {
  const result = await exportLatestVanillaPreviewPack();

  return {
    ok: result.ok,
    kind: "milestone6_preview_pack_result",
    summary: result.summary,
    data: result.data,
  };
}
