import type { BlockGrid } from "../core/BlockGrid";
import type { BlockState, Direction } from "../core/types";

export function placeWall(
  grid: BlockGrid,
  options: {
    direction: Extract<Direction, "north" | "south" | "east" | "west">;
    originX: number;
    originY: number;
    originZ: number;
    length: number;
    height: number;
    state: BlockState;
  }
) {
  for (let heightOffset = 0; heightOffset < options.height; heightOffset += 1) {
    for (let lengthOffset = 0; lengthOffset < options.length; lengthOffset += 1) {
      if (options.direction === "north" || options.direction === "south") {
        grid.setBlock(
          {
            x: options.originX + lengthOffset,
            y: options.originY + heightOffset,
            z: options.originZ,
          },
          options.state
        );
      } else {
        grid.setBlock(
          {
            x: options.originX,
            y: options.originY + heightOffset,
            z: options.originZ + lengthOffset,
          },
          options.state
        );
      }
    }
  }
}