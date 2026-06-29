export type BlockShapeKind =
  | 'full_block'
  | 'stairs'
  | 'slab'
  | 'door'
  | 'trapdoor'
  | 'facing_block'
  | 'axis_block'
  | 'fence'
  | 'wall'
  | 'pane'
  | 'ladder'
  | 'lantern'
  | 'torch'
  | 'rail'
  | 'unsupported_complex';

export const BlockShapeKinds = {
  FullBlock: 'full_block',
  Stairs: 'stairs',
  Slab: 'slab',
  Door: 'door',
  Trapdoor: 'trapdoor',
  FacingBlock: 'facing_block',
  AxisBlock: 'axis_block',
  Fence: 'fence',
  Wall: 'wall',
  Pane: 'pane',
  Ladder: 'ladder',
  Lantern: 'lantern',
  Torch: 'torch',
  Rail: 'rail',
  UnsupportedComplex: 'unsupported_complex',
} as const satisfies Record<string, BlockShapeKind>;
