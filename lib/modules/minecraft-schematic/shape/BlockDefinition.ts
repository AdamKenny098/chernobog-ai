import type { BlockShapeKind } from './BlockShapeKind';

export type CardinalDirection = 'north' | 'south' | 'east' | 'west';
export type Axis = 'x' | 'y' | 'z';
export type Half = 'top' | 'bottom';
export type DoorHalf = 'upper' | 'lower';
export type SlabType = 'top' | 'bottom' | 'double';
export type WallSideState = 'none' | 'low' | 'tall';
export type RailShape =
  | 'north_south'
  | 'east_west'
  | 'ascending_east'
  | 'ascending_west'
  | 'ascending_north'
  | 'ascending_south'
  | 'south_east'
  | 'south_west'
  | 'north_west'
  | 'north_east';

export type BlockStateValue = string | boolean | number;
export type BlockStateProperties = Record<string, BlockStateValue>;

export type StatePropertyRule = {
  required?: boolean;
  values: readonly BlockStateValue[];
  defaultValue?: BlockStateValue;
};

export type BlockDefinition = {
  id: string;
  kind: BlockShapeKind;
  aliases?: readonly string[];
  isSolidSupport?: boolean;
  canAttachTo?: boolean;
  canConnectFence?: boolean;
  canConnectPane?: boolean;
  canConnectWall?: boolean;
  unsupportedReason?: string;
  properties?: Record<string, StatePropertyRule>;
};

export type ParsedBlockState = {
  id: string;
  properties: BlockStateProperties;
  raw: string;
};
