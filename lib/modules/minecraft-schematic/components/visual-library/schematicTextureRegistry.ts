import * as THREE from "three";

import type { VisualBlockMaterialInfo } from "../../visual-library/types";
import { getSchematicTextureCandidateUrls } from "./schematicTextureResolver";

export class SchematicTextureMaterialCache {
  private readonly loader = new THREE.TextureLoader();
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly fallbackTextures = new Set<THREE.Texture>();
  private readonly externalTextures = new Set<THREE.Texture>();
  private readonly resolvedTextureUrls = new Map<string, string>();
  private disposed = false;

  getMaterial(materialInfo: VisualBlockMaterialInfo): THREE.MeshStandardMaterial {
    const existing = this.materials.get(materialInfo.key);

    if (existing) {
      return existing;
    }

    const fallbackTexture = createGeneratedPixelTexture(materialInfo);
    this.fallbackTextures.add(fallbackTexture);

    const material = new THREE.MeshStandardMaterial({
      map: fallbackTexture,
      color: new THREE.Color("#ffffff"),
      roughness: materialInfo.roughness,
      metalness: materialInfo.metalness,
      transparent: materialInfo.transparent,
      opacity: materialInfo.opacity,
      alphaTest: materialInfo.kind === "foliage" ? 0.18 : 0,
      depthWrite: !materialInfo.transparent,
      emissive: new THREE.Color(materialInfo.emissive ?? "#000000"),
      emissiveIntensity: materialInfo.emissiveIntensity ?? 0,
    });

    this.materials.set(materialInfo.key, material);
    this.tryLoadExternalTexture(materialInfo, material, fallbackTexture);

    return material;
  }

  getResolvedTextureUrl(materialKey: string): string | null {
    return this.resolvedTextureUrls.get(materialKey) ?? null;
  }

  dispose(): void {
    this.disposed = true;

    for (const material of this.materials.values()) {
      material.dispose();
    }

    for (const texture of this.fallbackTextures) {
      texture.dispose();
    }

    for (const texture of this.externalTextures) {
      texture.dispose();
    }

    this.materials.clear();
    this.fallbackTextures.clear();
    this.externalTextures.clear();
    this.resolvedTextureUrls.clear();
  }

  private tryLoadExternalTexture(
    materialInfo: VisualBlockMaterialInfo,
    material: THREE.MeshStandardMaterial,
    fallbackTexture: THREE.Texture,
  ): void {
    const candidateUrls = getSchematicTextureCandidateUrls(materialInfo);

    if (candidateUrls.length === 0) {
      return;
    }

    this.tryLoadTextureCandidate(
      materialInfo,
      material,
      fallbackTexture,
      candidateUrls,
      0,
    );
  }

  private tryLoadTextureCandidate(
    materialInfo: VisualBlockMaterialInfo,
    material: THREE.MeshStandardMaterial,
    fallbackTexture: THREE.Texture,
    candidateUrls: string[],
    index: number,
  ): void {
    if (this.disposed || index >= candidateUrls.length) {
      material.map = fallbackTexture;
      material.needsUpdate = true;
      return;
    }

    const candidateUrl = candidateUrls[index];

    if (!candidateUrl) {
      material.map = fallbackTexture;
      material.needsUpdate = true;
      return;
    }

    this.loader.load(
      candidateUrl,
      (texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }

        configurePixelTexture(texture);
        texture.name = `${materialInfo.key} texture`;
        this.externalTextures.add(texture);
        this.resolvedTextureUrls.set(materialInfo.key, candidateUrl);

        if (material.map === fallbackTexture || material.map === null) {
          material.map = texture;
          material.needsUpdate = true;
        }
      },
      undefined,
      () => {
        this.tryLoadTextureCandidate(
          materialInfo,
          material,
          fallbackTexture,
          candidateUrls,
          index + 1,
        );
      },
    );
  }
}

function createGeneratedPixelTexture(
  materialInfo: VisualBlockMaterialInfo,
): THREE.Texture {
  const canvas = document.createElement("canvas");
  const size = 16;

  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");

  if (!context) {
    const emptyTexture = new THREE.CanvasTexture(canvas);
    configurePixelTexture(emptyTexture);
    return emptyTexture;
  }

  context.imageSmoothingEnabled = false;
  drawBase(context, size, materialInfo);
  drawPattern(context, size, materialInfo);
  drawPixelNoise(context, size, materialInfo);

  const texture = new THREE.CanvasTexture(canvas);
  configurePixelTexture(texture);

  return texture;
}

function configurePixelTexture(texture: THREE.Texture): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.generateMipmaps = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
}

function drawBase(
  context: CanvasRenderingContext2D,
  size: number,
  materialInfo: VisualBlockMaterialInfo,
): void {
  context.fillStyle = materialInfo.color;
  context.fillRect(0, 0, size, size);

  context.fillStyle = withAlpha(materialInfo.secondaryColor, 0.34);
  context.fillRect(0, 0, size, 2);
  context.fillRect(0, 0, 2, size);

  context.fillStyle = withAlpha("#000000", 0.18);
  context.fillRect(0, size - 2, size, 2);
  context.fillRect(size - 2, 0, 2, size);
}

