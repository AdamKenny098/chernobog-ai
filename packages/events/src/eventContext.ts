import { AsyncLocalStorage } from "node:async_hooks";

export interface ChernobogEventContext {
  correlationId?: string;
  causationId?: string;
  subject?: string;
  scope?: string;
  tags?: string[];
}

const eventContextStorage = new AsyncLocalStorage<ChernobogEventContext>();

export function getChernobogEventContext():
  | ChernobogEventContext
  | undefined {
  return eventContextStorage.getStore();
}

export function runWithChernobogEventContext<T>(
  context: ChernobogEventContext,
  callback: () => T
): T {
  const parent = eventContextStorage.getStore();

  const tags = [
    ...new Set([
      ...(parent?.tags ?? []),
      ...(context.tags ?? []),
    ]),
  ];

  return eventContextStorage.run(
    {
      ...parent,
      ...context,
      tags: tags.length > 0 ? tags : undefined,
    },
    callback
  );
}