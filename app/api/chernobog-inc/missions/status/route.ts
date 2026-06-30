import { NextRequest, NextResponse } from "next/server";
import { updateChernobogMissionStatus } from "@/lib/modules/vault-brain/chernobogMissionStore";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      missionId?: string;
      status?: string;
      notes?: string;
    };

    if (!body.missionId || !body.status) {
      return NextResponse.json(
        { ok: false, error: "missionId and status are required." },
        { status: 400 }
      );
    }

    const mission = await updateChernobogMissionStatus(body.missionId, body.status, body.notes);
    return NextResponse.json({ ok: true, mission });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown mission status error." },
      { status: 400 }
    );
  }
}
