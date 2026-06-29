import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { gzip, gunzip } from "zlib";

import { getBlockEntityNbtId, getWritableBlockEntities, normalizeSignTextLines } from "../block-entities/blockEntitySupport";
import type { GeneratedSchematicBuild, MinecraftBlockName, SchematicBlockEntity } from "../types";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

const TAG_END = 0;
const TAG_BYTE = 1;
const TAG_SHORT = 2;
const TAG_INT = 3;
const TAG_LONG = 4;
const TAG_BYTE_ARRAY = 7;
const TAG_STRING = 8;
const TAG_LIST = 9;
const TAG_COMPOUND = 10;
const TAG_INT_ARRAY = 11;

function blockIndex(x: number, y: number, z: number, width: number, depth: number): number {
  return x + z * width + y * width * depth;
}

function getDataVersion(minecraftVersion: string): number {
  const knownVersions: Record<string, number> = {
    "1.21.1": 3955,
    "1.21": 3953,
    "1.20.6": 3839,
    "1.20.4": 3700,
    "1.20.1": 3465,
  };

  return knownVersions[minecraftVersion] ?? 3955;
}

function writeUnsignedShort(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16BE(value, 0);
  return buffer;
}

function writeShort(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeInt16BE(value, 0);
  return buffer;
}

function writeInt(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeInt32BE(value, 0);
  return buffer;
}

function writeLong(value: number | bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(value), 0);
  return buffer;
}

function writeStringPayload(value: string): Buffer {
  const stringBuffer = Buffer.from(value, "utf8");
  return Buffer.concat([writeUnsignedShort(stringBuffer.length), stringBuffer]);
}

function writeTagHeader(type: number, name: string): Buffer {
  return Buffer.concat([Buffer.from([type]), writeStringPayload(name)]);
}

function tagByte(name: string, value: number): Buffer {
  return Buffer.concat([writeTagHeader(TAG_BYTE, name), Buffer.from([value & 0xff])]);
}

function tagInt(name: string, value: number): Buffer {
  return Buffer.concat([writeTagHeader(TAG_INT, name), writeInt(value)]);
}

function tagLong(name: string, value: number | bigint): Buffer {
  return Buffer.concat([writeTagHeader(TAG_LONG, name), writeLong(value)]);
}

function tagShort(name: string, value: number): Buffer {
  return Buffer.concat([writeTagHeader(TAG_SHORT, name), writeShort(value)]);
}

function tagString(name: string, value: string): Buffer {
  return Buffer.concat([writeTagHeader(TAG_STRING, name), writeStringPayload(value)]);
}

function tagIntArray(name: string, values: number[]): Buffer {
  return Buffer.concat([
    writeTagHeader(TAG_INT_ARRAY, name),
    writeInt(values.length),
    ...values.map(writeInt),
  ]);
}

function tagByteArray(name: string, values: number[]): Buffer {
  const byteValues = values.map((value) => value & 0xff);

  return Buffer.concat([
    writeTagHeader(TAG_BYTE_ARRAY, name),
    writeInt(byteValues.length),
    Buffer.from(byteValues),
  ]);
}

function tagList(name: string, childType: number, children: Buffer[]): Buffer {
  return Buffer.concat([
    writeTagHeader(TAG_LIST, name),
    Buffer.from([childType]),
    writeInt(children.length),
    ...children,
  ]);
}

function tagEmptyList(name: string, childType: number): Buffer {
  return tagList(name, childType, []);
}

function compoundPayload(children: Buffer[]): Buffer {
  return Buffer.concat([...children, Buffer.from([TAG_END])]);
}

function tagCompound(name: string, children: Buffer[]): Buffer {
  return Buffer.concat([writeTagHeader(TAG_COMPOUND, name), compoundPayload(children)]);
}

function writeRootCompound(name: string, children: Buffer[]): Buffer {
  return Buffer.concat([writeTagHeader(TAG_COMPOUND, name), ...children, Buffer.from([TAG_END])]);
}

