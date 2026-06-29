import type { CreateMachinePreset } from "../create-support/types";

export type Milestone6CreateParsedCommand = {
  kind: "milestone6_create_machine";
  preset: CreateMachinePreset;
  raw: string;
};

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseMilestone6CreateCommand(input: string): Milestone6CreateParsedCommand | null {
  const text = normalize(input);

  if (!text.includes("create")) {
    return null;
  }

  if (text.includes("press line") || text.includes("mechanical press")) {
    return {
      kind: "milestone6_create_machine",
      preset: "press_line",
      raw: input,
    };
  }

  if (text.includes("mixer station") || text.includes("mechanical mixer") || text.includes("basin")) {
    return {
      kind: "milestone6_create_machine",
      preset: "mixer_station",
      raw: input,
    };
  }

  if (text.includes("water wheel") || text.includes("power test")) {
    return {
      kind: "milestone6_create_machine",
      preset: "water_wheel_power",
      raw: input,
    };
  }

  return null;
}
