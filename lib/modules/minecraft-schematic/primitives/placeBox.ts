import type { BlockGrid } from "../core/BlockGrid";
import type { BlockState, Bounds } from "../core/types";

export function placeBox(grid: BlockGrid, bounds: Bounds, state: BlockState) {
  grid.fillBox(bounds, state);
}