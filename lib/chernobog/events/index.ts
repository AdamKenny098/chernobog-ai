import { ChernobogEventBus } from "@chernobog/events/eventBus";
import { JsonlChernobogEventStore } from "@chernobog/events/store";


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

export * from "@chernobog/events/eventBus";
export * from "@chernobog/events/schema";
export * from "@chernobog/events/store";
export * from "@chernobog/events/types";
export * from "@chernobog/events/eventContext";
export * from "@chernobog/events/publishers";
export * from "@chernobog/events/retention";
export * from "@chernobog/events/replay";
export * from "@chernobog/events/diagnostics";