import { NextResponse } from "next/server";

import { readVisualSchematicDetail } from "@/lib/modules/minecraft-schematic/visual-library/readVisualSchematicLibrary";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const schematic = await readVisualSchematicDetail(decodeURIComponent(id));

  if (!schematic) {
    return NextResponse.json(
      {
        error: "Schematic not found.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({
    schematic,
    generatedAt: new Date().toISOString(),
  });
}
