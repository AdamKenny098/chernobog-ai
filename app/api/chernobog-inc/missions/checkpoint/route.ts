import { NextRequest, NextResponse } from "next/server";
import {
  approveChernobogMissionCheckpoint,
  rejectChernobogMissionCheckpoint,
} from "@/lib/modules/vault-brain/chernobogMissionStore";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      missionId?: string;
      checkpointId?: string;
      decision?: "approved" | "rejected";
      notes?: string;
    };

    if (!body.missionId || !body.checkpointId) {
      return NextResponse.json(
        { ok: false, error: "missionId and checkpointId are required." },
        { status: 400 }
      );
    }

    const mission = body.decision === "rejected"
      ? await rejectChernobogMissionCheckpoint(body.missionId, body.checkpointId, body.notes)
      : await approveChernobogMissionCheckpoint(body.missionId, body.checkpointId, body.notes);

    return NextResponse.json({ ok: true, mission });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown checkpoint error." },
      { status: 400 }
    );
  }
}
