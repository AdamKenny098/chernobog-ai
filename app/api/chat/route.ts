import { NextResponse } from "next/server";
import { respondForRoute, routeMessage } from "@/lib/chernobog/router";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userMessage = String(body?.message ?? "").trim();

    if (!userMessage) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const route = await routeMessage(userMessage);
    const reply = await respondForRoute(route, userMessage);

    return NextResponse.json({
      route,
      reply: reply || "No response returned.",
    });
  } catch (error) {
    console.error("Chat route error:", error);

    return NextResponse.json(
      { error: "Failed to process directive." },
      { status: 500 }
    );
  }
}