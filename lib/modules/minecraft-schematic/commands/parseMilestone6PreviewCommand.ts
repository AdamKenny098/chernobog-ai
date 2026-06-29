export type Milestone6PreviewParsedCommand = {
  kind: "milestone6_preview_pack";
  action: "preview";
  target: "latest";
  raw: string;
  prompt: string;
};

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseMilestone6PreviewCommand(input: string): Milestone6PreviewParsedCommand | null {
  const text = normalize(input);

  const matches =
    text === "schematic preview pack latest" ||
    text === "schematic pack preview latest" ||
    text === "preview schematic pack latest" ||
    text === "schematio preview pack latest" ||
    text === "schematic schematio pack latest" ||
    text === "schematic export vanilla preview latest" ||
    text === "export vanilla preview pack latest" ||
    text === "vanilla preview pack latest";

  if (!matches) {
    return null;
  }

  return {
    kind: "milestone6_preview_pack",
    action: "preview",
    target: "latest",
    raw: input,
    prompt: input,
  };
}
