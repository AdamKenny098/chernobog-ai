import type { MinecraftSchematicCommandResult } from "../types";
import {
  finalizePaletteForTarget,
  formatPalette,
  formatPaletteCompatibility,
  formatPaletteList,
  generateAndSavePalette,
  listPalettes,
  loadPalette,
  retextureExportedSchematicBuild,
} from "../palettes";

import type { PaletteCommand10 } from "./parsePaletteCommand10";

export async function executePaletteCommand10(
  command: PaletteCommand10,
): Promise<MinecraftSchematicCommandResult> {
  if (command.kind === "palette-list") {
    const palettes = await listPalettes();

    return {
      ok: true,
      title: "Schematic palettes",
      message: formatPaletteList(palettes),
      data: { palettes },
    };
  }

  if (command.kind === "palette-show") {
    const palette = await loadPalette(command.paletteId);

    return {
      ok: true,
      title: `Palette: ${palette.id}`,
      message: formatPalette(palette),
      data: { palette },
    };
  }

  if (command.kind === "palette-validate") {
    const palette = await loadPalette(command.paletteId);
    const result = finalizePaletteForTarget(palette, {
      targetMinecraftVersion: command.targetMinecraftVersion,
      profile: command.profile,
    });

    return {
      ok: result.ok,
      title: `Palette validation: ${palette.id}`,
      message: formatPaletteCompatibility(result),
      data: { palette, result },
    };
  }

  if (command.kind === "palette-generate") {
    const { palette, filePath } = await generateAndSavePalette(
      command.prompt,
      command.targetMinecraftVersion ?? command.profile,
    );
    const result = finalizePaletteForTarget(palette, {
      targetMinecraftVersion: command.targetMinecraftVersion,
      profile: command.profile ?? palette.profile,
    });

    return {
      ok: result.ok,
      title: `Generated palette: ${palette.id}`,
      message: [
        `Generated palette ${palette.id}.`,
        `Saved: ${filePath}`,
        "",
        formatPaletteCompatibility(result),
      ].join("\n"),
      data: { palette, filePath, result },
    };
  }

  if (command.kind === "palette-apply") {
    const palette = await loadPalette(command.paletteId);
    const result = await retextureExportedSchematicBuild(command.buildId, palette, {
      targetMinecraftVersion: command.targetMinecraftVersion,
      profile: command.profile ?? palette.profile,
    });

    return {
      ok: result.build.paletteCompatibility?.ok ?? true,
      title: `Applied palette: ${palette.id}`,
      message: [
        `Applied palette ${palette.id} to schematic ${command.buildId}.`,
        `New build ID: ${result.build.buildId}`,
        `Schem: ${result.schemPath}`,
        `Debug JSON: ${result.debugJsonPath}`,
        `Metadata: ${result.metadataJsonPath}`,
      ].join("\n"),
      data: result,
    };
  }

  return {
    ok: false,
    title: "Unsupported palette command",
    message: `Unsupported palette command: ${(command as { kind: string }).kind}`,
  };
}
