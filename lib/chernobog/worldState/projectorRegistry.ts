import type { ChernobogEvent } from "../events/types";
import type { WorldStateProjector } from "./projectorTypes";

function normalizeProjectorId(value: string): string {
  const id = value.trim();
  if (!id) {
    throw new Error("worldState projector id must not be empty.");
  }
  return id;
}

function matchesProjector(
  projector: WorldStateProjector,
  event: ChernobogEvent,
): boolean {
  const exact = projector.eventTypes;
  const prefixes = projector.eventTypePrefixes;

  if ((!exact || exact.length === 0) && (!prefixes || prefixes.length === 0)) {
    return true;
  }

  if (exact?.includes(event.type)) {
    return true;
  }

  if (prefixes?.some((prefix) => event.type.startsWith(prefix))) {
    return true;
  }

  return false;
}

export class ChernobogWorldStateProjectorRegistry {
  private readonly projectors = new Map<string, WorldStateProjector>();

  register(projector: WorldStateProjector): () => void {
    const id = normalizeProjectorId(projector.id);

    if (this.projectors.has(id)) {
      throw new Error(`worldState projector "${id}" is already registered.`);
    }

    const stored: WorldStateProjector = {
      ...projector,
      id,
      eventTypes: projector.eventTypes
        ? [...projector.eventTypes]
        : undefined,
      eventTypePrefixes: projector.eventTypePrefixes
        ? [...projector.eventTypePrefixes]
        : undefined,
    };

    this.projectors.set(id, stored);

    return () => {
      this.projectors.delete(id);
    };
  }

  get size(): number {
    return this.projectors.size;
  }

  list(): WorldStateProjector[] {
    return [...this.projectors.values()].sort((left, right) =>
      left.id.localeCompare(right.id),
    );
  }

  matching(event: ChernobogEvent): WorldStateProjector[] {
    return this.list().filter((projector) => matchesProjector(projector, event));
  }

  clear(): void {
    this.projectors.clear();
  }
}
