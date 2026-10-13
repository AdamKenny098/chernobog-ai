/** Stable event envelope shared by event producers and consumers. */
export interface EventEnvelope<TPayload = unknown> {
  id?: string;
  type: string;
  payload: TPayload;
  source?: string;
  subject?: string;
  occurredAt?: string;
  correlationId?: string;
  causationId?: string;
  tags?: readonly string[];
  metadata?: Readonly<Record<string, unknown>>;
}

/** Public event publication contract. */
export interface EventPublisher {
  publish<TPayload = unknown>(
    event: EventEnvelope<TPayload>,
  ): Promise<unknown>;
}

/** Public event subscription contract. */
export interface EventSubscriber {
  subscribe<TPayload = unknown>(
    handler: (event: EventEnvelope<TPayload>) => void | Promise<void>,
    filter?: Readonly<Record<string, unknown>>,
  ): () => void;
}
