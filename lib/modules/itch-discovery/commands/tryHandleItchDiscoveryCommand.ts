import type Database from "better-sqlite3";

import type { ItchDiscoveryCommandResult } from "../types";
import { executeItchDiscoveryCommand } from "./executeItchDiscoveryCommand";
import { parseItchDiscoveryCommand } from "./parseItchDiscoveryCommand";

export async function tryHandleItchDiscoveryCommand(
  message: string,
  database?: Database.Database,
): Promise<ItchDiscoveryCommandResult> {
  const command = parseItchDiscoveryCommand(message);
  if (!command) {
    return {
      handled: false,
      ok: false,
      message: "The message is not a Game Radar command.",
    };
  }
  return executeItchDiscoveryCommand(command, database);
}
