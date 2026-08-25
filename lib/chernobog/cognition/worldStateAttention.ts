import type { WorldStateRecord } from "../worldState";
import { ChernobogAttentionQueue } from "./attentionQueue";
import { assessWorldStateSalience } from "./salience";
import type {
  CognitiveAttentionSignal,
  CognitiveSaliencePolicy,
} from "./types";

export interface ChernobogWorldStateAttentionOptions {
  queue?: ChernobogAttentionQueue;
  policy?: CognitiveSaliencePolicy;
  clock?: () => Date;
}

export class ChernobogWorldStateAttention {
  readonly queue: ChernobogAttentionQueue;
  private readonly policy?: CognitiveSaliencePolicy;
  private readonly clock: () => Date;

  constructor(options: ChernobogWorldStateAttentionOptions = {}) {
    this.queue = options.queue ?? new ChernobogAttentionQueue();
    this.policy = options.policy;
    this.clock = options.clock ?? (() => new Date());
  }

  observe(
    current: WorldStateRecord,
    previous?: WorldStateRecord,
  ): CognitiveAttentionSignal {
    const signal = assessWorldStateSalience(
      { previous, current },
      { now: this.clock(), policy: this.policy },
    );
    this.queue.upsert(signal);
    return signal;
  }
}