function normalizePalette(build: GeneratedSchematicBuild): MinecraftBlockName[] {
  const palette = build.palette.includes("minecraft:air")
    ? [...build.palette]
    : (["minecraft:air", ...build.palette] as MinecraftBlockName[]);

  return Array.from(new Set(palette));
}

function writeVarInt(value: number): number[] {
  const bytes: number[] = [];
  let current = value >>> 0;

  do {
    let temp = current & 0x7f;
    current >>>= 7;

    if (current !== 0) {
      temp |= 0x80;
    }

    bytes.push(temp);
  } while (current !== 0);

  return bytes;
}

function buildBlockData(build: GeneratedSchematicBuild, palette: MinecraftBlockName[]): number[] {
  const paletteIndexByBlock = new Map<MinecraftBlockName, number>();

  palette.forEach((blockName, index) => {
    paletteIndexByBlock.set(blockName, index);
  });

  const volume = build.size.x * build.size.y * build.size.z;
  const airIndex = paletteIndexByBlock.get("minecraft:air") ?? 0;
  const paletteIndices = new Array<number>(volume).fill(airIndex);

  for (const block of build.blocks) {
    const paletteIndex = paletteIndexByBlock.get(block.block);

    if (paletteIndex === undefined) {
      throw new Error(`Block ${block.block} is missing from the schematic palette.`);
    }

    const index = blockIndex(block.x, block.y, block.z, build.size.x, build.size.z);
    paletteIndices[index] = paletteIndex;
  }

  return paletteIndices.flatMap(writeVarInt);
}

function buildBiomeData(width: number, depth: number): number[] {
  const biomeCount = width * depth;
  const biomeData: number[] = [];

  for (let index = 0; index < biomeCount; index += 1) {
    biomeData.push(...writeVarInt(0));
  }

  return biomeData;
}

function buildPaletteCompound(palette: MinecraftBlockName[]): Buffer {
  const paletteTags = palette.map((blockName, index) => tagInt(blockName, index));
  return tagCompound("Palette", paletteTags);
}

function buildBiomePaletteCompound(): Buffer {
  return tagCompound("BiomePalette", [tagInt("minecraft:plains", 0)]);
}

function jsonText(text: string): string {
  return JSON.stringify({ text });
}

function tagStringList(name: string, values: string[]): Buffer {
  return tagList(name, TAG_STRING, values.map(writeStringPayload));
}

function buildSignTextCompound(name: string, lines: [string, string, string, string]): Buffer {
  return tagCompound(name, [
    tagStringList("messages", lines.map(jsonText)),
    tagString("color", "black"),
    tagByte("has_glowing_text", 0),
  ]);
}

function buildBlockEntityPayload(entity: SchematicBlockEntity): Buffer | null {
  const nbtId = entity.nbtId ?? getBlockEntityNbtId(entity);

  if (!nbtId || entity.nbtStatus === "metadata_only") {
    return null;
  }

  const children: Buffer[] = [
    // Sponge v2 commonly uses Id/Pos, while vanilla block entity payloads use id.
    // Keeping both is harmless and improves compatibility across schematic readers.
    tagString("Id", nbtId),
    tagString("id", nbtId),
    tagIntArray("Pos", [entity.x, entity.y, entity.z]),
  ];

  if (entity.label) {
    children.push(tagString("CustomName", jsonText(entity.label)));
  }

  if (entity.kind === "sign") {
    const lines = normalizeSignTextLines(entity.text, entity.label);
    children.push(tagString("Text1", jsonText(lines[0])));
    children.push(tagString("Text2", jsonText(lines[1])));
    children.push(tagString("Text3", jsonText(lines[2])));
    children.push(tagString("Text4", jsonText(lines[3])));
    children.push(buildSignTextCompound("front_text", lines));
    children.push(buildSignTextCompound("back_text", ["", "", "", ""] as [string, string, string, string]));
    children.push(tagByte("is_waxed", 0));
  }

  if (entity.kind === "chest" || entity.kind === "barrel") {
    children.push(tagEmptyList("Items", TAG_COMPOUND));
  }

  return compoundPayload(children);
}

