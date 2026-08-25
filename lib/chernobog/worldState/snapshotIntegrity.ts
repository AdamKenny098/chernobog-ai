import { createHash } from "node:crypto";

import {
  assertWorldStateRecord,
} from "./validation";
import {
  CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION,
  type WorldStateSnapshot,
} from "./snapshotTypes";
import type { WorldStateRecord } from "./types";

function requireIsoTimestamp(
  value: string,
  field: string,
): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${field} must be a valid timestamp.`);
  }
  return parsed.toISOString();
}

export function hashWorldStateRecords(
  records: readonly WorldStateRecord[],
): string {
  return createHash("sha256")
    .update(JSON.stringify(records))
    .digest("hex");
}

export function buildWorldStateSnapshot(
  records: readonly WorldStateRecord[],
  now = new Date(),
): WorldStateSnapshot {
  const cloned = structuredClone(records) as WorldStateRecord[];

  for (const record of cloned) {
    assertWorldStateRecord(record);
  }

  return {
    schemaVersion:
      CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION,
    createdAt: now.toISOString(),
    recordCount: cloned.length,
    recordsSha256: hashWorldStateRecords(cloned),
    records: cloned,
  };
}

export function assertWorldStateSnapshot(
  value: unknown,
): asserts value is WorldStateSnapshot {
  if (!value || typeof value !== "object") {
    throw new Error("worldState snapshot must be an object.");
  }

  const snapshot = value as Partial<WorldStateSnapshot>;

  if (
    snapshot.schemaVersion !==
    CHERNOBOG_WORLD_STATE_SNAPSHOT_SCHEMA_VERSION
  ) {
    throw new Error(
      "worldState snapshot has an unsupported schema version.",
    );
  }

  const createdAt = requireIsoTimestamp(
    String(snapshot.createdAt ?? ""),
    "worldState.snapshot.createdAt",
  );

  if (!Array.isArray(snapshot.records)) {
    throw new Error(
      "worldState snapshot records must be an array.",
    );
  }

  const recordCount = snapshot.recordCount;

  if (
    typeof recordCount !== "number" ||
    !Number.isInteger(recordCount) ||
    recordCount < 0 ||
    recordCount !== snapshot.records.length
  ) {
    throw new Error(
      "worldState snapshot recordCount does not match records.",
    );
  }

  if (
    typeof snapshot.recordsSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(snapshot.recordsSha256)
  ) {
    throw new Error(
      "worldState snapshot recordsSha256 must be a SHA-256 digest.",
    );
  }

  for (const record of snapshot.records) {
    assertWorldStateRecord(record);
  }

  const actualDigest = hashWorldStateRecords(
    snapshot.records,
  );

  if (actualDigest !== snapshot.recordsSha256) {
    throw new Error(
      "worldState snapshot integrity digest does not match records.",
    );
  }

  snapshot.createdAt = createdAt;
}

