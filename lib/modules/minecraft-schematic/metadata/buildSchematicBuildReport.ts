import type {
  MinecraftBlockName,
  SchematicBuildReport,
  SchematicMetadata,
  SchematicOutputPaths,
} from "../types";

type ReportInput = Omit<SchematicMetadata, "buildReport">;

type GeneratorIdentity = {
  generator: string;
  variant: string;
  presetId?: string;
  displayName?: string;
  features: string[];
};

function humanize(value: string | undefined): string {
  if (!value) {
    return "Unspecified";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function identityOf(metadata: ReportInput): GeneratorIdentity {
  return {
    generator: String(metadata.generatorName),
    variant: String(metadata.variant),
    presetId: metadata.presetId,
    displayName: metadata.displayName,
    features: metadata.features ?? [],
  };
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function identityText(identity: GeneratorIdentity): string {
  return [identity.generator, identity.variant, identity.presetId, identity.displayName, ...identity.features]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function inferUseCase(metadata: ReportInput): string {
  const identity = identityOf(metadata);
  const text = identityText(identity);

  if (includesAny(text, ["factory", "workshop", "machine", "pipeworks", "industrial", "warehouse", "yard"])) {
    return "SirioCraft industrial district, Create starter area, rail-side utility zone, or faction production compound.";
  }

  if (includesAny(text, ["train", "station", "rail"])) {
    return "Small rail stop, settlement platform, spawn transport hub, or faction logistics point.";
  }

  if (includesAny(text, ["bridge"])) {
    return "Town approach, river crossing, road connector, faction border crossing, or spawn path feature.";
  }

  if (includesAny(text, ["gatehouse", "gate", "portcullis"])) {
    return "Faction entrance, town wall checkpoint, protected spawn district gate, or road control point.";
  }

  if (includesAny(text, ["outpost", "ruined", "ruin"])) {
    return "Exploration ruin, faction frontier marker, roadside encounter, or abandoned claim site.";
  }

  if (includesAny(text, ["house", "home", "cottage"])) {
    return "Settlement housing, spawn village filler, faction base housing, or roadside shelter.";
  }

  if (includesAny(text, ["tower", "watchtower", "watch"])) {
    return "Faction lookout, boundary marker, settlement defense, or navigation landmark.";
  }

  return "General SirioCraft build asset for manual placement, review, and iteration.";
}

function inferSuggestedPlacement(metadata: ReportInput): string {
  const text = identityText(identityOf(metadata));

  if (includesAny(text, ["rail_loading", "rail loading", "train", "station"])) {
    return "Place near planned rail lines with at least one clear side for track continuation.";
  }

  if (includesAny(text, ["storage_yard", "pipeworks", "yard", "warehouse"])) {
    return "Place on flat industrial terrain with road or rail access along the open yard side.";
  }

  if (includesAny(text, ["factory", "workshop", "machine"])) {
    return "Place on a flat foundation with room for future Create machinery, belts, shafts, and exterior logistics.";
  }

  if (includesAny(text, ["bridge"])) {
    return "Place across a river, ravine, path gap, or road cut; verify both ends meet terrain after paste.";
  }

  if (includesAny(text, ["gatehouse", "gate"])) {
    return "Place on a wall line, road entrance, or faction perimeter; connect side wall stubs manually if needed.";
  }

  if (includesAny(text, ["outpost", "ruined", "ruin"])) {
    return "Place on uneven frontier terrain and blend edges with extra rubble, grass, moss, or path blocks.";
  }

  if (includesAny(text, ["house", "cottage"])) {
    return "Place inside a town plot or faction settlement; connect porch and doorway to the local path network.";
  }

  return "Place on prepared terrain and inspect the footprint in the review page before pasting.";
}

function inferRecommendedNextAction(metadata: ReportInput): string {
  const hasErrors = metadata.validation.errors.length > 0 || metadata.shapeValidation?.valid === false;

  if (hasErrors) {
    return "Do not use this schematic yet. Fix validation errors, regenerate, then review again.";
  }

  const hasWarnings =
    metadata.validation.warnings.length > 0 ||
    (metadata.placementWarnings?.length ?? 0) > 0 ||
    (metadata.unsupportedBlockWarnings?.length ?? 0) > 0 ||
    (metadata.blockEntityExport?.metadataOnly ?? 0) > 0;

  if (hasWarnings) {
    return "Usable, but review warnings before placing. Paste into a test world before using on the live SirioCraft server.";
  }

  return "Ready for visual review and test-world placement.";
}

function inferQualityNotes(metadata: ReportInput): string[] {
  const notes: string[] = [];
  const text = identityText(identityOf(metadata));

  notes.push(`Generated as ${metadata.generatorName}/${metadata.variant}${metadata.presetId ? ` using preset ${metadata.presetId}` : ""}.`);
  notes.push(`Footprint is ${metadata.size.x} x ${metadata.size.y} x ${metadata.size.z} with ${metadata.blockCount} placed block(s).`);

  if (metadata.blockRegistryReport) {
    notes.push(`Block registry profile ${metadata.blockRegistryReport.profileId} checked ${metadata.blockRegistryReport.totalBlocksChecked} block(s), replaced ${metadata.blockRegistryReport.changedBlocks} block(s), and recorded ${metadata.blockRegistryReport.unsupportedBlocks.length} unsupported block(s).`);
  }

  if (metadata.features?.length) {
    notes.push(`Recorded features: ${metadata.features.slice(0, 12).join(", ")}${metadata.features.length > 12 ? ", ..." : ""}.`);
  }

  if (includesAny(text, ["factory", "industrial", "workshop", "machine", "pipeworks", "warehouse", "yard"])) {
    notes.push("Industrial details are still vanilla-first so the schematic remains safe before Create block profiles are enabled.");
  }

  if (metadata.blockEntityExport && metadata.blockEntityExport.total > 0) {
    notes.push(`${metadata.blockEntityExport.nbtWritten} block entity NBT record(s) written and ${metadata.blockEntityExport.metadataOnly} metadata-only placeholder(s) recorded.`);
  }

  return notes;
}

function inferKnownLimitations(metadata: ReportInput): string[] {
  const limitations: string[] = [];
  const text = identityText(identityOf(metadata));

  if (metadata.profile !== "siriocraft-create") {
    limitations.push("Uses the vanilla block registry profile. Create-specific blocks are replaced or blocked until the SirioCraft Create profile is enabled.");
  } else if (metadata.allowModdedBlocks !== true) {
    limitations.push("SirioCraft Create profile is selected, but allowModdedBlocks is false. Create blocks still fall back to vanilla-safe blocks.");
  }

  if (metadata.blockEntityExport && metadata.blockEntityExport.metadataOnly > 0) {
    limitations.push("Some block entities are metadata-only placeholders and may need manual setup in Minecraft.");
  }

  if (includesAny(text, ["factory", "workshop", "machine", "pipeworks", "industrial", "warehouse", "yard"])) {
    limitations.push("Industrial machinery, shafts, belts, pipes, and cogwheel details are vanilla approximations until Create block support is enabled.");
  }

  if (includesAny(text, ["bridge"])) {
    limitations.push("Bridge ends may need manual terrain blending after placement.");
  }

  if (includesAny(text, ["gatehouse"])) {
    limitations.push("Side wall connections may need manual extension to match the surrounding settlement or faction wall." );
  }

  if (includesAny(text, ["outpost", "ruined", "ruin"])) {
    limitations.push("Ruin edges are generated structurally; manual terrain blending will make the site feel more natural." );
  }

  if (limitations.length === 0) {
    limitations.push("No major generator-specific limitations recorded. Manual terrain blending is still recommended after placement." );
  }

  return limitations;
}

function summarizeWarnings(metadata: ReportInput): string[] {
  return [
    ...metadata.validation.warnings,
    ...(metadata.placementWarnings ?? []),
    ...(metadata.unsupportedBlockWarnings ?? []),
    ...(metadata.blockEntityExport?.warnings ?? []),
    ...(metadata.blockRegistryReport?.warnings ?? []),
    ...(metadata.shapeValidation?.issues.filter((issue) => issue.severity === "warning").map((issue) => `${issue.category}: ${issue.message}`) ?? []),
  ];
}

function inferPaletteRole(block: MinecraftBlockName): string {
  const name = block.toLowerCase();

  if (name.includes("brick") || name.includes("stone") || name.includes("deepslate") || name.includes("andesite")) {
    return "structure";
  }

  if (name.includes("plank") || name.includes("log") || name.includes("wood") || name.includes("fence")) {
    return "wood/detail";
  }

  if (name.includes("glass") || name.includes("pane")) {
    return "window";
  }

  if (name.includes("lantern") || name.includes("torch")) {
    return "lighting";
  }

  if (name.includes("rail")) {
    return "transport";
  }

  if (name.includes("barrel") || name.includes("chest")) {
    return "storage";
  }

  if (name.includes("iron") || name.includes("chain")) {
    return "metal/detail";
  }

  return "palette";
}

function summarizePalette(metadata: ReportInput): SchematicBuildReport["paletteSummary"] {
  return metadata.palette.slice(0, 16).map((block) => ({
    block,
    role: inferPaletteRole(block),
  }));
}

function summarizeBlockEntities(metadata: ReportInput): SchematicBuildReport["blockEntitySummary"] {
  const entities = metadata.blockEntities ?? [];
  const labels = entities
    .map((entity) => entity.label ?? entity.text?.join(" "))
    .filter((value): value is string => Boolean(value))
    .slice(0, 12);

  return {
    total: metadata.blockEntityExport?.total ?? entities.length,
    nbtWritten: metadata.blockEntityExport?.nbtWritten ?? 0,
    metadataOnly: metadata.blockEntityExport?.metadataOnly ?? 0,
    labels,
  };
}

function summarizeBlockRegistry(metadata: ReportInput): SchematicBuildReport["blockRegistrySummary"] {
  const report = metadata.blockRegistryReport;

  if (!report) {
    return undefined;
  }

  return {
    profileId: report.profileId,
    allowModdedBlocks: report.allowModdedBlocks,
    fallbackToVanilla: report.fallbackToVanilla,
    changedBlocks: report.changedBlocks,
    fallbackBlocks: report.fallbackBlocks,
    unsupportedBlocks: report.unsupportedBlocks.length,
  };
}

function outputSummary(outputPaths: SchematicOutputPaths): SchematicBuildReport["outputSummary"] {
  return [
    { kind: "schem", label: "Schematic", path: outputPaths.schemPath },
    { kind: "metadata", label: "Metadata JSON", path: outputPaths.metadataJsonPath },
    { kind: "debug", label: "Debug JSON", path: outputPaths.debugJsonPath },
    { kind: "vault-note", label: "Vault Note", path: outputPaths.vaultNotePath },
  ];
}

function inferTags(metadata: ReportInput): string[] {
  const tags = new Set<string>();
  const text = identityText(identityOf(metadata));

  tags.add(String(metadata.generatorName));
  tags.add(String(metadata.variant));

  if (metadata.presetId) tags.add(metadata.presetId);
  if (metadata.profile) tags.add(metadata.profile);

  for (const feature of metadata.features ?? []) {
    tags.add(feature);
  }

  if (includesAny(text, ["factory", "industrial", "workshop", "machine", "pipeworks", "warehouse", "yard"])) tags.add("industrial");
  if (includesAny(text, ["train", "rail", "station"])) tags.add("transport");
  if (includesAny(text, ["gate", "gatehouse", "watchtower", "tower"])) tags.add("faction");
  if (includesAny(text, ["outpost", "ruined", "ruin"])) tags.add("ruins");
  if (includesAny(text, ["house", "bridge", "town"])) tags.add("town");

  return Array.from(tags).filter(Boolean).slice(0, 24);
}

function statusFor(metadata: ReportInput): SchematicBuildReport["status"] {
  if (!metadata.validation.ok || metadata.shapeValidation?.valid === false) {
    return "failed";
  }

  if (summarizeWarnings(metadata).length > 0) {
    return "warning";
  }

  return "passed";
}

export function createSchematicBuildReport(metadata: ReportInput): SchematicBuildReport {
  const title = metadata.displayName ?? humanize(metadata.presetId ?? `${metadata.generatorName} ${metadata.variant}`);

  return {
    title,
    status: statusFor(metadata),
    sirioCraftUseCase: inferUseCase(metadata),
    suggestedPlacement: inferSuggestedPlacement(metadata),
    recommendedNextAction: inferRecommendedNextAction(metadata),
    qualityNotes: inferQualityNotes(metadata),
    knownLimitations: inferKnownLimitations(metadata),
    warningSummary: summarizeWarnings(metadata),
    paletteSummary: summarizePalette(metadata),
    blockEntitySummary: summarizeBlockEntities(metadata),
    blockRegistrySummary: summarizeBlockRegistry(metadata),
    outputSummary: outputSummary(metadata.outputPaths),
    reviewRoute: `/review/schematic/${metadata.buildId}`,
    tags: inferTags(metadata),
  };
}
