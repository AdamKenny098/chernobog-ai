import fs from "fs/promises";
import path from "path";

import { exportDebugJson } from "../exporters/exportDebugJson";
import { exportSchem } from "../exporters/exportSchem";
import {
  getGenerationAbsolutePaths,
  getGenerationRelativePaths,
  latestRecordPath,
  projectRoot,
} from "../paths";
import type { GeneratedSchematicBuild, SchematicBlock, SchematicValidationResult } from "../types";

import { finalizePaletteForTarget } from "./paletteVersioning";
import { resolvePaletteMaterial } from "./paletteTexturing";
import type {
  PaletteApplyOptions,
  PaletteAwareBuild,
  PaletteRole,
  PaletteTextureRole,
  SchematicPaletteDefinition,
} from "./paletteTypes";

function blockName(block: SchematicBlock): string {
  return String(block.block);
}

function isAir(block: string): boolean {
  return block === "minecraft:air" || block === "air";
}

function classifyExistingBlock(block: string): PaletteRole | PaletteTextureRole | undefined {
  const normalized = block.toLowerCase();

  if (isAir(normalized)) {
    return undefined;
  }

  if (normalized.includes("glass")) {
    return "window";
  }

  if (normalized.includes("torch") || normalized.includes("lantern") || normalized.includes("glowstone") || normalized.includes("lamp")) {
    return "light";
  }

  if (normalized.includes("bar") || normalized.includes("fence") || normalized.includes("chain")) {
    return "trim";
  }

  if (normalized.includes("roof") || normalized.includes("stair") || normalized.includes("slab")) {
    return "roofTexture";
  }

  if (normalized.includes("path") || normalized.includes("gravel") || normalized.includes("dirt")) {
    return "pathTexture";
  }

  if (normalized.includes("floor") || normalized.includes("plank") || normalized.includes("wood")) {
    return "floorTexture";
  }

  if (normalized.includes("foundation") || normalized.includes("bedrock")) {
    return "foundationTexture";
  }

  if (normalized.includes("brick") || normalized.includes("stone") || normalized.includes("cobble") || normalized.includes("deepslate")) {
    return "wallTexture";
  }

  return "accentTexture";
}

function semanticBlockReplacement(
  block: SchematicBlock,
  palette: SchematicPaletteDefinition,
  seed: string,
): string | undefined {
  const material = classifyExistingBlock(blockName(block));

  if (!material) {
    return undefined;
  }

  return resolvePaletteMaterial(
    palette,
    material,
    { x: block.x, y: block.y, z: block.z },
    seed,
  );
}

function uniquePaletteFromBlocks(blocks: SchematicBlock[]): string[] {
  return [...new Set(blocks.map((block) => blockName(block)))].sort();
}

export function applyPaletteToBuild(
  build: GeneratedSchematicBuild,
  palette: SchematicPaletteDefinition,
  options: PaletteApplyOptions = {},
): PaletteAwareBuild {
  const compatibility = finalizePaletteForTarget(palette, options);
  const finalizedPalette = compatibility.finalizedPalette ?? palette;
  const seed = options.seed ?? `${build.buildId}:${palette.id}`;

  const blocks = build.blocks.map((block) => {
    const replacement = semanticBlockReplacement(block, finalizedPalette, seed);

    if (!replacement || replacement === blockName(block)) {
      return block;
    }

    return {
      ...block,
      block: replacement,
    } as SchematicBlock;
  });

  const paletteAwareBuild = {
    ...build,
    blocks,
    palette: uniquePaletteFromBlocks(blocks),
    paletteId: finalizedPalette.id,
    paletteMetadata: {
      paletteId: finalizedPalette.id,
      paletteDisplayName: finalizedPalette.displayName,
      paletteTargetMinecraftVersion: compatibility.targetMinecraftVersion,
      paletteProfile: compatibility.profile,
      paletteChangedBlocks: compatibility.changedBlocks,
      paletteFallbackBlocks: compatibility.fallbackBlocks,
      paletteUnsupportedBlocks: compatibility.unsupportedBlocks,
    },
    paletteCompatibility: compatibility,
    metadata: {
      ...((build as { metadata?: Record<string, unknown> }).metadata ?? {}),
      paletteId: finalizedPalette.id,
      paletteDisplayName: finalizedPalette.displayName,
    },
  } as PaletteAwareBuild;

  return paletteAwareBuild;
}

