import { NextResponse } from "next/server";
import { getChernobogIncFoundation } from "@/lib/modules/vault-brain/chernobogIncFoundation";

export async function GET() {
  return NextResponse.json({
    ok: true,
    foundation: getChernobogIncFoundation(),
  });
}
