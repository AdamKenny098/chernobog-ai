import {
  NextResponse,
} from "next/server";

import {
  getEvaluationFramework,
} from "@chernobog/models/evaluation";

export const runtime =
  "nodejs";

export async function GET() {
  const framework =
    getEvaluationFramework();

  return NextResponse.json({
    ok:
      true,
    methods:
      framework
        .listMethods()
        .map(
          (method) => ({
            id:
              method.id,
            label:
              method.label,
            kind:
              method.kind,
            perspective:
              method.perspective,
            weight:
              method.weight,
            required:
              method.required,
          }),
        ),
    profiles:
      framework
        .listProfiles(),
  });
}