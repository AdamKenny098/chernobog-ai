import type { BlockDefinition, StatePropertyRule } from './BlockDefinition';
import { BlockShapeKinds } from './BlockShapeKind';
import { normalizeBlockId } from './blockStateString';

const CARDINAL = ['north', 'south', 'east', 'west'] as const;
const BOOLEAN = [true, false] as const;
const AXES = ['x', 'y', 'z'] as const;
const WALL_SIDES = ['none', 'low', 'tall'] as const;

const stairsProperties: Record<string, StatePropertyRule> = {
  facing: { required: true, values: CARDINAL, defaultValue: 'north' },
  half: { required: true, values: ['top', 'bottom'], defaultValue: 'bottom' },
  shape: { required: true, values: ['straight', 'inner_left', 'inner_right', 'outer_left', 'outer_right'], defaultValue: 'straight' },
  waterlogged: { required: false, values: BOOLEAN, defaultValue: false },
};

const slabProperties: Record<string, StatePropertyRule> = {
  type: { required: true, values: ['top', 'bottom', 'double'], defaultValue: 'bottom' },
  waterlogged: { required: false, values: BOOLEAN, defaultValue: false },
};

const doorProperties: Record<string, StatePropertyRule> = {
  facing: { required: true, values: CARDINAL, defaultValue: 'north' },
  half: { required: true, values: ['upper', 'lower'], defaultValue: 'lower' },
  hinge: { required: true, values: ['left', 'right'], defaultValue: 'left' },
  open: { required: true, values: BOOLEAN, defaultValue: false },
  powered: { required: true, values: BOOLEAN, defaultValue: false },
};

const trapdoorProperties: Record<string, StatePropertyRule> = {
  facing: { required: true, values: CARDINAL, defaultValue: 'north' },
  half: { required: true, values: ['top', 'bottom'], defaultValue: 'bottom' },
  open: { required: true, values: BOOLEAN, defaultValue: false },
  powered: { required: true, values: BOOLEAN, defaultValue: false },
  waterlogged: { required: false, values: BOOLEAN, defaultValue: false },
};

const fenceProperties: Record<string, StatePropertyRule> = {
  north: { required: true, values: BOOLEAN, defaultValue: false },
  south: { required: true, values: BOOLEAN, defaultValue: false },
  east: { required: true, values: BOOLEAN, defaultValue: false },
  west: { required: true, values: BOOLEAN, defaultValue: false },
  waterlogged: { required: false, values: BOOLEAN, defaultValue: false },
};

const wallProperties: Record<string, StatePropertyRule> = {
  north: { required: true, values: WALL_SIDES, defaultValue: 'none' },
  south: { required: true, values: WALL_SIDES, defaultValue: 'none' },
  east: { required: true, values: WALL_SIDES, defaultValue: 'none' },
  west: { required: true, values: WALL_SIDES, defaultValue: 'none' },
  up: { required: true, values: BOOLEAN, defaultValue: true },
  waterlogged: { required: false, values: BOOLEAN, defaultValue: false },
};

const paneProperties: Record<string, StatePropertyRule> = {
  north: { required: true, values: BOOLEAN, defaultValue: false },
  south: { required: true, values: BOOLEAN, defaultValue: false },
  east: { required: true, values: BOOLEAN, defaultValue: false },
  west: { required: true, values: BOOLEAN, defaultValue: false },
  waterlogged: { required: false, values: BOOLEAN, defaultValue: false },
};

const facingProperties: Record<string, StatePropertyRule> = {
  facing: { required: true, values: CARDINAL, defaultValue: 'north' },
};

const ladderProperties: Record<string, StatePropertyRule> = {
  facing: { required: true, values: CARDINAL, defaultValue: 'north' },
  waterlogged: { required: false, values: BOOLEAN, defaultValue: false },
};

