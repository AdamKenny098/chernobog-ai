import type { BlockStateProperties, BlockStateValue, ParsedBlockState } from './BlockDefinition';

export function normalizeBlockId(blockId: string): string {
  const trimmed = blockId.trim();
  if (!trimmed) return 'minecraft:air';
  return trimmed.includes(':') ? trimmed : `minecraft:${trimmed}`;
}

export function buildBlockState(blockId: string, properties: BlockStateProperties = {}): string {
  const id = normalizeBlockId(blockId);
  const keys = Object.keys(properties).filter((key) => properties[key] !== undefined && properties[key] !== null).sort();

  if (keys.length === 0) return id;

  const state = keys
    .map((key) => `${key}=${formatBlockStateValue(properties[key])}`)
    .join(',');

  return `${id}[${state}]`;
}

export function parseBlockState(rawBlockState: string): ParsedBlockState {
  const raw = (rawBlockState || 'minecraft:air').trim();
  const start = raw.indexOf('[');

  if (start === -1) {
    return { id: normalizeBlockId(raw), properties: {}, raw };
  }

  const end = raw.lastIndexOf(']');
  const id = normalizeBlockId(raw.slice(0, start));
  const propertiesRaw = end === -1 ? raw.slice(start + 1) : raw.slice(start + 1, end);
  const properties: BlockStateProperties = {};

  for (const pair of propertiesRaw.split(',')) {
    const cleanPair = pair.trim();
    if (!cleanPair) continue;
    const equalsIndex = cleanPair.indexOf('=');
    if (equalsIndex === -1) continue;

    const key = cleanPair.slice(0, equalsIndex).trim();
    const value = cleanPair.slice(equalsIndex + 1).trim();
    if (!key) continue;
    properties[key] = parseBlockStateValue(value);
  }

  return { id, properties, raw };
}

export function formatBlockStateValue(value: BlockStateValue): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function parseBlockStateValue(value: string): BlockStateValue {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}
