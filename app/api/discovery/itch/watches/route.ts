import { NextResponse } from "next/server";

import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";

import {
  apiFailureResponseInit,
  optionalBoolean,
  optionalString,
  readJsonObject,
  toItchApiFailure,
} from "@/lib/modules/itch-discovery/api/http";
import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
import { ItchWatchRepository } from "@/lib/modules/itch-discovery/repositories";
import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
import { unwatchItchGame, watchItchGame } from "@/lib/modules/itch-discovery/services/watchItchGame";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    return NextResponse.json({ watches: new ItchWatchRepository(database).listAll() });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function POST(request: Request) {
  try {
    guardItchMutationRequest(request, "watches:post", { limit: 90, windowMs: 60000 });
    const body = await readJsonObject(request);
    const action = optionalString(body.action, "action") ?? "watch";
    const input = {
      gameId: optionalString(body.gameId, "gameId"),
      canonicalUrl: optionalString(body.canonicalUrl, "canonicalUrl"),
      title: optionalString(body.title, "title"),
      watchMetadata: optionalBoolean(body.watchMetadata, "watchMetadata"),
    };
    if (!input.gameId && !input.canonicalUrl && !input.title) {
      throw new TypeError("gameId, canonicalUrl, or title is required.");
    }
    const result = action === "watch"
      ? watchItchGame(input)
      : action === "unwatch"
        ? unwatchItchGame(input)
        : (() => { throw new TypeError(`Unsupported watch action: ${action}`); })();
    return NextResponse.json(result);
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}
