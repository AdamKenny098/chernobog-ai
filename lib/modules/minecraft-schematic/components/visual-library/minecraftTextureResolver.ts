import * as THREE from "three";

import {
  getTextureNameCandidates,
  resolveMinecraftTextureSet,
  type MinecraftBlockFace,
} from "./minecraftBlockTextureRules";

export type MinecraftTextureLookupResult = {
  texture: THREE.Texture | null;
  triedUrls: string[];
  matchedUrl: string | null;
};

export type MinecraftFaceMaterialSet = [
  THREE.Material,
  THREE.Material,
  THREE.Material,
  THREE.Material,
  THREE.Material,
  THREE.Material,
];

const FACE_ORDER: MinecraftBlockFace[] = [
  "east",
  "west",
  "top",
  "bottom",
  "south",
  "north",
];

const TEXTURE_ROOTS = [
  "/schematic-textures/minecraft",
  "/schematic-textures/minecraft/block",
  "/schematic-textures/minecraft/blocks",
  "/schematic-textures/minecraft/assets/minecraft/textures/block",
  "/schematic-textures/minecraft/assets/minecraft/textures/blocks",
  "/schematic-textures/modded",
  "/schematic-textures/modded/block",
  "/schematic-textures/modded/blocks",
];

const textureCache = new Map<string, Promise<MinecraftTextureLookupResult>>();
const materialCache = new Map<string, Promise<MinecraftFaceMaterialSet>>();
const fallbackMaterialCache = new Map<string, THREE.Material>();

export async function createMinecraftFaceMaterials(
  blockId: string,
): Promise<MinecraftFaceMaterialSet> {
  const cacheKey = blockId.trim().toLowerCase();
  const cached = materialCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const promise = createMinecraftFaceMaterialsUncached(blockId);
  materialCache.set(cacheKey, promise);
  return promise;
}

export function clearMinecraftTextureCaches(): void {
  textureCache.clear();
  materialCache.clear();
  fallbackMaterialCache.clear();
}

async function createMinecraftFaceMaterialsUncached(
  blockId: string,
): Promise<MinecraftFaceMaterialSet> {
  const textureSet = resolveMinecraftTextureSet(blockId);
  const materials = await Promise.all(
    FACE_ORDER.map(async (face) => {
      const lookup = await loadFirstAvailableTexture(textureSet[face]);

      if (!lookup.texture) {
        return createFallbackMaterial(blockId, textureSet.transparent, textureSet.opacity);
      }

      return new THREE.MeshLambertMaterial({
        map: lookup.texture,
        transparent: textureSet.transparent || textureSet.opacity < 1,
        opacity: textureSet.opacity,
        alphaTest: textureSet.transparent ? 0.08 : 0,
      });
    }),
  );

  return materials as MinecraftFaceMaterialSet;
}

export async function loadFirstAvailableTexture(
  textureNames: string[],
): Promise<MinecraftTextureLookupResult> {
  const uniqueNames = Array.from(new Set(textureNames.flatMap(getTextureNameCandidates)));
  const urls = uniqueNames.flatMap(createTextureUrlCandidates);
  const cacheKey = urls.join("|");
  const cached = textureCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const promise = loadFirstAvailableTextureUncached(urls);
  textureCache.set(cacheKey, promise);
  return promise;
}

async function loadFirstAvailableTextureUncached(
  urls: string[],
): Promise<MinecraftTextureLookupResult> {
  for (const url of urls) {
    const texture = await tryLoadTexture(url);

    if (texture) {
      return {
        texture,
        triedUrls: urls,
        matchedUrl: url,
      };
    }
  }

  return {
    texture: null,
    triedUrls: urls,
    matchedUrl: null,
  };
}

function tryLoadTexture(url: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const texture = new THREE.Texture(image);
      texture.needsUpdate = true;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestMipmapNearestFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      resolve(texture);
    };

    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export function createTextureUrlCandidates(textureName: string): string[] {
  const cleanName = textureName.replace(/^minecraft:/, "").replace(/\.png$/i, "");

  return TEXTURE_ROOTS.map((root) => `${root}/${cleanName}.png`);
}

function createFallbackMaterial(
  blockId: string,
  transparent: boolean,
  opacity: number,
): THREE.Material {
  const key = `${blockId}|${transparent}|${opacity}`;
  const cached = fallbackMaterialCache.get(key);

  if (cached) {
    return cached;
  }

  const material = new THREE.MeshLambertMaterial({
    color: pickFallbackColor(blockId),
    transparent: transparent || opacity < 1,
    opacity,
  });

  fallbackMaterialCache.set(key, material);
  return material;
}

function pickFallbackColor(blockId: string): THREE.ColorRepresentation {
  const normalized = blockId.toLowerCase();

  if (normalized.includes("grass")) {
    return 0x5f8f45;
  }

  if (normalized.includes("leaves")) {
    return 0x3f7f3f;
  }

  if (normalized.includes("dirt")) {
    return 0x8a5a32;
  }

  if (normalized.includes("stone") || normalized.includes("andesite")) {
    return 0x7d7d7d;
  }

  if (normalized.includes("deepslate") || normalized.includes("blackstone")) {
    return 0x353535;
  }

  if (normalized.includes("wood") || normalized.includes("log")) {
    return 0x8a5a32;
  }

  if (normalized.includes("plank")) {
    return 0xb78048;
  }

  if (normalized.includes("glass")) {
    return 0x86b6c9;
  }

  if (normalized.includes("water")) {
    return 0x315f9f;
  }

  if (normalized.includes("lava")) {
    return 0xd65b25;
  }

  if (normalized.includes("sand")) {
    return 0xd8c27d;
  }

  if (normalized.includes("brick")) {
    return 0x9b3f32;
  }

  if (normalized.includes("copper")) {
    return 0xb86f44;
  }

  return 0x8b8f99;
}
