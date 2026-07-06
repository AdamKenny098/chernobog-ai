import { SchematicLibraryCommandParseResult, SchematicLibraryParsedCommand } from "./schematicCommandTypes";
  
  function normalizeInput(input: string): string {
    return input.trim().replace(/\s+/g, " ");
  }
  
  function normalizeId(input: string): string {
    return input.trim();
  }
  
  function hasValidIdShape(id: string): boolean {
    return /^[a-z0-9][a-z0-9-_]{1,96}$/.test(id);
  }
  
  function command(
    parsedCommand: SchematicLibraryParsedCommand,
  ): SchematicLibraryCommandParseResult {
    return {
      matched: true,
      command: parsedCommand,
    };
  }
  
  function error(message: string): SchematicLibraryCommandParseResult {
    return {
      matched: true,
      error: message,
    };
  }
  
  export function parseSchematicLibraryCommand(
    input: string,
  ): SchematicLibraryCommandParseResult {
    const normalized = normalizeInput(input);
    const lower = normalized.toLowerCase();
  
    if (
      lower === "list schematics" ||
      lower === "show schematics" ||
      lower === "schematics" ||
      lower === "schematic library" ||
      lower === "open schematic library"
    ) {
      return command({
        kind: "list_schematics",
      });
    }
  
    const searchMatch = normalized.match(/^search\s+schematics\s+(.+)$/i);
  
    if (searchMatch) {
      const query = searchMatch[1]?.trim() ?? "";
  
      if (query.length === 0) {
        return error("Search query is empty. Try: search schematics factory");
      }
  
      return command({
        kind: "search_schematics",
        query,
      });
    }
  
    const showMatch = normalized.match(/^show\s+schematic\s+(.+)$/i);
  
    if (showMatch) {
      const id = normalizeId(showMatch[1] ?? "");
  
      if (!hasValidIdShape(id)) {
        return error(
          `Invalid schematic id "${id}". Use the id shown by list schematics.`,
        );
      }
  
      return command({
        kind: "show_schematic",
        id,
      });
    }
  
    const inspectMatch = normalized.match(/^inspect\s+schematic\s+(.+)$/i);
  
    if (inspectMatch) {
      const id = normalizeId(inspectMatch[1] ?? "");
  
      if (!hasValidIdShape(id)) {
        return error(
          `Invalid schematic id "${id}". Use the id shown by list schematics.`,
        );
      }
  
      return command({
        kind: "show_schematic",
        id,
      });
    }
  
    const deleteMatch = normalized.match(/^delete\s+schematic\s+(.+)$/i);
  
    if (deleteMatch) {
      const id = normalizeId(deleteMatch[1] ?? "");
  
      if (!hasValidIdShape(id)) {
        return error(
          `Invalid schematic id "${id}". Use the id shown by list schematics.`,
        );
      }
  
      return command({
        kind: "delete_schematic",
        id,
      });
    }
  
    const duplicateMatch = normalized.match(/^duplicate\s+schematic\s+(.+)$/i);
  
    if (duplicateMatch) {
      const id = normalizeId(duplicateMatch[1] ?? "");
  
      if (!hasValidIdShape(id)) {
        return error(
          `Invalid schematic id "${id}". Use the id shown by list schematics.`,
        );
      }
  
      return command({
        kind: "duplicate_schematic",
        id,
      });
    }
  
    return {
      matched: false,
    };
  }