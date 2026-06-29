import type {
  Axis,
  CardinalDirection,
  Half,
  SlabType,
  WallSideState,
} from './BlockDefinition';
import { buildBlockState } from './blockStateString';

export type StairShape = 'straight' | 'inner_left' | 'inner_right' | 'outer_left' | 'outer_right';
export type DoorHinge = 'left' | 'right';

export type StairStateOptions = {
  facing: CardinalDirection;
  half?: Half;
  shape?: StairShape;
  waterlogged?: boolean;
};

export type SlabStateOptions = {
  type?: SlabType;
  waterlogged?: boolean;
};

export type DoorStateOptions = {
  facing: CardinalDirection;
  half: 'upper' | 'lower';
  hinge?: DoorHinge;
  open?: boolean;
  powered?: boolean;
};

export type TrapdoorStateOptions = {
  facing: CardinalDirection;
  half?: Half;
  open?: boolean;
  powered?: boolean;
  waterlogged?: boolean;
};

export type FacingBlockStateOptions = {
  facing: CardinalDirection;
};

export type AxisBlockStateOptions = {
  axis: Axis;
};

export type FenceStateOptions = {
  north?: boolean;
  south?: boolean;
  east?: boolean;
  west?: boolean;
  waterlogged?: boolean;
};

export type WallStateOptions = {
  north?: WallSideState;
  south?: WallSideState;
  east?: WallSideState;
  west?: WallSideState;
  up?: boolean;
  waterlogged?: boolean;
};

export type PaneStateOptions = {
  north?: boolean;
  south?: boolean;
  east?: boolean;
  west?: boolean;
  waterlogged?: boolean;
};

export function stairState(blockId: string, options: StairStateOptions): string {
  return buildBlockState(blockId, {
    facing: options.facing,
    half: options.half ?? 'bottom',
    shape: options.shape ?? 'straight',
    waterlogged: options.waterlogged ?? false,
  });
}

export function slabState(blockId: string, options: SlabStateOptions = {}): string {
  return buildBlockState(blockId, {
    type: options.type ?? 'bottom',
    waterlogged: options.waterlogged ?? false,
  });
}

export function doorState(blockId: string, options: DoorStateOptions): string {
  return buildBlockState(blockId, {
    facing: options.facing,
    half: options.half,
    hinge: options.hinge ?? 'left',
    open: options.open ?? false,
    powered: options.powered ?? false,
  });
}

export function trapdoorState(blockId: string, options: TrapdoorStateOptions): string {
  return buildBlockState(blockId, {
    facing: options.facing,
    half: options.half ?? 'bottom',
    open: options.open ?? false,
    powered: options.powered ?? false,
    waterlogged: options.waterlogged ?? false,
  });
}

export function facingBlockState(blockId: string, options: FacingBlockStateOptions): string {
  return buildBlockState(blockId, { facing: options.facing });
}

export function axisBlockState(blockId: string, options: AxisBlockStateOptions): string {
  return buildBlockState(blockId, { axis: options.axis });
}

export function fenceState(blockId: string, options: FenceStateOptions = {}): string {
  return buildBlockState(blockId, {
    east: options.east ?? false,
    north: options.north ?? false,
    south: options.south ?? false,
    west: options.west ?? false,
    waterlogged: options.waterlogged ?? false,
  });
}

export function wallState(blockId: string, options: WallStateOptions = {}): string {
  return buildBlockState(blockId, {
    east: options.east ?? 'none',
    north: options.north ?? 'none',
    south: options.south ?? 'none',
    up: options.up ?? true,
    west: options.west ?? 'none',
    waterlogged: options.waterlogged ?? false,
  });
}

export function paneState(blockId: string, options: PaneStateOptions = {}): string {
  return buildBlockState(blockId, {
    east: options.east ?? false,
    north: options.north ?? false,
    south: options.south ?? false,
    west: options.west ?? false,
    waterlogged: options.waterlogged ?? false,
  });
}

export function ladderState(options: FacingBlockStateOptions & { waterlogged?: boolean }): string {
  return buildBlockState('minecraft:ladder', {
    facing: options.facing,
    waterlogged: options.waterlogged ?? false,
  });
}

export function lanternState(blockId = 'minecraft:lantern', options: { hanging?: boolean; waterlogged?: boolean } = {}): string {
  return buildBlockState(blockId, {
    hanging: options.hanging ?? false,
    waterlogged: options.waterlogged ?? false,
  });
}
