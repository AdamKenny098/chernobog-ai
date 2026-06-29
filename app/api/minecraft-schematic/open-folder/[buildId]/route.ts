import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";

type RouteContext = {
  params: { buildId: string } | Promise<{ buildId: string }>;
};

type SchematicMetadata = {
  buildId: string;
  outputPaths: {
    schemPath: string;
  };
};

const execFileAsync = promisify(execFile);

function safeBuildId(buildId: string): string | null {
  return /^[a-zA-Z0-9_.-]+$/.test(buildId) ? buildId : null;
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

async function openPathInOs(absolutePath: string): Promise<{ ok: boolean; message: string }> {
  try {
    if (process.platform === "win32") {
      await execFileAsync("cmd", ["/c", "start", "", absolutePath]);
      return { ok: true, message: "Opened output folder with Windows shell." };
    }

    if (process.platform === "darwin") {
      await execFileAsync("open", [absolutePath]);
      return { ok: true, message: "Opened output folder with macOS open." };
    }

    await execFileAsync("xdg-open", [absolutePath]);
    return { ok: true, message: "Opened output folder with xdg-open." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not open output folder from this runtime.",
    };
  }
}

export async function POST(_request: Request, context: RouteContext) {
  const params = await Promise.resolve(context.params);
  const buildId = safeBuildId(params.buildId);

  if (!buildId) {
    return Response.json({ ok: false, message: "Invalid schematic build id." }, { status: 400 });
  }

  const root = process.cwd();
  const metadata = await readMetadata(root, buildId);

  if (!metadata) {
    return Response.json({ ok: false, message: "Schematic metadata not found." }, { status: 404 });
  }

  const absoluteSchemPath = toProjectAbsolutePath(root, metadata.outputPaths.schemPath);

  if (!absoluteSchemPath) {
    return Response.json({ ok: false, message: "Refused unsafe schematic output path." }, { status: 400 });
  }

  const folder = path.dirname(absoluteSchemPath);
  await fs.mkdir(folder, { recursive: true });
  const openResult = await openPathInOs(folder);
  const status = openResult.ok ? 200 : 500;

  return Response.json(
    {
      ok: openResult.ok,
      buildId,
      folder,
      message: openResult.ok
        ? openResult.message
        : `${openResult.message} Open this folder manually: ${folder}`,
    },
    { status },
  );
}