const lanternProperties: Record<string, StatePropertyRule> = {
  hanging: { required: true, values: BOOLEAN, defaultValue: false },
  waterlogged: { required: false, values: BOOLEAN, defaultValue: false },
};

const axisProperties: Record<string, StatePropertyRule> = {
  axis: { required: true, values: AXES, defaultValue: 'y' },
};

export class BlockRegistry {
  private readonly definitions = new Map<string, BlockDefinition>();

  constructor(initialDefinitions: BlockDefinition[] = []) {
    registerDefaultBlocks(this);
    for (const definition of initialDefinitions) this.register(definition);
  }

  register(definition: BlockDefinition): void {
    const normalized: BlockDefinition = {
      ...definition,
      id: normalizeBlockId(definition.id),
      aliases: definition.aliases?.map(normalizeBlockId),
    };

    this.definitions.set(normalized.id, normalized);
    for (const alias of normalized.aliases ?? []) {
      this.definitions.set(alias, normalized);
    }
  }

  get(blockId: string): BlockDefinition | undefined {
    const id = normalizeBlockId(blockId);
    return this.definitions.get(id) ?? inferDefinitionFromBlockId(id);
  }

  has(blockId: string): boolean {
    return Boolean(this.get(blockId));
  }

  all(): BlockDefinition[] {
    return Array.from(new Set(this.definitions.values())).sort((a, b) => a.id.localeCompare(b.id));
  }
}

export const DEFAULT_BLOCK_REGISTRY = new BlockRegistry();

export function registerDefaultBlocks(registry: BlockRegistry): void {
  const solidBlocks = [
    'minecraft:air',
    'minecraft:stone',
    'minecraft:cobblestone',
    'minecraft:mossy_cobblestone',
    'minecraft:stone_bricks',
    'minecraft:cracked_stone_bricks',
    'minecraft:mossy_stone_bricks',
    'minecraft:chiseled_stone_bricks',
    'minecraft:deepslate_bricks',
    'minecraft:cracked_deepslate_bricks',
    'minecraft:cobbled_deepslate',
    'minecraft:oak_planks',
    'minecraft:spruce_planks',
    'minecraft:dark_oak_planks',
    'minecraft:glass',
  ];

  for (const id of solidBlocks) {
    registry.register({
      id,
      kind: BlockShapeKinds.FullBlock,
      isSolidSupport: id !== 'minecraft:air',
      canAttachTo: id !== 'minecraft:air',
      canConnectFence: id !== 'minecraft:air',
      canConnectPane: id !== 'minecraft:air',
      canConnectWall: id !== 'minecraft:air',
    });
  }

  const stairBlocks = ['stone_brick_stairs', 'cobblestone_stairs', 'mossy_cobblestone_stairs', 'spruce_stairs', 'oak_stairs', 'dark_oak_stairs'];
  for (const id of stairBlocks) registry.register({ id, kind: BlockShapeKinds.Stairs, properties: stairsProperties, isSolidSupport: false });

  const slabBlocks = ['stone_brick_slab', 'cobblestone_slab', 'mossy_cobblestone_slab', 'spruce_slab', 'oak_slab', 'dark_oak_slab'];
  for (const id of slabBlocks) registry.register({ id, kind: BlockShapeKinds.Slab, properties: slabProperties, isSolidSupport: false });

  const doorBlocks = ['oak_door', 'spruce_door', 'dark_oak_door', 'iron_door'];
  for (const id of doorBlocks) registry.register({ id, kind: BlockShapeKinds.Door, properties: doorProperties });

  const trapdoorBlocks = ['oak_trapdoor', 'spruce_trapdoor', 'dark_oak_trapdoor', 'iron_trapdoor'];
  for (const id of trapdoorBlocks) registry.register({ id, kind: BlockShapeKinds.Trapdoor, properties: trapdoorProperties });

  const fenceBlocks = ['oak_fence', 'spruce_fence', 'dark_oak_fence'];
  for (const id of fenceBlocks) registry.register({ id, kind: BlockShapeKinds.Fence, properties: fenceProperties, canConnectFence: true, canConnectWall: true });

  const wallBlocks = ['cobblestone_wall', 'mossy_cobblestone_wall', 'stone_brick_wall', 'andesite_wall', 'deepslate_brick_wall'];
  for (const id of wallBlocks) registry.register({ id, kind: BlockShapeKinds.Wall, properties: wallProperties, canConnectFence: true, canConnectWall: true });

  const paneBlocks = ['glass_pane', 'white_stained_glass_pane', 'gray_stained_glass_pane', 'black_stained_glass_pane', 'iron_bars'];
  for (const id of paneBlocks) registry.register({ id, kind: BlockShapeKinds.Pane, properties: paneProperties, canConnectPane: true });

  registry.register({ id: 'minecraft:ladder', kind: BlockShapeKinds.Ladder, properties: ladderProperties });
  registry.register({ id: 'minecraft:lantern', kind: BlockShapeKinds.Lantern, properties: lanternProperties });
  registry.register({ id: 'minecraft:soul_lantern', kind: BlockShapeKinds.Lantern, properties: lanternProperties });
  registry.register({ id: 'minecraft:wall_torch', kind: BlockShapeKinds.Torch, properties: facingProperties });
  registry.register({ id: 'minecraft:torch', kind: BlockShapeKinds.Torch });

  registry.register({ id: 'minecraft:oak_log', kind: BlockShapeKinds.AxisBlock, properties: axisProperties, isSolidSupport: true, canAttachTo: true, canConnectFence: true, canConnectPane: true, canConnectWall: true });
  registry.register({ id: 'minecraft:spruce_log', kind: BlockShapeKinds.AxisBlock, properties: axisProperties, isSolidSupport: true, canAttachTo: true, canConnectFence: true, canConnectPane: true, canConnectWall: true });
}