type DebugExportEnvelope = Partial<GeneratedSchematicBuild> & {
  build?: GeneratedSchematicBuild;
  validation?: unknown;
};

function extractBuildFromDebugPayload(debug: DebugExportEnvelope, buildId: string): GeneratedSchematicBuild {
  if (debug.build) {
    return debug.build;
  }

  if (typeof debug.buildId === "string" && Array.isArray(debug.blocks)) {
    return debug as GeneratedSchematicBuild;
  }

  throw new Error(`Debug JSON did not contain a build object for schematic ${buildId}.`);
}

async function readDebugBuild(buildId: string): Promise<GeneratedSchematicBuild> {
  let resolvedBuildId = buildId;

  if (buildId === "latest") {
    const latestRecordRaw = await fs.readFile(latestRecordPath(), "utf8");
    const latestRecord = JSON.parse(latestRecordRaw) as { debugJsonPath?: string; buildId?: string };

    if (latestRecord.debugJsonPath) {
      const debugJsonPath = path.isAbsolute(latestRecord.debugJsonPath)
        ? latestRecord.debugJsonPath
        : path.join(projectRoot(), latestRecord.debugJsonPath);
      const debugRaw = await fs.readFile(debugJsonPath, "utf8");
      const debug = JSON.parse(debugRaw) as DebugExportEnvelope;
      return extractBuildFromDebugPayload(debug, buildId);
    }

    if (latestRecord.buildId) {
      resolvedBuildId = latestRecord.buildId;
    }
  }

  const paths = getGenerationAbsolutePaths(resolvedBuildId);
  const debugRaw = await fs.readFile(paths.debugJsonPath, "utf8");
  const debug = JSON.parse(debugRaw) as DebugExportEnvelope;
  return extractBuildFromDebugPayload(debug, buildId);
}

export async function retextureExportedSchematicBuild(
  buildId: string,
  palette: SchematicPaletteDefinition,
  options: PaletteApplyOptions = {},
): Promise<{
  build: PaletteAwareBuild;
  schemPath: string;
  debugJsonPath: string;
  metadataJsonPath: string;
}> {
  const sourceBuild = await readDebugBuild(buildId);
  const outputBuildId = `${sourceBuild.buildId}-palette-${palette.id}`;
  const build = applyPaletteToBuild(
    {
      ...sourceBuild,
      buildId: outputBuildId,
      command: `${sourceBuild.command ?? "generated schematic"} | apply palette ${palette.id}`,
      generatedAt: new Date().toISOString(),
    },
    palette,
    options,
  );

  const absolutePaths = getGenerationAbsolutePaths(outputBuildId);
  const relativePaths = getGenerationRelativePaths(outputBuildId);
  await fs.mkdir(path.dirname(absolutePaths.schemPath), { recursive: true });
  await fs.mkdir(path.dirname(absolutePaths.debugJsonPath), { recursive: true });
  await fs.mkdir(path.dirname(absolutePaths.metadataJsonPath), { recursive: true });

  const validation: SchematicValidationResult = {
    ok: build.paletteCompatibility?.ok ?? true,
    warnings: build.paletteCompatibility?.issues.filter((issue) => issue.severity === "warning").map((issue) => issue.message) ?? [],
    errors: build.paletteCompatibility?.issues.filter((issue) => issue.severity === "error").map((issue) => issue.message) ?? [],
  };

  await exportSchem(build, absolutePaths.schemPath);
  await exportDebugJson(build, validation, absolutePaths.debugJsonPath);

  await fs.writeFile(
    absolutePaths.metadataJsonPath,
    `${JSON.stringify(
      {
        buildId: build.buildId,
        sourceBuildId: sourceBuild.buildId,
        paletteId: build.paletteId,
        paletteMetadata: build.paletteMetadata,
        generatedAt: build.generatedAt,
        outputPaths: relativePaths,
        validation,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    build,
    schemPath: absolutePaths.schemPath,
    debugJsonPath: absolutePaths.debugJsonPath,
    metadataJsonPath: absolutePaths.metadataJsonPath,
  };
}
