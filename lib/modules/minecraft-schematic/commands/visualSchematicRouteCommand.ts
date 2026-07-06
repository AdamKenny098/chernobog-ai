import { readVisualSchematicSummaries } from "../visual-library/readVisualSchematicLibrary";

export type VisualSchematicRouteIntent =
  | "open-library"
  | "open-latest"
  | "open-detail";

export type VisualSchematicRouteCommand = {
  intent: VisualSchematicRouteIntent;
  id: string | null;
  rawInput: string;
};

export type VisualSchematicRouteResult = {
  intent: VisualSchematicRouteIntent;
  id: string | null;
  found: boolean;
  path: string;
  url: string | null;
  title: string;
  message: string;
  warnings: string[];
};

export type ResolveVisualSchematicRouteOptions = {
  baseUrl?: string;
};

const LIBRARY_PATTERNS = [
  /^\s*(?:open|show|view|browse)\s+(?:the\s+)?(?:visual\s+)?schematic\s+library\s*$/i,
  /^\s*(?:open|show|view|browse)\s+(?:the\s+)?schematics\s*$/i,
  /^\s*schematics\s+(?:library|visual\s+library|viewer)\s*$/i,
  /^\s*schematic\s+(?:library|visual\s+library|viewer)\s*$/i,
];

const LATEST_PATTERNS = [
  /^\s*(?:open|show|view)\s+(?:the\s+)?latest\s+schematic\s*$/i,
  /^\s*(?:open|show|view)\s+schematic\s+latest\s*$/i,
  /^\s*schematics?\s+(?:open|show|view)\s+latest\s*$/i,
  /^\s*schematics?\s+viewer\s+latest\s*$/i,
];

const DETAIL_PATTERNS = [
  /^\s*(?:open|show|view)\s+schematic\s+(.+?)\s*$/i,
  /^\s*schematics?\s+(?:open|show|view)\s+(.+?)\s*$/i,
  /^\s*schematics?\s+viewer\s+(.+?)\s*$/i,
];

const RESERVED_DETAIL_TARGETS = new Set([
  "library",
  "visual library",
  "viewer",
  "list",
  "search",
  "help",
  "status",
  "latest",
]);

export function parseVisualSchematicRouteCommand(
  input: string,
): VisualSchematicRouteCommand | null {
  const rawInput = input.trim();

  if (!rawInput) {
    return null;
  }

  if (LIBRARY_PATTERNS.some((pattern) => pattern.test(rawInput))) {
    return {
      intent: "open-library",
      id: null,
      rawInput,
    };
  }

  if (LATEST_PATTERNS.some((pattern) => pattern.test(rawInput))) {
    return {
      intent: "open-latest",
      id: null,
      rawInput,
    };
  }

  for (const pattern of DETAIL_PATTERNS) {
    const match = rawInput.match(pattern);
    const target = sanitizeDetailTarget(match?.[1] ?? "");

    if (target && !RESERVED_DETAIL_TARGETS.has(target.toLowerCase())) {
      return {
        intent: "open-detail",
        id: target,
        rawInput,
      };
    }
  }

  return null;
}

export async function resolveVisualSchematicRouteCommand(
  command: VisualSchematicRouteCommand,
  options: ResolveVisualSchematicRouteOptions = {},
): Promise<VisualSchematicRouteResult> {
  if (command.intent === "open-library") {
    return createRouteResult({
      command,
      id: null,
      found: true,
      path: "/schematics",
      baseUrl: options.baseUrl,
      title: "Open schematic visual library",
      message: "Opening the visual schematic library.",
      warnings: [],
    });
  }

  if (command.intent === "open-detail") {
    const id = command.id ?? "";
    const schematics = await readVisualSchematicSummaries();
    const found = schematics.some((schematic) => schematic.id === id);

    return createRouteResult({
      command,
      id,
      found,
      path: `/schematics/${encodeURIComponent(id)}`,
      baseUrl: options.baseUrl,
      title: found ? `Open schematic ${id}` : `Schematic ${id} route`,
      message: found
        ? `Opening schematic viewer for ${id}.`
        : `No managed schematic with ID "${id}" was found. The route is still returned so the page can show its normal not-found state.`,
      warnings: found ? [] : [`Schematic ID "${id}" was not found in the visual library index.`],
    });
  }

  const schematics = await readVisualSchematicSummaries();
  const latest = schematics[0] ?? null;

  if (!latest) {
    return createRouteResult({
      command,
      id: null,
      found: false,
      path: "/schematics",
      baseUrl: options.baseUrl,
      title: "Open schematic visual library",
      message:
        "No managed schematics were found yet. Opening the library page instead.",
      warnings: ["No latest schematic could be resolved because the library is empty."],
    });
  }

  return createRouteResult({
    command,
    id: latest.id,
    found: true,
    path: `/schematics/${encodeURIComponent(latest.id)}`,
    baseUrl: options.baseUrl,
    title: `Open latest schematic: ${latest.name}`,
    message: `Opening latest schematic viewer for ${latest.name}.`,
    warnings: [],
  });
}

export function formatVisualSchematicRouteResponse(
  result: VisualSchematicRouteResult,
): string {
  const urlText = result.url ?? result.path;
  const warningText =
    result.warnings.length > 0
      ? `\n\nWarning: ${result.warnings.join(" ")}`
      : "";

  return `${result.message}\n\nRoute: ${urlText}${warningText}`;
}

export function getVisualSchematicRouteCommandExamples(): string[] {
  return [
    "open schematic library",
    "schematics viewer",
    "show schematic latest",
    "open latest schematic",
    "show schematic <id>",
    "schematics open <id>",
  ];
}

function createRouteResult({
  command,
  id,
  found,
  path,
  baseUrl,
  title,
  message,
  warnings,
}: {
  command: VisualSchematicRouteCommand;
  id: string | null;
  found: boolean;
  path: string;
  baseUrl: string | undefined;
  title: string;
  message: string;
  warnings: string[];
}): VisualSchematicRouteResult {
  return {
    intent: command.intent,
    id,
    found,
    path,
    url: createAbsoluteUrl(path, baseUrl),
    title,
    message,
    warnings,
  };
}

function createAbsoluteUrl(pathname: string, baseUrl: string | undefined): string | null {
  const normalizedBaseUrl = baseUrl?.trim();

  if (!normalizedBaseUrl) {
    return null;
  }

  try {
    return new URL(pathname, normalizedBaseUrl).toString();
  } catch {
    return null;
  }
}

function sanitizeDetailTarget(value: string): string {
  return value
    .trim()
    .replace(/^id:/i, "")
    .replace(/^['\"]|['\"]$/g, "")
    .trim();
}
