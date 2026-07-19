import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store" };

function retiredResponse() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "Legacy turnaround generation is retired. Use the identity-anchor gate instead.",
    },
    { status: 410, headers: HEADERS }
  );
}

export async function GET() {
  return retiredResponse();
}

export async function POST() {
  return retiredResponse();
}

export async function PATCH() {
  return retiredResponse();
}