function drawPattern(
  context: CanvasRenderingContext2D,
  size: number,
  materialInfo: VisualBlockMaterialInfo,
): void {
  const key = materialInfo.key;

  if (key.includes("brick")) {
    drawBrickPattern(context, size, materialInfo);
    return;
  }

  if (key.includes("plank") || key.includes("log") || key.includes("wood")) {
    drawWoodPattern(context, size, materialInfo);
    return;
  }

  if (key.includes("glass")) {
    drawGlassPattern(context, size, materialInfo);
    return;
  }

  if (materialInfo.kind === "foliage") {
    drawFoliagePattern(context, size, materialInfo);
    return;
  }

  if (materialInfo.kind === "liquid") {
    drawLiquidPattern(context, size, materialInfo);
    return;
  }

  if (materialInfo.kind === "emissive") {
    drawEmissivePattern(context, size, materialInfo);
  }
}

function drawBrickPattern(
  context: CanvasRenderingContext2D,
  size: number,
  materialInfo: VisualBlockMaterialInfo,
): void {
  context.fillStyle = withAlpha("#000000", 0.3);

  for (let y = 3; y < size; y += 5) {
    context.fillRect(0, y, size, 1);
  }

  for (let y = 0; y < size; y += 5) {
    const offset = y % 10 === 0 ? 0 : 4;

    for (let x = offset; x < size; x += 8) {
      context.fillRect(x, y, 1, 5);
    }
  }

  context.fillStyle = withAlpha(materialInfo.secondaryColor, 0.24);
  context.fillRect(1, 1, 5, 1);
  context.fillRect(9, 6, 5, 1);
}

function drawWoodPattern(
  context: CanvasRenderingContext2D,
  size: number,
  materialInfo: VisualBlockMaterialInfo,
): void {
  context.fillStyle = withAlpha("#000000", 0.22);

  for (let y = 3; y < size; y += 4) {
    context.fillRect(0, y, size, 1);
  }

  context.fillStyle = withAlpha(materialInfo.secondaryColor, 0.26);
  context.fillRect(2, 1, 1, size - 2);
  context.fillRect(9, 2, 1, size - 4);
  context.fillRect(13, 4, 1, size - 7);
}

function drawGlassPattern(
  context: CanvasRenderingContext2D,
  size: number,
  materialInfo: VisualBlockMaterialInfo,
): void {
  context.clearRect(0, 0, size, size);
  context.fillStyle = withAlpha(materialInfo.color, 0.52);
  context.fillRect(0, 0, size, size);
  context.fillStyle = withAlpha("#ffffff", 0.62);
  context.fillRect(2, 2, 5, 1);
  context.fillRect(2, 3, 1, 5);
  context.fillStyle = withAlpha(materialInfo.secondaryColor, 0.42);
  context.fillRect(10, 10, 4, 1);
  context.fillRect(13, 7, 1, 4);
}

function drawFoliagePattern(
  context: CanvasRenderingContext2D,
  size: number,
  materialInfo: VisualBlockMaterialInfo,
): void {
  const seed = hashString(materialInfo.key);
  context.fillStyle = withAlpha(materialInfo.secondaryColor, 0.46);

  for (let i = 0; i < 34; i += 1) {
    const x = seededNumber(seed + i * 31, size);
    const y = seededNumber(seed + i * 47, size);
    context.fillRect(x, y, 2, 2);
  }

  context.fillStyle = withAlpha("#000000", 0.18);

  for (let i = 0; i < 18; i += 1) {
    const x = seededNumber(seed + i * 53, size);
    const y = seededNumber(seed + i * 71, size);
    context.fillRect(x, y, 1, 1);
  }
}

function drawLiquidPattern(
  context: CanvasRenderingContext2D,
  size: number,
  materialInfo: VisualBlockMaterialInfo,
): void {
  context.fillStyle = withAlpha(materialInfo.secondaryColor, 0.32);

  for (let y = 2; y < size; y += 5) {
    for (let x = 0; x < size; x += 8) {
      context.fillRect((x + y) % size, y, 5, 1);
    }
  }
}

function drawEmissivePattern(
  context: CanvasRenderingContext2D,
  size: number,
  materialInfo: VisualBlockMaterialInfo,
): void {
  context.fillStyle = withAlpha(materialInfo.secondaryColor, 0.5);
  context.fillRect(4, 4, size - 8, size - 8);
  context.fillStyle = withAlpha("#ffffff", 0.28);
  context.fillRect(6, 6, size - 12, size - 12);
}

function drawPixelNoise(
  context: CanvasRenderingContext2D,
  size: number,
  materialInfo: VisualBlockMaterialInfo,
): void {
  const seed = hashString(materialInfo.key);

  for (let i = 0; i < 28; i += 1) {
    const x = seededNumber(seed + i * 17, size);
    const y = seededNumber(seed + i * 23, size);
    const light = seededNumber(seed + i * 29, 100) > 52;

    context.fillStyle = light
      ? withAlpha(materialInfo.secondaryColor, 0.2)
      : withAlpha("#000000", 0.16);

    context.fillRect(x, y, 1, 1);
  }
}

function withAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");

  if (normalized.length !== 6) {
    return hex;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash);
}

function seededNumber(seed: number, maxExclusive: number): number {
  const value = Math.sin(seed) * 10000;
  return Math.floor((value - Math.floor(value)) * maxExclusive);
}
