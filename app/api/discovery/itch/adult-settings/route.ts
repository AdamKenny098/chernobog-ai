import { NextResponse } from "next/server";
import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";
import { apiFailureResponseInit, optionalBoolean, readJsonObject, toItchApiFailure } from "@/lib/modules/itch-discovery/api/http";
import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
import { ItchAdultSettingsRepository } from "@/lib/modules/itch-discovery/repositories";
import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getItchDiscoveryDatabase(); bootstrapItchDiscovery(db);
    return NextResponse.json({ settings: new ItchAdultSettingsRepository(db).ensureDefault() });
  } catch (error) { const failure = toItchApiFailure(error); return NextResponse.json(failure.body, apiFailureResponseInit(failure)); }
}

export async function PATCH(request: Request) {
  try {
    guardItchMutationRequest(request, "adult-settings:patch", { limit: 60, windowMs: 60000 });
    const body = await readJsonObject(request);
    const repository = new ItchAdultSettingsRepository(getItchDiscoveryDatabase());
    const settings = repository.update({
      enabled: optionalBoolean(body.enabled, "enabled"),
      adultOnly: optionalBoolean(body.adultOnly, "adultOnly"),
      ageGateRequired: optionalBoolean(body.ageGateRequired, "ageGateRequired"),
      blurCoversByDefault: optionalBoolean(body.blurCoversByDefault, "blurCoversByDefault"),
      discreetNotifications: optionalBoolean(body.discreetNotifications, "discreetNotifications"),
      hideExplicitTitles: optionalBoolean(body.hideExplicitTitles, "hideExplicitTitles"),
      blockUnknownAgeContent: optionalBoolean(body.blockUnknownAgeContent, "blockUnknownAgeContent"),
    });
    return NextResponse.json({ settings });
  } catch (error) { const failure = toItchApiFailure(error); return NextResponse.json(failure.body, apiFailureResponseInit(failure)); }
}
