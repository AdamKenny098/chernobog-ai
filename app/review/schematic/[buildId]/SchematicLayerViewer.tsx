"use client";

import { useMemo, useState } from "react";

type SchematicSize = {
  x: number;
  y: number;
  z: number;
};

type SchematicBlock = {
  x: number;
  y: number;
  z: number;
  block: string;
};

type SchematicBlockEntity = {
  id: string;
  kind: string;
  x: number;
  y: number;
  z: number;
  text?: string[];
  label?: string;
};

type Props = {
  size: SchematicSize;
  blocks: SchematicBlock[];
  blockEntities?: SchematicBlockEntity[];
};

type PaletteEntry = {
  block: string;
  count: number;
};

const blockColors = [
  "#475569",
  "#92400e",
  "#854d0e",
  "#365314",
  "#1e3a8a",
  "#581c87",
  "#7f1d1d",
  "#164e63",
  "#3f3f46",
  "#78350f",
];

function baseBlockName(block: string): string {
  return block.includes("[") ? block.slice(0, block.indexOf("[")) : block;
}

function shortBlockName(block: string): string {
  const base = baseBlockName(block);
  const name = base.includes(":") ? base.split(":")[1] : base;
  return name
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 3);
}

function colorForBlock(block: string): string {
  const base = baseBlockName(block);
  let hash = 0;

  for (let index = 0; index < base.length; index += 1) {
    hash = (hash * 31 + base.charCodeAt(index)) >>> 0;
  }

  return blockColors[hash % blockColors.length];
}

function buildPalette(blocks: SchematicBlock[]): PaletteEntry[] {
  const counts = new Map<string, number>();

  for (const block of blocks) {
    counts.set(block.block, (counts.get(block.block) ?? 0) + 1);
  }

  return Array.from(counts, ([block, count]) => ({ block, count })).sort((a, b) => b.count - a.count || a.block.localeCompare(b.block));
}

function getLayerWithMostBlocks(blocks: SchematicBlock[]): number {
  const counts = new Map<number, number>();

  for (const block of blocks) {
    counts.set(block.y, (counts.get(block.y) ?? 0) + 1);
  }

  let bestLayer = 0;
  let bestCount = -1;

  for (const [layer, count] of counts) {
    if (count > bestCount) {
      bestLayer = layer;
      bestCount = count;
    }
  }

  return bestLayer;
}

