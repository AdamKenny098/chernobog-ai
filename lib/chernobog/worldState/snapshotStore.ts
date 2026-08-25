import {
  mkdir,
  readFile,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import {
  assertWorldStateSnapshot,
} from "./snapshotIntegrity";
import type {
  WorldStateSnapshot,
  WorldStateSnapshotLoadResult,
} from "./snapshotTypes";

export class WorldStateSnapshotCorruptionError extends Error {
  readonly originalCause?: unknown;

  constructor(
    message: string,
    originalCause?: unknown,
  ) {
    super(message);
    this.name = "WorldStateSnapshotCorruptionError";
    this.originalCause = originalCause;
  }
}

export interface JsonWorldStateSnapshotStoreOptions {
  filePath?: string;
  quarantineDirectory?: string;
}

function defaultSnapshotPath(): string {
  return path.join(
    process.cwd(),
    "data",
    "chernobog",
    "world-state",
    "current.json",
  );
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

function safeTimestamp(value: Date): string {
  return value
    .toISOString()
    .replace(/[:.]/g, "-");
}

export class JsonWorldStateSnapshotStore {
  readonly filePath: string;
  readonly quarantineDirectory: string;

  constructor(
    options: JsonWorldStateSnapshotStoreOptions = {},
  ) {
    this.filePath =
      options.filePath ?? defaultSnapshotPath();

    this.quarantineDirectory =
      options.quarantineDirectory ??
      path.join(
        path.dirname(this.filePath),
        "quarantine",
      );
  }

  async load(): Promise<WorldStateSnapshotLoadResult> {
    let raw: string;

    try {
      raw = await readFile(
        this.filePath,
        "utf8",
      );
    } catch (error) {
      if (isMissingFileError(error)) {
        return {
          status: "missing",
        };
      }
      throw error;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
      assertWorldStateSnapshot(parsed);
    } catch (error) {
      throw new WorldStateSnapshotCorruptionError(
        `World State snapshot is corrupt: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
        error,
      );
    }

    return {
      status: "loaded",
      snapshot: parsed,
    };
  }

  async save(
    snapshot: WorldStateSnapshot,
  ): Promise<void> {
    assertWorldStateSnapshot(snapshot);

    const directory =
      path.dirname(this.filePath);

    await mkdir(directory, {
      recursive: true,
    });

    const temporaryPath =
      `${this.filePath}.tmp-${process.pid}-${Date.now()}`;

    const body =
      `${JSON.stringify(snapshot, null, 2)}\n`;

    try {
      await writeFile(
        temporaryPath,
        body,
        "utf8",
      );

      await rename(
        temporaryPath,
        this.filePath,
      );
    } catch (error) {
      try {
        const {
          rm,
        } = await import("node:fs/promises");

        await rm(
          temporaryPath,
          {
            force: true,
          },
        );
      } catch {
        // Best-effort temporary-file cleanup only.
      }

      throw error;
    }
  }

  async quarantineCorruptSnapshot(
    now = new Date(),
  ): Promise<string | undefined> {
    await mkdir(
      this.quarantineDirectory,
      {
        recursive: true,
      },
    );

    const target = path.join(
      this.quarantineDirectory,
      `world-state-corrupt-${safeTimestamp(now)}.json`,
    );

    try {
      await rename(
        this.filePath,
        target,
      );
      return target;
    } catch (error) {
      if (isMissingFileError(error)) {
        return undefined;
      }
      throw error;
    }
  }
}
