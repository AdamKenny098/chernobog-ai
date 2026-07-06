import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import {
  getAllTextureCandidatesForBlock,
  resolveMinecraftTextureSet,
} from "@/lib/modules/minecraft-schematic/components/visual-library/minecraftBlockTextureRules";

export const dynamic = "force-dynamic";

const PUBLIC_TEXTURE_ROOTS = [
  ["public", "schematic-textures", "minecraft"],
  ["public", "schematic-textures", "minecraft", "block"],
  ["public", "schematic-textures", "minecraft", "blocks"],
  ["public", "schematic-textures", "minecraft", "assets", "minecraft", "textures", "block"],
  ["public", "schematic-textures", "minecraft", "assets", "minecraft", "textures", "blocks"],
  ["public", "schematic-textures", "modded"],
  ["public", "schematic-textures", "modded", "block"],
  ["public", "schematic-textures", "modded", "blocks"],
];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const block = url.searchParams.get("block") ?? "minecraft:grass_block";
  const textureSet = resolveMinecraftTextureSet(block);
  const candidates = getAllTextureCandidatesForBlock(block);
  const matches = await findTextureMatches(candidates);

  return NextResponse.json({
    block,
    textureSet,
    candidates,
    matches,
    found: matches.length > 0,
    expectedRoots: PUBLIC_TEXTURE_ROOTS.map((segments) => segments.join("/")),
  });
}

async function findTextureMatches(textureNames: string[]) {
  const matches: Array<{
    textureName: string;
    filePath: string;
    publicUrl: string;
  }> = [];

  for (const textureName of textureNames) {
    for (const rootSegments of PUBLIC_TEXTURE_ROOTS) {
      const absolutePath = path.join(process.cwd(), ...rootSegments, `${textureName}.png`);

      if (await fileExists(absolutePath)) {
        const publicUrl = `/${[...rootSegments.slice(1), `${textureName}.png`].join("/")}`.replace(/\\/g, "/");

        matches.push({
          textureName,
          filePath: path.relative(process.cwd(), absolutePath),
          publicUrl,
        });
      }
    }
  }

  return matches;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}
