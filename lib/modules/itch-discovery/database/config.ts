import fs from "node:fs";
import path from "node:path";

const DEFAULT_DATABASE_RELATIVE_PATH = path.join(
  "data",
  "chernobog-game-radar.sqlite",
);

export function resolveItchDiscoveryDatabasePath(
  overridePath?: string,
): string {
  const configuredPath =
    overridePath ??
    process.env.CHERNOBOG_GAME_RADAR_DB_PATH ??
    DEFAULT_DATABASE_RELATIVE_PATH;

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
}

export function ensureItchDiscoveryDatabaseDirectory(
  databasePath: string,
): void {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}
