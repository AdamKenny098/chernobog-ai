import type { BlockGrid } from "../core/BlockGrid";
import type { Direction, Vec3 } from "../core/types";

export function cutWindow(
  grid: BlockGrid,
  options: {
    direction: Extract<Direction, "north" | "south" | "east" | "west">;
    base: Vec3;
    width: number;
    height: number;
  }
) {
  if (options.direction === "north" || options.direction === "south") {
    grid.clearBox({
      min: {
        x: options.base.x,
        y: options.base.y,
        z: options.base.z,
      },
      max: {
        x: options.base.x + options.width - 1,
        y: options.base.y + options.height - 1,
        z: options.base.z,
      },
    });

    return;
  }

  grid.clearBox({
    min: {
      x: options.base.x,
      y: options.base.y,
      z: options.base.z,
    },
    max: {
      x: options.base.x,
      y: options.base.y + options.height - 1,
      z: options.base.z + options.width - 1,
    },
  });
}