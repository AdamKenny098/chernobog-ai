import { NextResponse } from "next/server";

import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
import {
  apiFailureResponseInit,
  optionalString,
  readJsonObject,
  toItchApiFailure,
} from "@/lib/modules/itch-discovery/api/http";
import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
import { ItchAdultTaxonomyRepository } from "@/lib/modules/itch-discovery/repositories";
import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";
import { reclassifyItchAdultTaxonomy } from "@/lib/modules/itch-discovery/services/reclassifyItchAdultTaxonomy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    const repository = new ItchAdultTaxonomyRepository(database);
    const url = new URL(request.url);
    const status = optionalString(url.searchParams.get("uncategorisedStatus"), "uncategorisedStatus");
    const snapshot = repository.getSnapshot();
    return NextResponse.json({
      ...snapshot,
      uncategorised: status === "pending" || status === "mapped" || status === "ignored"
        ? repository.listUncategorised(status)
        : snapshot.uncategorised,
    });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function POST(request: Request) {
  try {
    guardItchMutationRequest(request, "taxonomy:post", {
      limit: 6,
      windowMs: 600_000,
    });
    const body = await readJsonObject(request);
    const action = optionalString(body.action, "action") ?? "reclassify";
    if (action !== "reclassify") {
      throw new TypeError(`Unsupported taxonomy action: ${action}`);
    }
    return NextResponse.json(reclassifyItchAdultTaxonomy());
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}
