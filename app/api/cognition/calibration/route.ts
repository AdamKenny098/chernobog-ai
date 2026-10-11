import {
  NextResponse,
} from "next/server";

export const runtime =
  "nodejs";

export async function GET() {
  return NextResponse.json({
    ok:
      true,
    arena: {
      milestone:
        "OH-4G",
      status:
        "core-ready",
      capabilities: [
        "equivalent-task execution",
        "multi-model candidates",
        "multi-strategy candidates",
        "blind evaluation labels",
        "4F evaluation integration",
        "candidate capability scores",
        "model capability scores",
        "strategy capability scores",
      ],
      note:
        "Calibration execution requires an explicitly configured EvaluationFramework and candidate executor. Routing changes are outside OH-4G.",
    },
  });
}