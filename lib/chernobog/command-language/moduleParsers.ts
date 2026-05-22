import type { UnifiedCommand } from "./types";
import { parseRegisteredModuleCommand } from "@/lib/modules/registry";

export type ModuleCommandParser = (message: string) => UnifiedCommand | null;

export const moduleCommandParsers: ModuleCommandParser[] = [
  parseRegisteredModuleCommand,
];

export function parseModuleCommand(message: string): UnifiedCommand | null {
  return parseRegisteredModuleCommand(message);
}