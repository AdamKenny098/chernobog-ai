import { promises as fs } from "fs";
import path from "path";

type RouteContext = {
  params: { buildId: string; kind: string } | Promise<{ buildId: string; kind: string }>;
};

type SchematicMetadata = {
  buildId: string;
  outputPaths: {
    debugJsonPath: string;
    metadataJsonPath: string;
    schemPath: string;
    vaultNotePath: string;
  };
};

type DownloadKind = "schem" | "metadata" | "debug" | "vault-note";

const downloadKinds = new Set<string>(["schem", "metadata", "debug", "vault-note"]);

function safeBuildId(buildId: string): string | null {
  return /^[a-zA-Z0-9_.-]+$/.test(buildId) ? buildId : null;
}

function safeDownloadKind(kind: string): DownloadKind | null {
  return downloadKinds.has(kind) ? (kind as DownloadKind) : null;
}

function toProjectAbsolutePath(root: string, relativePath: string): string | null {
  if (!relativePath || path.isAbsolute(relativePath)) {
    return null;
  }

  const normalized = path.normalize(relativePath);

  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    return null;
  }

  return path.join(root, normalized);
}

async function readMetadata(root: string, buildId: string): Promise<SchematicMetadata | null> {
  try {
    const metadataPath = path.join(root, "exports", "schematics", "metadata", `${buildId}.metadata.json`);
    const raw = await fs.readFile(metadataPath, "utf8");
    return JSON.parse(raw) as SchematicMetadata;
  } catch {
    return null;
  }
}

function relativePathForKind(metadata: SchematicMetadata, kind: DownloadKind): string {
  switch (kind) {
    case "schem":
      return metadata.outputPaths.schemPath;
    case "metadata":
      return metadata.outputPaths.metadataJsonPath;
    case "debug":
      return metadata.outputPaths.debugJsonPath;
    case "vault-note":
      return metadata.outputPaths.vaultNotePath;
    default:
      return metadata.outputPaths.schemPath;
  }
}

function contentTypeForKind(kind: DownloadKind): string {
  switch (kind) {
    case "schem":
      return "application/octet-stream";
    case "metadata":
    case "debug":
      return "application/json; charset=utf-8";
    case "vault-note":
      return "text/markdown; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

function fallbackFilename(buildId: string, kind: DownloadKind): string {
  switch (kind) {
    case "schem":
      return `${buildId}.schem`;
    case "metadata":
      return `${buildId}.metadata.json`;
    case "debug":
      return `${buildId}.debug.json`;
    case "vault-note":
      return `${buildId}.md`;
    default:
      return buildId;
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const buildId = safeBuildId(params.buildId);
  const kind = safeDownloadKind(params.kind);

  if (!buildId || !kind) {
    return Response.json({ ok: false, message: "Invalid schematic download request." }, { status: 400 });
  }

  const root = process.cwd();
  const metadata = await readMetadata(root, buildId);

  if (!metadata) {
    return Response.json({ ok: false, message: "Schematic metadata not found." }, { status: 404 });
  }

  const relativePath = relativePathForKind(metadata, kind);
  const absolutePath = toProjectAbsolutePath(root, relativePath);

  if (!absolutePath) {
    return Response.json({ ok: false, message: "Refused unsafe schematic file path." }, { status: 400 });
  }

  try {
    const buffer = await fs.readFile(absolutePath);
    const filename = path.basename(relativePath) || fallbackFilename(buildId, kind);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentTypeForKind(kind),
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ ok: false, message: "Requested schematic file was not found." }, { status: 404 });
  }
}
