import type { CardinalDirection } from './BlockDefinition';

export const CARDINAL_DIRECTIONS = ['north', 'south', 'east', 'west'] as const satisfies readonly CardinalDirection[];

export type DirectionOffset = { dx: number; dy: number; dz: number };

export const DIRECTION_OFFSETS: Record<CardinalDirection, DirectionOffset> = {
  north: { dx: 0, dy: 0, dz: -1 },
  south: { dx: 0, dy: 0, dz: 1 },
  east: { dx: 1, dy: 0, dz: 0 },
  west: { dx: -1, dy: 0, dz: 0 },
};

export const OPPOSITE_DIRECTION: Record<CardinalDirection, CardinalDirection> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
};

export function offsetForDirection(direction: CardinalDirection): DirectionOffset {
  return DIRECTION_OFFSETS[direction];
}

export function oppositeDirection(direction: CardinalDirection): CardinalDirection {
  return OPPOSITE_DIRECTION[direction];
}

export function isCardinalDirection(value: unknown): value is CardinalDirection {
  return value === 'north' || value === 'south' || value === 'east' || value === 'west';
}
