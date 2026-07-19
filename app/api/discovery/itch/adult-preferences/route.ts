import { NextResponse } from "next/server";

import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
import { ItchAdultPreferenceProfileRepository } from "@/lib/modules/itch-discovery/repositories";
import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";

export const runtime = "nodejs";

export async function GET() {
  const database = getItchDiscoveryDatabase();
  bootstrapItchDiscovery(database);
  const profiles = new ItchAdultPreferenceProfileRepository(database).listProfiles();

  return NextResponse.json({
    profiles,
    defaultProfileId: profiles.find((profile) => profile.isDefault)?.id ?? null,
  });
}
