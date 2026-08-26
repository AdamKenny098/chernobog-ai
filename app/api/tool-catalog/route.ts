import {
  NextResponse,
} from "next/server";

import {
  getToolCatalogSnapshot,
} from "@/lib/chernobog/execution";

export const runtime = "nodejs";

export async function GET() {
  try {
    const catalog =
      getToolCatalogSnapshot();

    return NextResponse.json({
      ok: true,
      catalog,
      boundaries: {
        readOnlyEndpoint:
          true,
        executesTools:
          false,
        acceptsToolInput:
          false,
        exposesExecutableFunctions:
          false,
        exposesInputSchemas:
          false,
        grantsPermissions:
          false,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "tool_catalog_failed",
        message:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      },
    );
  }
}
