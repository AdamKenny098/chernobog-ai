import { NextRequest, NextResponse } from "next/server";
import {
  createChernobogMission,
  getChernobogMissionStoreSnapshot,
  readChernobogMissions,
} from "@/lib/modules/vault-brain/chernobogMissionStore";
import { CreateChernobogMissionInput } from "@/lib/modules/vault-brain/chernobogMissionTypes";

export async function GET() {
  const missions = await readChernobogMissions();
  return NextResponse.json({ ok: true, missions });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<CreateChernobogMissionInput>;
    const mission = await createChernobogMission({
      title: body.title ?? "",
      objective: body.objective ?? "",
      projectId: body.projectId,
      version: body.version,
      departments: body.departments,
      priority: body.priority,
      tags: body.tags,
      createdBy: body.createdBy,
      notes: body.notes,
      sourceRef: body.sourceRef,
    });
    return NextResponse.json({ ok: true, mission });
  } catch (error) {
    const snapshot = await getChernobogMissionStoreSnapshot();
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown mission creation error.",
        snapshot,
      },
      { status: 400 }
    );
  }
}
