import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { getSchematicBlockMaterial } from "@/lib/modules/minecraft-schematic/visual-library/schematicBlockMaterials";
import {
  getSchematicTextureCandidates,
  textureUrlToPublicRelativePath,
} from "@/lib/modules/minecraft-schematic/components/visual-library/schematicTextureResolver";

export const dynamic = "force-dynamic";

const DEFAULT_SAMPLE_BLOCKS = [
  "minecraft:stone",
  "minecraft:cobblestone",
  "minecraft:grass_block",
  "minecraft:dirt",
  "minecraft:oak_planks",
  "minecraft:oak_log",
  "minecraft:glass",
  "minecraft:bricks",
  "minecraft:water",
  "minecraft:lava",
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestedBlock = url.searchParams.get("block")?.trim();
  const sampleBlocks = requestedBlock
    ? [requestedBlock]
    : DEFAULT_SAMPLE_BLOCKS;

  const textureRoot = path.join(process.cwd(), "public", "schematic-textures");
  const minecraftRoot = path.join(textureRoot, "minecraft");
  const diagnostics = await Promise.all(
    sampleBlocks.map((blockId) => diagnoseBlockTexture(blockId)),
  );

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    textureRoot: {
      exists: await fileExists(textureRoot),
      relativePath: "public/schematic-textures",
    },
    minecraftRoot: {
      exists: await fileExists(minecraftRoot),
      relativePath: "public/schematic-textures/minecraft",
    },
    supportedLayouts: [
      "public/schematic-textures/minecraft/<name>.png",
      "public/schematic-textures/minecraft/block/<name>.png",
      "public/schematic-textures/minecraft/blocks/<name>.png",
      "public/schematic-textures/minecraft/textures/block/<name>.png",
      "public/schematic-textures/minecraft/textures/blocks/<name>.png",
      "public/schematic-textures/minecraft/assets/minecraft/textures/block/<name>.png",
      "public/schematic-textures/minecraft/assets/minecraft/textures/blocks/<name>.png",
      "public/schematic-textures/modded/<namespace>/<name>.png",
      "public/schematic-textures/modded/<namespace>/block/<name>.png",
      "public/schematic-textures/modded/<namespace>/blocks/<name>.png",
      "public/schematic-textures/modded/<namespace>/assets/<namespace>/textures/block/<name>.png",
      "public/schematic-textures/modded/<namespace>/assets/<namespace>/textures/blocks/<name>.png",
    ],
    samples: diagnostics,
  });
}

async function diagnoseBlockTexture(blockId: string) {
  const material = getSchematicBlockMaterial(blockId);
  const candidates = getSchematicTextureCandidates(material);
  const checkedCandidates = await Promise.all(
    candidates.map(async (candidate) => {
      const relativePath = textureUrlToPublicRelativePath(candidate.url);
      const exists = relativePath
        ? await fileExists(path.join(process.cwd(), "public", relativePath))
        : false;

      return {
        url: candidate.url,
        source: candidate.source,
        relativePath: relativePath ? `public/${relativePath}` : null,
        exists,
      };
    }),
  );

  const firstMatch = checkedCandidates.find((candidate) => candidate.exists) ?? null;

  return {
    blockId: material.key,
    displayName: material.displayName,
    primaryTexturePath: material.texturePath,
    found: Boolean(firstMatch),
    firstMatch,
    checkedCount: checkedCandidates.length,
    checkedCandidates: checkedCandidates.slice(0, 60),
  };
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}
