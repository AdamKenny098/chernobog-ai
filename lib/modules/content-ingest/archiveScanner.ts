import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const READABLE_EXTENSIONS = new Set([
  ".json",
  ".txt",
  ".csv",
  ".html",
  ".htm",
  ".md",
]);

export function createRunId(prefix: string) {
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");

  return `${prefix}-${stamp}-${crypto.randomUUID().slice(0, 8)}`;
}

export function hashText(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashShort(value: string) {
  return hashText(value).slice(0, 16);
}

export function resolveArchivePath(inputPath: string) {
  const cleaned = inputPath.trim().replace(/^["']|["']$/g, "");

  return path.isAbsolute(cleaned)
    ? cleaned
    : path.join(process.cwd(), cleaned);
}

export async function listArchiveFiles(inputPath: string): Promise<string[]> {
  const absolutePath = resolveArchivePath(inputPath);
  const stat = await fs.stat(absolutePath);

  if (stat.isFile()) {
    return [absolutePath];
  }

  const output: string[] = [];

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      const child = path.join(current, entry.name);

      if (entry.isDirectory()) {
        await walk(child);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();

      if (READABLE_EXTENSIONS.has(extension)) {
        output.push(child);
      }
    }
  }

  await walk(absolutePath);
  return output;
}

export async function readArchiveTextFiles(inputPath: string) {
  const files = await listArchiveFiles(inputPath);
  const readable: Array<{ path: string; text: string }> = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const text = await fs.readFile(file, "utf8");
      readable.push({
        path: file,
        text,
      });
    } catch (error) {
      errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    files,
    readable,
    errors,
  };
}

export function cleanUrl(url: string) {
  return url
    .replace(/&amp;/g, "&")
    .replace(/[),.;\]]+$/g, "")
    .trim();
}
