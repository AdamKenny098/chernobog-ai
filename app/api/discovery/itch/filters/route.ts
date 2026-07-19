import { NextResponse } from "next/server";

import { guardItchMutationRequest } from "@/lib/modules/itch-discovery/api/security";

import type { ItchFilterRule, ItchFilterSort } from "@/lib/modules/itch-discovery/contract";
import {
  apiFailureResponseInit,
  isRecord,
  optionalBoolean,
  optionalString,
  readJsonObject,
  requiredString,
  toItchApiFailure,
} from "@/lib/modules/itch-discovery/api/http";
import { getItchDiscoveryDatabase } from "@/lib/modules/itch-discovery/database/client";
import { ItchFilterPresetRepository } from "@/lib/modules/itch-discovery/repositories";
import { bootstrapItchDiscovery } from "@/lib/modules/itch-discovery/services/bootstrapItchDiscovery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    return NextResponse.json({ presets: new ItchFilterPresetRepository(database).listAll() });
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

export async function POST(request: Request) {
  try {
    guardItchMutationRequest(request, "filters:post", { limit: 90, windowMs: 60000 });
    const body = await readJsonObject(request);
    const action = optionalString(body.action, "action") ?? "upsert";
    const database = getItchDiscoveryDatabase();
    bootstrapItchDiscovery(database);
    const presets = new ItchFilterPresetRepository(database);

    if (action === "upsert") {
      const presetBody = isRecord(body.preset) ? body.preset : body;
      const rules = requireObjectArray(presetBody.rules, "rules") as unknown as ItchFilterRule[];
      const sort = requireObjectArray(presetBody.sort ?? [], "sort") as unknown as ItchFilterSort[];
      const existingId = optionalString(presetBody.id, "preset.id");
      const existing = existingId ? presets.findById(existingId) : null;
      const preset = presets.upsert({
        id: existingId,
        name: requiredString(presetBody.name, "preset.name", { maximumLength: 100 }),
        description: optionalString(presetBody.description, "preset.description", { maximumLength: 500 }),
        isDefault: optionalBoolean(presetBody.isDefault, "preset.isDefault") ?? existing?.isDefault ?? false,
        isSystem: existing?.isSystem ?? false,
        rules,
        sort,
      });
      return NextResponse.json({ preset }, { status: existing ? 200 : 201 });
    }

    if (action === "duplicate") {
      const preset = presets.duplicate(
        requiredString(body.id, "id"),
        requiredString(body.newName, "newName", { maximumLength: 100 }),
      );
      return NextResponse.json({ preset }, { status: 201 });
    }

    if (action === "set-default") {
      return NextResponse.json({ preset: presets.setDefault(requiredString(body.id, "id")) });
    }

    if (action === "delete") {
      const deleted = presets.deleteById(requiredString(body.id, "id"));
      if (!deleted) return NextResponse.json({ error: "Filter preset not found.", code: "GAME_RADAR_NOT_FOUND" }, { status: 404 });
      return NextResponse.json({ deleted: true });
    }

    throw new TypeError(`Unsupported filter action: ${action}`);
  } catch (error) {
    const failure = toItchApiFailure(error);
    return NextResponse.json(failure.body, apiFailureResponseInit(failure));
  }
}

function requireObjectArray(value: unknown, field: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some((item) => !isRecord(item))) {
    throw new TypeError(`${field} must be an array of objects.`);
  }
  return value;
}
