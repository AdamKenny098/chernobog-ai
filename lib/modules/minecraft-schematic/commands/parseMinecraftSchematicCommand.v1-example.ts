export type MinecraftSchematicParsedCommand =
  | { kind: "schematic_status" }
  | { kind: "schematic_help" }
  | { kind: "schematic_generate"; prompt: string }
  | { kind: "schematic_show_latest" }
  | { kind: "schematic_validate_latest" };

export function parseMinecraftSchematicCommand(input: string): MinecraftSchematicParsedCommand | null {
  const text = input.trim();

  if (/^schematic\s+status$/i.test(text)) {
    return { kind: "schematic_status" };
  }

  if (/^schematic\s+help$/i.test(text)) {
    return { kind: "schematic_help" };
  }

  if (/^schematic\s+show\s+latest$/i.test(text)) {
    return { kind: "schematic_show_latest" };
  }

  if (/^schematic\s+validate\s+latest$/i.test(text)) {
    return { kind: "schematic_validate_latest" };
  }

  const generateMatch = text.match(/^generate\s+minecraft\s+schematic\s*:?\s*(.+)$/i);
  if (generateMatch?.[1]) {
    return {
      kind: "schematic_generate",
      prompt: generateMatch[1].trim(),
    };
  }

  return null;
}
