export type Milestone6PackReviewAction = "review" | "inspect" | "repair";

export type Milestone6PackReviewParsedCommand = {
  kind: "milestone6_pack_review";
  action: Milestone6PackReviewAction;
  target: "latest";
  raw: string;
  prompt: string;
};

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseMilestone6PackReviewCommand(input: string): Milestone6PackReviewParsedCommand | null {
  const text = normalize(input);

  const isLatestPackTarget =
    text.includes("pack latest") ||
    text.includes("latest pack") ||
    text.includes("schematic pack") ||
    text.includes("scene pack");

  if (!isLatestPackTarget) {
    return null;
  }

  if (text === "schematic inspect pack latest" || text === "inspect schematic pack latest" || text === "scene pack inspect latest") {
    return {
      kind: "milestone6_pack_review",
      action: "inspect",
      target: "latest",
      raw: input,
      prompt: input,
    };
  }

  if (text === "schematic review pack latest" || text === "review schematic pack latest" || text === "scene pack review latest") {
    return {
      kind: "milestone6_pack_review",
      action: "review",
      target: "latest",
      raw: input,
      prompt: input,
    };
  }

  if (text === "schematic repair pack latest" || text === "repair schematic pack latest" || text === "scene pack repair latest") {
    return {
      kind: "milestone6_pack_review",
      action: "repair",
      target: "latest",
      raw: input,
      prompt: input,
    };
  }

  return null;
}
