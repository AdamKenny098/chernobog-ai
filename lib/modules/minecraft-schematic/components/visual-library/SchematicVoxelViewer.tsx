"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { VisualSchematicDetail } from "../../visual-library/types";
import { createMinecraftFaceMaterials } from "./minecraftTextureResolver";
import styles from "./schematicVisualLibrary.module.css";

type ViewerMode = "default" | "top-down" | "layer";

type RawVoxelBlock = {
  x?: unknown;
  y?: unknown;
  z?: unknown;
  blockId?: unknown;
  id?: unknown;
  name?: unknown;
  type?: unknown;
};

type NormalizedVoxelBlock = {
  x: number;
  y: number;
  z: number;
  blockId: string;
};

type SchematicVoxelViewerProps = {
  schematic: VisualSchematicDetail;
  viewMode?: ViewerMode | string;
  layer?: number | null;
  highlightedBlockId?: string | null;
  maxBlocks?: number;
};

const DEFAULT_MAX_BLOCKS = 12000;
const MAX_RAW_BLOCKS_TO_SCAN = 70000;
const AIR_BLOCK_IDS = new Set(["air", "minecraft:air", "cave_air", "minecraft:cave_air", "void_air", "minecraft:void_air"]);

export function SchematicVoxelViewer({
  schematic,
  viewMode = "default",
  layer = null,
  highlightedBlockId = null,
  maxBlocks = DEFAULT_MAX_BLOCKS,
}: SchematicVoxelViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState("Preparing textured voxel scene...");

  const normalizedBlocks = useMemo(
    () => normalizeViewerBlocks(schematic, viewMode, layer, highlightedBlockId, maxBlocks),
    [schematic, viewMode, layer, highlightedBlockId, maxBlocks],
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let cancelled = false;
    let frameId = 0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101116);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.replaceChildren(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      45,
      Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
      0.1,
      5000,
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;

    const ambient = new THREE.AmbientLight(0xffffff, 1.45);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(80, 140, 90);
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0xb7c7ff, 0.65);
    fill.position.set(-80, 65, -110);
    scene.add(fill);

    const grid = new THREE.GridHelper(128, 64, 0x555a66, 0x242831);
    grid.position.y = -0.51;
    scene.add(grid);

    const group = new THREE.Group();
    scene.add(group);

    const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.2,
    });

    async function buildScene() {
      setStatus(normalizedBlocks.message);

      if (normalizedBlocks.blocks.length === 0) {
        setStatus("No visible blocks available for this viewer mode.");
        return;
      }

      const bounds = getBounds(normalizedBlocks.blocks);
      const center = getCenter(bounds);

      const materialCache = new Map<string, THREE.Material | THREE.Material[]>();

      for (let index = 0; index < normalizedBlocks.blocks.length; index += 1) {
        if (cancelled) {
          return;
        }

        const block = normalizedBlocks.blocks[index];
        const blockId = block.blockId;
        const highlighted = highlightedBlockId
          ? blockId.toLowerCase().includes(highlightedBlockId.toLowerCase())
          : false;

        let material = materialCache.get(blockId);

        if (!material) {
          material = await createMinecraftFaceMaterials(blockId);
          materialCache.set(blockId, material);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(block.x - center.x, block.y - center.y, block.z - center.z);
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        group.add(mesh);

        if (highlighted) {
          const outline = new THREE.LineSegments(edgesGeometry, edgeMaterial.clone());
          outline.position.copy(mesh.position);
          outline.scale.setScalar(1.045);
          group.add(outline);
        }

        if (index % 200 === 0) {
          setStatus(`Loading textures and blocks ${index.toLocaleString()} / ${normalizedBlocks.blocks.length.toLocaleString()}...`);
          await waitForFrame();
        }
      }

      frameCamera(camera, controls, bounds, viewMode);
      setStatus(normalizedBlocks.message);
    }

    void buildScene();

    function animate() {
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    animate();

    const resizeObserver = new ResizeObserver(() => {
      if (!container) {
        return;
      }

      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });

    resizeObserver.observe(container);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      geometry.dispose();
      edgesGeometry.dispose();
      edgeMaterial.dispose();
      renderer.dispose();
      container.replaceChildren();
    };
  }, [normalizedBlocks, highlightedBlockId, viewMode]);

  return (
    <div
      className={styles.viewerCanvasShell}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 520,
        overflow: "hidden",
        borderRadius: 18,
        background: "#101116",
      }}
    >
      <div
        ref={containerRef}
        className={styles.viewerCanvas}
        style={{ width: "100%", height: "100%", minHeight: 520 }}
      />
      <div
        className={styles.viewerStatusOverlay}
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          maxWidth: "calc(100% - 24px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 999,
          padding: "7px 11px",
          color: "#e4e4e7",
          background: "rgba(0,0,0,0.48)",
          fontSize: 12,
          backdropFilter: "blur(10px)",
        }}
      >
        {status}
      </div>
    </div>
  );
}