function buildBlockEntitiesList(build: GeneratedSchematicBuild): Buffer {
  const payloads = getWritableBlockEntities(build)
    .map(buildBlockEntityPayload)
    .filter((payload): payload is Buffer => Boolean(payload));

  return tagList("BlockEntities", TAG_COMPOUND, payloads);
}

function buildMetadataCompound(build: GeneratedSchematicBuild): Buffer {
  const generatedAtMs = Number.isFinite(Date.parse(build.generatedAt))
    ? Date.parse(build.generatedAt)
    : Date.now();

  return tagCompound("Metadata", [
    tagString("Name", build.displayName ?? build.buildId),
    tagString("BuildId", build.buildId),
    tagString("Author", "Chernobog"),
    tagLong("Date", generatedAtMs),
    tagString("Generator", build.generatorName),
    tagString("Variant", build.variant),
    tagString("PresetId", build.presetId ?? ""),
    tagString("Profile", build.profile ?? "vanilla"),
    tagInt("BlockEntities", build.blockEntities?.length ?? 0),
    tagInt("BlockEntityNbtWritten", build.blockEntityExport?.nbtWritten ?? 0),
    tagInt("BlockEntityMetadataOnly", build.blockEntityExport?.metadataOnly ?? 0),
  ]);
}

function buildSpongeV2SchematicBuffer(build: GeneratedSchematicBuild): Buffer {
  const palette = normalizePalette(build);
  const blockData = buildBlockData(build, palette);
  const biomeData = buildBiomeData(build.size.x, build.size.z);

  return writeRootCompound("Schematic", [
    tagInt("Version", 2),
    tagInt("DataVersion", getDataVersion(build.minecraftVersion)),
    tagShort("Width", build.size.x),
    tagShort("Height", build.size.y),
    tagShort("Length", build.size.z),
    tagIntArray("Offset", [0, 0, 0]),

    buildMetadataCompound(build),

    tagInt("PaletteMax", palette.length),
    buildPaletteCompound(palette),
    tagByteArray("BlockData", blockData),

    buildBlockEntitiesList(build),
    tagEmptyList("Entities", TAG_COMPOUND),

    tagInt("BiomePaletteMax", 1),
    buildBiomePaletteCompound(),
    tagByteArray("BiomeData", biomeData),
  ]);
}

function bufferContainsUtf8(buffer: Buffer, text: string): boolean {
  return buffer.indexOf(Buffer.from(text, "utf8")) !== -1;
}

export async function exportSchem(
  build: GeneratedSchematicBuild,
  absoluteOutputPath: string,
): Promise<void> {
  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });

  const uncompressedNbt = buildSpongeV2SchematicBuffer(build);
  const compressedNbt = await gzipAsync(uncompressedNbt);

  await fs.writeFile(absoluteOutputPath, compressedNbt);
}

export async function validateSchemFile(
  absoluteSchemPath: string,
  minecraftVersion: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const compressed = await fs.readFile(absoluteSchemPath);
    const uncompressed = await gunzipAsync(compressed);

    const requiredStrings = [
      "Schematic",
      "Version",
      "DataVersion",
      "Width",
      "Height",
      "Length",
      "Palette",
      "BlockData",
      "BlockEntities",
      "Entities",
      "BiomePalette",
      "BiomeData",
    ];

    const missing = requiredStrings.filter((value) => !bufferContainsUtf8(uncompressed, value));

    if (missing.length > 0) {
      return {
        ok: false,
        message: `Schematic NBT is missing required compatibility tags: ${missing.join(", ")}`,
      };
    }

    if (minecraftVersion.trim().length === 0) {
      return {
        ok: false,
        message: "Minecraft version is missing.",
      };
    }

    return {
      ok: true,
      message: "Schematic file is gzip-compressed Sponge v2 NBT with expected compatibility tags.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown schematic validation error.",
    };
  }
}