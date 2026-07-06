export type SchematicLibraryCommandKind =
  | "list_schematics"
  | "search_schematics"
  | "show_schematic"
  | "delete_schematic"
  | "duplicate_schematic";

export interface ListSchematicsLibraryCommand {
  kind: "list_schematics";
}

export interface SearchSchematicsLibraryCommand {
  kind: "search_schematics";
  query: string;
}

export interface ShowSchematicLibraryCommand {
  kind: "show_schematic";
  id: string;
}

export interface DeleteSchematicLibraryCommand {
  kind: "delete_schematic";
  id: string;
}

export interface DuplicateSchematicLibraryCommand {
  kind: "duplicate_schematic";
  id: string;
}

export type SchematicLibraryParsedCommand =
  | ListSchematicsLibraryCommand
  | SearchSchematicsLibraryCommand
  | ShowSchematicLibraryCommand
  | DeleteSchematicLibraryCommand
  | DuplicateSchematicLibraryCommand;

export interface SchematicLibraryCommandParseResult {
  matched: boolean;
  command?: SchematicLibraryParsedCommand;
  error?: string;
}