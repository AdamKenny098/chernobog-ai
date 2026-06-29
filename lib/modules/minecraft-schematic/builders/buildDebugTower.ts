import { BlockGrid } from "../core/BlockGrid";
import {
  cutDoor,
  cutWindow,
  placeFloor,
  placeHollowBox,
  placePillar,
} from "../primitives";
import type { BlockState } from "../core/types";

const STONE_BRICKS: BlockState = {
  id: "minecraft:stone_bricks",
};

const COBBLESTONE: BlockState = {
  id: "minecraft:cobblestone",
};

const OAK_PLANKS: BlockState = {
  id: "minecraft:oak_planks",
};

export function buildDebugTower() {
  const grid = new BlockGrid("debug-stone-tower");

  placeHollowBox(
    grid,
    {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 10, y: 15, z: 10 },
    },
    STONE_BRICKS
  );

  placeFloor(grid, {
    y: 0,
    minX: 1,
    maxX: 9,
    minZ: 1,
    maxZ: 9,
    state: OAK_PLANKS,
  });

  placeFloor(grid, {
    y: 5,
    minX: 1,
    maxX: 9,
    minZ: 1,
    maxZ: 9,
    state: OAK_PLANKS,
  });

  placeFloor(grid, {
    y: 10,
    minX: 1,
    maxX: 9,
    minZ: 1,
    maxZ: 9,
    state: OAK_PLANKS,
  });

  placePillar(grid, {
    base: { x: 0, y: 0, z: 0 },
    height: 18,
    state: COBBLESTONE,
  });

  placePillar(grid, {
    base: { x: 10, y: 0, z: 0 },
    height: 18,
    state: COBBLESTONE,
  });

  placePillar(grid, {
    base: { x: 0, y: 0, z: 10 },
    height: 18,
    state: COBBLESTONE,
  });

  placePillar(grid, {
    base: { x: 10, y: 0, z: 10 },
    height: 18,
    state: COBBLESTONE,
  });

  for (let x = 0; x <= 10; x += 2) {
    grid.setBlock({ x, y: 16, z: 0 }, COBBLESTONE);
    grid.setBlock({ x, y: 16, z: 10 }, COBBLESTONE);
  }

  for (let z = 0; z <= 10; z += 2) {
    grid.setBlock({ x: 0, y: 16, z }, COBBLESTONE);
    grid.setBlock({ x: 10, y: 16, z }, COBBLESTONE);
  }

  cutDoor(grid, {
    direction: "south",
    base: { x: 4, y: 1, z: 10 },
    width: 3,
    height: 4,
  });

  cutWindow(grid, {
    direction: "north",
    base: { x: 4, y: 7, z: 0 },
    width: 3,
    height: 2,
  });

  cutWindow(grid, {
    direction: "south",
    base: { x: 4, y: 7, z: 10 },
    width: 3,
    height: 2,
  });

  cutWindow(grid, {
    direction: "east",
    base: { x: 10, y: 7, z: 4 },
    width: 3,
    height: 2,
  });

  cutWindow(grid, {
    direction: "west",
    base: { x: 0, y: 7, z: 4 },
    width: 3,
    height: 2,
  });

  cutWindow(grid, {
    direction: "north",
    base: { x: 4, y: 12, z: 0 },
    width: 3,
    height: 2,
  });

  cutWindow(grid, {
    direction: "south",
    base: { x: 4, y: 12, z: 10 },
    width: 3,
    height: 2,
  });

  return grid;
}