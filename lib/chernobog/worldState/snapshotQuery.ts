import {
  ChernobogWorldStateQueryService,
} from "./queryService";
import {
  ChernobogWorldStateRegistry,
} from "./registry";
import {
  JsonWorldStateSnapshotStore,
} from "./snapshotStore";
import type {
  PersistedWorldStateReadResult,
  WorldStateReadQuery,
} from "./queryTypes";

export interface QueryPersistedWorldStateOptions {
  query?: WorldStateReadQuery;
  store?: JsonWorldStateSnapshotStore;
  now?: () => Date;
}

export async function queryPersistedWorldState(
  options:
    QueryPersistedWorldStateOptions = {},
): Promise<PersistedWorldStateReadResult> {
  const store =
    options.store ??
    new JsonWorldStateSnapshotStore();

  const clock =
    options.now ??
    (() => new Date());

  const loaded =
    await store.load();

  if (
    loaded.status === "missing"
  ) {
    return {
      status: "missing",
      generatedAt:
        clock().toISOString(),
      snapshotPath:
        store.filePath,
    };
  }

  const registry =
    new ChernobogWorldStateRegistry(
      clock,
    );

  registry.replace(
    loaded.snapshot.records,
  );

  const service =
    new ChernobogWorldStateQueryService(
      registry,
      clock,
    );

  return {
    status: "loaded",
    generatedAt:
      clock().toISOString(),
    snapshotPath:
      store.filePath,
    snapshotCreatedAt:
      loaded.snapshot.createdAt,
    result:
      service.read(
        options.query,
        "snapshot",
      ),
    diagnostics:
      service.diagnostics(),
  };
}
