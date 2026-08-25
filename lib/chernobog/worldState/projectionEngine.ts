import type {
  ChernobogEvent,
  ChernobogEventHandler,
} from "../events/types";
import type { ChernobogEventBus } from "../events/eventBus";
import {
  buildWorldStateInputFromEvent,
} from "./eventProjection";
import {
  ChernobogWorldStateProjectorRegistry,
} from "./projectorRegistry";
import type {
  WorldStateProjection,
  WorldStateProjectionResult,
  WorldStateProjector,
} from "./projectorTypes";
import {
  ChernobogWorldStateRegistry,
} from "./registry";

function normalizeProjectionOutput(
  output:
    | WorldStateProjection
    | readonly WorldStateProjection[]
    | undefined,
): readonly WorldStateProjection[] {
  if (!output) {
    return [];
  }

  if (Array.isArray(output)) {
    return output as readonly WorldStateProjection[];
  }

  return [output as WorldStateProjection];
}

export interface ChernobogWorldStateProjectionEngineOptions {
  worldState?: ChernobogWorldStateRegistry;
  projectors?: ChernobogWorldStateProjectorRegistry;
}

export class ChernobogWorldStateProjectionEngine {
  readonly worldState: ChernobogWorldStateRegistry;
  readonly projectors: ChernobogWorldStateProjectorRegistry;

  constructor(
    options:
      ChernobogWorldStateProjectionEngineOptions = {},
  ) {
    this.worldState =
      options.worldState ??
      new ChernobogWorldStateRegistry();

    this.projectors =
      options.projectors ??
      new ChernobogWorldStateProjectorRegistry();
  }

  register(
    projector: WorldStateProjector,
  ): () => void {
    return this.projectors.register(projector);
  }

  process(
    event: ChernobogEvent,
  ): WorldStateProjectionResult {
    const matching =
      this.projectors.matching(event);

    let emittedProjections = 0;
    let appliedProjections = 0;
    let ignoredProjections = 0;

    for (const projector of matching) {
      const projections =
        normalizeProjectionOutput(
          projector.project(event),
        );

      emittedProjections +=
        projections.length;

      for (const projection of projections) {
        const input =
          buildWorldStateInputFromEvent(
            event,
            projection,
            projector.id,
          );

        const result =
          this.worldState.upsert(input);

        if (result.applied) {
          appliedProjections += 1;
        } else {
          ignoredProjections += 1;
        }
      }
    }

    return {
      eventId: event.id,
      eventType: event.type,
      matchedProjectors:
        matching.length,
      emittedProjections,
      appliedProjections,
      ignoredProjections,
      projectorIds: matching.map(
        (projector) => projector.id,
      ),
    };
  }

  createEventHandler(): ChernobogEventHandler {
    return (event) => {
      this.process(event);
    };
  }

  attach(
    eventBus: Pick<
      ChernobogEventBus,
      "subscribe"
    >,
  ): () => void {
    return eventBus.subscribe(
      {},
      this.createEventHandler(),
    );
  }

  async rebuildFromEventHistory(
    eventBus: Pick<
      ChernobogEventBus,
      "replay"
    >,
  ): Promise<{
    replayedEvents: number;
    failedEvents: number;
    stateRecords: number;
  }> {
    this.worldState.clear();

    const replay =
      await eventBus.replay(
        (event) => {
          this.process(event);
        },
      );

    return {
      replayedEvents:
        replay.replayedEvents,
      failedEvents:
        replay.failedEvents,
      stateRecords:
        this.worldState.size,
    };
  }
}
