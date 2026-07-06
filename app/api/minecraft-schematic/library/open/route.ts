import { NextResponse } from "next/server";

import {
  parseVisualSchematicRouteCommand,
  resolveVisualSchematicRouteCommand,
} from "@/lib/modules/minecraft-schematic/commands/visualSchematicRouteCommand";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawTarget = url.searchParams.get("target") ?? "library";
  const rawId = url.searchParams.get("id") ?? "";
  const shouldRedirect = url.searchParams.get("redirect") === "1";

  const commandInput = createCommandInput(rawTarget, rawId);
  const command = parseVisualSchematicRouteCommand(commandInput);

  if (!command) {
    return NextResponse.json(
      {
        error: "Could not resolve schematic visual route command.",
        commandInput,
      },
      {
        status: 400,
      },
    );
  }

  const result = await resolveVisualSchematicRouteCommand(command, {
    baseUrl: url.origin,
  });

  if (shouldRedirect) {
    return NextResponse.redirect(new URL(result.path, url.origin));
  }

  return NextResponse.json({
    result,
    generatedAt: new Date().toISOString(),
  });
}

function createCommandInput(target: string, id: string): string {
  const normalizedTarget = target.trim().toLowerCase();

  if (id.trim()) {
    return `show schematic ${id.trim()}`;
  }

  if (normalizedTarget === "latest") {
    return "show schematic latest";
  }

  if (normalizedTarget === "library" || normalizedTarget === "schematics") {
    return "open schematic library";
  }

  return `show schematic ${target.trim()}`;
}
