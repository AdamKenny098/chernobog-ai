import type { BlockGrid } from "../core/BlockGrid";
import type { BlockState } from "../core/types";

export function placeFloor(
  grid: BlockGrid,
  options: {
    y: number;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    state: BlockState;
  }
) {
  grid.fillBox(
    {
      min: {
        x: options.minX,
        y: options.y,
        z: options.minZ,
      },
      max: {
        x: options.maxX,
        y: options.y,
        z: options.maxZ,
      },
    },
    options.state
  );
}