function inferDefinitionFromBlockId(id: string): BlockDefinition | undefined {
  if (id === 'minecraft:air') {
    return { id, kind: BlockShapeKinds.FullBlock, isSolidSupport: false };
  }

  if (id.endsWith('_stairs')) return { id, kind: BlockShapeKinds.Stairs, properties: stairsProperties };
  if (id.endsWith('_slab')) return { id, kind: BlockShapeKinds.Slab, properties: slabProperties };
  if (id.endsWith('_trapdoor')) return { id, kind: BlockShapeKinds.Trapdoor, properties: trapdoorProperties };
  if (id.endsWith('_door')) return { id, kind: BlockShapeKinds.Door, properties: doorProperties };
  if (id.endsWith('_fence') && !id.endsWith('_fence_gate')) return { id, kind: BlockShapeKinds.Fence, properties: fenceProperties, canConnectFence: true, canConnectWall: true };
  if (id.endsWith('_wall')) return { id, kind: BlockShapeKinds.Wall, properties: wallProperties, canConnectFence: true, canConnectWall: true };
  if (id.endsWith('_pane') || id === 'minecraft:iron_bars') return { id, kind: BlockShapeKinds.Pane, properties: paneProperties, canConnectPane: true };
  if (id.endsWith('_log') || id.endsWith('_stem') || id.endsWith('_pillar')) return { id, kind: BlockShapeKinds.AxisBlock, properties: axisProperties, isSolidSupport: true, canAttachTo: true, canConnectFence: true, canConnectPane: true, canConnectWall: true };
  if (id.endsWith('_rail')) return { id, kind: BlockShapeKinds.Rail, unsupportedReason: 'Rail state resolution is intentionally deferred unless Milestone 3 optional rail pass is enabled.' };

  if (id.startsWith('minecraft:')) {
    return {
      id,
      kind: BlockShapeKinds.FullBlock,
      isSolidSupport: true,
      canAttachTo: true,
      canConnectFence: true,
      canConnectPane: true,
      canConnectWall: true,
    };
  }

  return undefined;
}
