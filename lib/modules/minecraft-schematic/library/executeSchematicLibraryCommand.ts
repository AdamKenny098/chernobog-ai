import {
    deleteSchematicAsset,
    duplicateSchematicAsset,
    getSchematicEntry,
    listSchematicEntries,
    searchSchematicEntries,
  } from "./schematicLibraryStore";
  import { SchematicLibraryEntry } from "./schematicLibraryTypes";
  
  export interface SchematicLibraryExecutorCommand {
    kind: "schematic-library";
    action:
      | "list_schematics"
      | "search_schematics"
      | "show_schematic"
      | "delete_schematic"
      | "duplicate_schematic";
    raw: string;
    query?: string;
    id?: string;
  }
  
  export interface SchematicLibraryExecutorErrorCommand {
    kind: "schematic-library-error";
    raw: string;
    reason: string;
  }
  
  export type SchematicLibraryExecutableCommand =
    | SchematicLibraryExecutorCommand
    | SchematicLibraryExecutorErrorCommand;
  
  export interface SchematicLibraryExecutionResult {
    ok: boolean;
    title: string;
    message: string;
    data?: unknown;
  }
  
  function formatEntryLine(entry: SchematicLibraryEntry): string {
    const metadata = entry.metadata;
    const size = `${metadata.size.width}x${metadata.size.height}x${metadata.size.length}`;
    const tags = metadata.tags.length > 0 ? metadata.tags.join(", ") : "none";
  
    return [
      `- ${metadata.name}`,
      `  id: ${metadata.id}`,
      `  category: ${metadata.category}`,
      `  theme: ${metadata.theme}`,
      `  version: ${metadata.targetMinecraftVersion}`,
      `  size: ${size}`,
      `  blocks: ${metadata.blockCount}`,
      `  asset: ${entry.assetKind}`,
      `  tags: ${tags}`,
    ].join("\n");
  }
  
  function formatEntryDetail(entry: SchematicLibraryEntry): string {
    const metadata = entry.metadata;
    const size = `${metadata.size.width}x${metadata.size.height}x${metadata.size.length}`;
  
    return [
      `Schematic: ${metadata.name}`,
      "",
      `id: ${metadata.id}`,
      `category: ${metadata.category}`,
      `theme: ${metadata.theme}`,
      `targetMinecraftVersion: ${metadata.targetMinecraftVersion}`,
      `requiredMods: ${
        metadata.requiredMods.length > 0 ? metadata.requiredMods.join(", ") : "none"
      }`,
      `size: ${size}`,
      `blockCount: ${metadata.blockCount}`,
      `tags: ${metadata.tags.length > 0 ? metadata.tags.join(", ") : "none"}`,
      `generatorSource: ${metadata.generatorSource}`,
      `createdAt: ${metadata.createdAt}`,
      `updatedAt: ${metadata.updatedAt}`,
      `parentId: ${metadata.parentId ?? "none"}`,
      `revision: ${metadata.revision ?? "none"}`,
      `assetKind: ${entry.assetKind}`,
      `assetPath: ${entry.assetPath ?? "none"}`,
      `directoryPath: ${entry.directoryPath}`,
      `metadataPath: ${entry.metadataPath}`,
      "",
      `notes: ${metadata.notes ?? "none"}`,
    ].join("\n");
  }
  
  function formatWarnings(
    warnings: Array<{ id: string; path: string; reason: string }>,
  ): string {
    if (warnings.length === 0) {
      return "";
    }
  
    return [
      "",
      "Warnings:",
      ...warnings.map((warning) => {
        return `- ${warning.id}: ${warning.reason} (${warning.path})`;
      }),
    ].join("\n");
  }
  
  function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
  
    return "Unknown schematic library error.";
  }
  
  export async function executeSchematicLibraryCommand(
    command: SchematicLibraryExecutableCommand,
  ): Promise<SchematicLibraryExecutionResult> {
    if (command.kind === "schematic-library-error") {
      return {
        ok: false,
        title: "Schematic library command error",
        message: command.reason,
      };
    }
  
    try {
      if (command.action === "list_schematics") {
        const result = await listSchematicEntries();
  
        if (result.entries.length === 0) {
          return {
            ok: true,
            title: "Schematic library",
            message:
              result.warnings.length > 0
                ? `No valid schematics found.${formatWarnings(result.warnings)}`
                : "No generated schematics found yet.",
            data: result,
          };
        }
  
        return {
          ok: true,
          title: "Schematic library",
          message: [
            `Found ${result.entries.length} schematic(s).`,
            "",
            ...result.entries.map(formatEntryLine),
            formatWarnings(result.warnings),
          ]
            .filter(Boolean)
            .join("\n"),
          data: result,
        };
      }
  
      if (command.action === "search_schematics") {
        const query = command.query?.trim() ?? "";
  
        if (query.length === 0) {
          return {
            ok: false,
            title: "Schematic search failed",
            message: "Search query is empty. Try: search schematics factory",
          };
        }
  
        const result = await searchSchematicEntries({
          query,
        });
  
        if (result.entries.length === 0) {
          return {
            ok: true,
            title: "Schematic search",
            message: `No schematics matched "${query}".${formatWarnings(
              result.warnings,
            )}`,
            data: result,
          };
        }
  
        return {
          ok: true,
          title: "Schematic search",
          message: [
            `Found ${result.entries.length} schematic(s) matching "${query}".`,
            "",
            ...result.entries.map(formatEntryLine),
            formatWarnings(result.warnings),
          ]
            .filter(Boolean)
            .join("\n"),
          data: result,
        };
      }
  
      if (command.action === "show_schematic") {
        const id = command.id?.trim() ?? "";
  
        if (id.length === 0) {
          return {
            ok: false,
            title: "Show schematic failed",
            message: "Missing schematic id. Try: show schematic <id>",
          };
        }
  
        const entry = await getSchematicEntry(id);
  
        return {
          ok: true,
          title: `Schematic: ${entry.metadata.name}`,
          message: formatEntryDetail(entry),
          data: entry,
        };
      }
  
      if (command.action === "delete_schematic") {
        const id = command.id?.trim() ?? "";
  
        if (id.length === 0) {
          return {
            ok: false,
            title: "Delete schematic failed",
            message: "Missing schematic id. Try: delete schematic <id>",
          };
        }
  
        const deleted = await deleteSchematicAsset(id);
  
        return {
          ok: true,
          title: "Schematic deleted",
          message: deleted
            ? `Deleted schematic "${id}".`
            : `Schematic "${id}" did not exist.`,
          data: {
            id,
            deleted,
          },
        };
      }
  
      if (command.action === "duplicate_schematic") {
        const id = command.id?.trim() ?? "";
  
        if (id.length === 0) {
          return {
            ok: false,
            title: "Duplicate schematic failed",
            message: "Missing schematic id. Try: duplicate schematic <id>",
          };
        }
  
        const duplicated = await duplicateSchematicAsset({
          sourceId: id,
        });
  
        return {
          ok: true,
          title: "Schematic duplicated",
          message: [
            `Duplicated schematic "${id}".`,
            "",
            `New schematic: ${duplicated.metadata.name}`,
            `New id: ${duplicated.id}`,
            `Parent id: ${duplicated.metadata.parentId ?? "none"}`,
            `Revision: ${duplicated.metadata.revision ?? "none"}`,
          ].join("\n"),
          data: duplicated,
        };
      }
  
      return {
        ok: false,
        title: "Unknown schematic library command",
        message: `Unsupported schematic library action: ${command.action}`,
      };
    } catch (error: unknown) {
      return {
        ok: false,
        title: "Schematic library failed",
        message: getErrorMessage(error),
      };
    }
  }