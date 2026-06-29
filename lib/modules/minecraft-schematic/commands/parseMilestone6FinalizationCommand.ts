export type Milestone6FinalizationParsedCommand = {
  kind: "milestone6_finalization";
  action: "status" | "write_docs";
  raw: string;
  prompt: string;
};

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseMilestone6FinalizationCommand(input: string): Milestone6FinalizationParsedCommand | null {
  const text = normalize(input);

  if (
    text === "milestone 6 status" ||
    text === "schematic milestone 6 status" ||
    text === "minecraft schematic milestone 6 status" ||
    text === "build department milestone status" ||
    text === "build department final status"
  ) {
    return {
      kind: "milestone6_finalization",
      action: "status",
      raw: input,
      prompt: input,
    };
  }

  if (
    text === "write milestone 6 docs" ||
    text === "schematic write milestone 6 docs" ||
    text === "build department write docs" ||
    text === "build department finalize docs"
  ) {
    return {
      kind: "milestone6_finalization",
      action: "write_docs",
      raw: input,
      prompt: input,
    };
  }

  return null;
}