export function SchematicLayerViewer({ size, blocks, blockEntities = [] }: Props) {
  const [layer, setLayer] = useState(() => getLayerWithMostBlocks(blocks));
  const [selectedBlock, setSelectedBlock] = useState<string>("all");
  const [search, setSearch] = useState("");

  const blocksByLayer = useMemo(() => {
    const map = new Map<number, Map<string, SchematicBlock>>();

    for (const block of blocks) {
      const layerMap = map.get(block.y) ?? new Map<string, SchematicBlock>();
      layerMap.set(`${block.x},${block.z}`, block);
      map.set(block.y, layerMap);
    }

    return map;
  }, [blocks]);

  const entityMap = useMemo(() => {
    const map = new Map<string, SchematicBlockEntity>();

    for (const entity of blockEntities) {
      map.set(`${entity.x},${entity.y},${entity.z}`, entity);
    }

    return map;
  }, [blockEntities]);

  const fullPalette = useMemo(() => buildPalette(blocks), [blocks]);

  const layerBlocks = useMemo(() => blocks.filter((block) => block.y === layer), [blocks, layer]);
  const layerPalette = useMemo(() => buildPalette(layerBlocks), [layerBlocks]);
  const currentLayer = blocksByLayer.get(layer) ?? new Map<string, SchematicBlock>();

  const filteredLayerPalette = layerPalette.filter((entry) => entry.block.toLowerCase().includes(search.toLowerCase()));
  const filledCells = currentLayer.size;
  const totalCells = Math.max(size.x * size.z, 1);
  const fillPercent = Math.round((filledCells / totalCells) * 100);

  return (
    <section style={{ border: "1px solid #2b3340", borderRadius: 14, padding: 18, background: "#0f151d" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Layer/debug viewer</h2>
          <p style={{ color: "#94a3b8", marginTop: 0 }}>Top-down layer view for fast schematic inspection before opening Minecraft.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span style={{ border: "1px solid #334155", borderRadius: 999, padding: "5px 10px" }}>Layer {layer}</span>
          <span style={{ border: "1px solid #334155", borderRadius: 999, padding: "5px 10px" }}>{filledCells} blocks</span>
          <span style={{ border: "1px solid #334155", borderRadius: 999, padding: "5px 10px" }}>{fillPercent}% filled</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 300px) 1fr", gap: 18, alignItems: "start" }}>
        <aside style={{ border: "1px solid #253044", borderRadius: 12, padding: 12, background: "#0b1118" }}>
          <label style={{ display: "block", marginBottom: 14 }}>
            <div style={{ color: "#94a3b8", marginBottom: 6 }}>Y Layer: {layer}</div>
            <input
              type="range"
              min={0}
              max={Math.max(size.y - 1, 0)}
              value={layer}
              onChange={(event) => setLayer(Number(event.target.value))}
              style={{ display: "block", width: "100%" }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setLayer(Math.max(layer - 1, 0))}
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #334155", background: "#111827", color: "#d8dee9" }}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setLayer(Math.min(layer + 1, Math.max(size.y - 1, 0)))}
              style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid #334155", background: "#111827", color: "#d8dee9" }}
            >
              Next
            </button>
          </div>

          <button
            type="button"
            onClick={() => setLayer(getLayerWithMostBlocks(blocks))}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #334155", background: "#111827", color: "#d8dee9", marginBottom: 14 }}
          >
            Jump to densest layer
          </button>

          <label style={{ display: "block", marginBottom: 12 }}>
            <div style={{ color: "#94a3b8", marginBottom: 6 }}>Filter layer palette</div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="stone, rail, window..."
              style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid #334155", background: "#070b10", color: "#d8dee9" }}
            />
          </label>

          <button
            type="button"
            onClick={() => setSelectedBlock("all")}
            style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 8, border: selectedBlock === "all" ? "1px solid #94a3b8" : "1px solid #334155", background: selectedBlock === "all" ? "#1f2937" : "#111827", color: "#d8dee9", marginBottom: 8 }}
          >
            All layer blocks ({layerBlocks.length})
          </button>

          <div style={{ maxHeight: 360, overflow: "auto", display: "grid", gap: 6 }}>
            {filteredLayerPalette.map((entry) => (
              <button
                key={entry.block}
                type="button"
                onClick={() => setSelectedBlock(entry.block)}
                title={entry.block}
                style={{
                  display: "grid",
                  gridTemplateColumns: "18px 1fr auto",
                  alignItems: "center",
                  gap: 8,
                  textAlign: "left",
                  padding: "7px 8px",
                  borderRadius: 8,
                  border: selectedBlock === entry.block ? "1px solid #94a3b8" : "1px solid #253044",
                  background: selectedBlock === entry.block ? "#1f2937" : "#0f151d",
                  color: "#d8dee9",
                }}
              >
                <span style={{ width: 14, height: 14, borderRadius: 4, background: colorForBlock(entry.block), display: "inline-block" }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{baseBlockName(entry.block)}</span>
                <span style={{ color: "#94a3b8" }}>{entry.count}</span>
              </button>
            ))}
          </div>

          <details style={{ marginTop: 14 }}>
            <summary>Full palette ({fullPalette.length})</summary>
            <div style={{ marginTop: 8, maxHeight: 260, overflow: "auto", display: "grid", gap: 4 }}>
              {fullPalette.map((entry) => (
                <div key={entry.block} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, fontSize: 12 }}>
                  <code style={{ overflowWrap: "anywhere" }}>{entry.block}</code>
                  <span style={{ color: "#94a3b8" }}>{entry.count}</span>
                </div>
              ))}
            </div>
          </details>
        </aside>

        <div style={{ minWidth: 0 }}>
          <div style={{ overflow: "auto", border: "1px solid #1f2630", borderRadius: 12, background: "#070b10" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${size.x}, 24px)`,
                gap: 1,
                padding: 10,
                width: "max-content",
              }}
            >
              {Array.from({ length: size.z }).flatMap((_, z) =>
                Array.from({ length: size.x }).map((__, x) => {
                  const block = currentLayer.get(`${x},${z}`);
                  const entity = entityMap.get(`${x},${layer},${z}`);
                  const hiddenByFilter = Boolean(block && selectedBlock !== "all" && block.block !== selectedBlock);
                  const visibleBlock = block && !hiddenByFilter;
                  const title = block
                    ? `${x},${layer},${z}: ${block.block}${entity ? ` | ${entity.kind}${entity.label ? `: ${entity.label}` : ""}` : ""}`
                    : `${x},${layer},${z}: air`;

                  return (
                    <div
                      key={`${x},${z}`}
                      title={title}
                      style={{
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 8,
                        border: entity ? "1px solid #fbbf24" : "1px solid #1f2937",
                        background: visibleBlock ? colorForBlock(block.block) : block ? "#111827" : "#030712",
                        color: visibleBlock ? "#f8fafc" : "#374151",
                        fontFamily: "monospace",
                        opacity: block && hiddenByFilter ? 0.32 : 1,
                      }}
                    >
                      {visibleBlock ? shortBlockName(block.block) : entity ? "BE" : "·"}
                    </div>
                  );
                }),
              )}
            </div>
          </div>

          <p style={{ color: "#94a3b8", marginBottom: 0 }}>
            Gold-bordered cells contain block entity metadata. Hover any cell for coordinates and block state.
          </p>
        </div>
      </div>
    </section>
  );
}
