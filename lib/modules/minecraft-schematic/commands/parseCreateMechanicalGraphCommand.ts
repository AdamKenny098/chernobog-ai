import type { CreateMachinePreset } from "../create-support/types";

export type CreateMechanicalGraphParsedCommand = {
  /**
   * Kept as milestone6_create_machine for compatibility with the existing
   * schematic command executor.
   */
  kind: "milestone6_create_machine";
  preset: CreateMachinePreset;
  raw: string;
};

/**
 * Compatibility alias for old executor/parser type names.
 */
export type Milestone6CreateParsedCommand = CreateMechanicalGraphParsedCommand;

function normalize(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseCreateMechanicalGraphCommand(
  input: string,
): CreateMechanicalGraphParsedCommand | null {
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

  if (
    text.includes("mixer station") ||
    text.includes("mechanical mixer") ||
    text.includes("basin")
  ) {
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