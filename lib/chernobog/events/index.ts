import { ChernobogEventBus } from "./eventBus";
import { JsonlChernobogEventStore } from "./store";


const eventGlobals = globalThis as typeof globalThis & {
  __chernobogEventBus?: ChernobogEventBus;
};

export function getChernobogEventBus(): ChernobogEventBus {
  if (!eventGlobals.__chernobogEventBus) {
    eventGlobals.__chernobogEventBus = new ChernobogEventBus({
      store: new JsonlChernobogEventStore(),
    });
  }

  return eventGlobals.__chernobogEventBus;
}

export * from "./eventBus";
export * from "./schema";
export * from "./store";
export * from "./types";
export * from "./eventContext";
export * from "./publishers";
export * from "./retention";
export * from "./replay";
export * from "./diagnostics";