function normalizeViewerBlocks(
  schematic: VisualSchematicDetail,
  viewMode: string,
  layer: number | null,
  highlightedBlockId: string | null,
  maxBlocks: number,
): {
  blocks: NormalizedVoxelBlock[];
  message: string;
} {
  const rawBlocks = extractRawBlocks(schematic).slice(0, MAX_RAW_BLOCKS_TO_SCAN);
  const normalized: NormalizedVoxelBlock[] = [];

  for (const rawBlock of rawBlocks) {
    const block = normalizeRawBlock(rawBlock);

    if (!block || AIR_BLOCK_IDS.has(block.blockId.toLowerCase())) {
      continue;
    }

    if (viewMode === "layer" && typeof layer === "number" && block.y !== layer) {
      continue;
    }

    normalized.push(block);
  }

  const filtered = highlightedBlockId
    ? normalized.filter((block) =>
        block.blockId.toLowerCase().includes(highlightedBlockId.toLowerCase()),
      )
    : normalized;

  const visible = filtered.slice(0, maxBlocks);
  const hiddenCount = Math.max(filtered.length - visible.length, 0);

  return {
    blocks: visible,
    message:
      hiddenCount > 0
        ? `Showing ${visible.length.toLocaleString()} blocks. ${hiddenCount.toLocaleString()} additional blocks were capped for browser safety.`
        : `Showing ${visible.length.toLocaleString()} textured blocks.`,
  };
}

function extractRawBlocks(schematic: VisualSchematicDetail): RawVoxelBlock[] {
  const asUnknown = schematic as unknown as {
    viewer?: {
      blocks?: RawVoxelBlock[];
      voxels?: RawVoxelBlock[];
      voxelBlocks?: RawVoxelBlock[];
      payload?: {
        blocks?: RawVoxelBlock[];
        voxels?: RawVoxelBlock[];
      };
    };
    blocks?: RawVoxelBlock[];
    voxels?: RawVoxelBlock[];
  };

  const candidates = [
    asUnknown.viewer?.blocks,
    asUnknown.viewer?.voxels,
    asUnknown.viewer?.voxelBlocks,
    asUnknown.viewer?.payload?.blocks,
    asUnknown.viewer?.payload?.voxels,
    asUnknown.blocks,
    asUnknown.voxels,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return createFallbackBlocksFromSize(schematic);
}

function normalizeRawBlock(block: RawVoxelBlock): NormalizedVoxelBlock | null {
  const x = toInteger(block.x);
  const y = toInteger(block.y);
  const z = toInteger(block.z);
  const blockId = readBlockId(block);

  if (x === null || y === null || z === null || !blockId) {
    return null;
  }

  return { x, y, z, blockId };
}

function readBlockId(block: RawVoxelBlock): string | null {
  const value = block.blockId ?? block.id ?? block.name ?? block.type;

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return null;
}

function toInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
}

function createFallbackBlocksFromSize(schematic: VisualSchematicDetail): NormalizedVoxelBlock[] {
  const width = Math.max(1, Math.min(schematic.size.x || 8, 18));
  const height = Math.max(1, Math.min(schematic.size.y || 6, 10));
  const depth = Math.max(1, Math.min(schematic.size.z || 8, 18));
  const blocks: NormalizedVoxelBlock[] = [];

  for (let x = 0; x < width; x += 1) {
    for (let z = 0; z < depth; z += 1) {
      blocks.push({ x, y: 0, z, blockId: "minecraft:stone" });
    }
  }

  for (let y = 1; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      blocks.push({ x, y, z: 0, blockId: "minecraft:oak_planks" });
      blocks.push({ x, y, z: depth - 1, blockId: "minecraft:oak_planks" });
    }

    for (let z = 1; z < depth - 1; z += 1) {
      blocks.push({ x: 0, y, z, blockId: "minecraft:glass" });
      blocks.push({ x: width - 1, y, z, blockId: "minecraft:glass" });
    }
  }

  return blocks;
}

function getBounds(blocks: NormalizedVoxelBlock[]) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const block of blocks) {
    minX = Math.min(minX, block.x);
    minY = Math.min(minY, block.y);
    minZ = Math.min(minZ, block.z);
    maxX = Math.max(maxX, block.x);
    maxY = Math.max(maxY, block.y);
    maxZ = Math.max(maxZ, block.z);
  }

  return { minX, minY, minZ, maxX, maxY, maxZ };
}

function getCenter(bounds: ReturnType<typeof getBounds>) {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2,
  };
}

function frameCamera(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  bounds: ReturnType<typeof getBounds>,
  viewMode: string,
): void {
  const sizeX = Math.max(bounds.maxX - bounds.minX + 1, 1);
  const sizeY = Math.max(bounds.maxY - bounds.minY + 1, 1);
  const sizeZ = Math.max(bounds.maxZ - bounds.minZ + 1, 1);
  const radius = Math.max(sizeX, sizeY, sizeZ, 12);

  controls.target.set(0, 0, 0);

  if (viewMode === "top-down") {
    camera.position.set(0, radius * 1.9, 0.01);
  } else {
    camera.position.set(radius * 1.15, radius * 0.82, radius * 1.15);
  }

  camera.near = 0.1;
  camera.far = radius * 20;
  camera.updateProjectionMatrix();
  controls.update();
}

function waitForFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export default SchematicVoxelViewer;
