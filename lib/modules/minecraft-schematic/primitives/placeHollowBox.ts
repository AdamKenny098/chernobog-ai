import type { BlockGrid } from "../core/BlockGrid";
import type { BlockState, Bounds } from "../core/types";

export function placeHollowBox(
  grid: BlockGrid,
  bounds: Bounds,
  state: BlockState
) {
  const min = {
    x: Math.min(bounds.min.x, bounds.max.x),
    y: Math.min(bounds.min.y, bounds.max.y),
    z: Math.min(bounds.min.z, bounds.max.z),
  };

  const max = {
    x: Math.max(bounds.min.x, bounds.max.x),
    y: Math.max(bounds.min.y, bounds.max.y),
    z: Math.max(bounds.min.z, bounds.max.z),
  };

  for (let x = min.x; x <= max.x; x += 1) {
    for (let y = min.y; y <= max.y; y += 1) {
      for (let z = min.z; z <= max.z; z += 1) {
        const isShell =
          x === min.x ||
          x === max.x ||
          y === min.y ||
          y === max.y ||
          z === min.z ||
          z === max.z;

        if (isShell) {
          grid.setBlock({ x, y, z }, state);
        }
      }
    }
  }
}