import type { BlockGrid } from "../core/BlockGrid";
import type { BlockState, Vec3 } from "../core/types";

export function placePillar(
  grid: BlockGrid,
  options: {
    base: Vec3;
    height: number;
    state: BlockState;
  }
) {
  for (let yOffset = 0; yOffset < options.height; yOffset += 1) {
    grid.setBlock(
      {
        x: options.base.x,
        y: options.base.y + yOffset,
        z: options.base.z,
      },
      options.state
    );
  }
}