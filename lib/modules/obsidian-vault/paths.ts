import path from "node:path";
import { getVaultRoot } from "./config";
import { assertInsideVault, assertMarkdownPath } from "./policy";

const WINDOWS_FORBIDDEN_CHARS = /[<>:"|?*]/g;

export function normalizeNoteTitle(title: string): string {
  return title
    .trim()
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .replace(/\.md$/i, "")
    .replace(/\s+/g, " ");
}

export function sanitizePathSegment(segment: string): string {
  return segment
    .trim()
    .replace(WINDOWS_FORBIDDEN_CHARS, "-")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .slice(0, 160);
}

export function ensureMarkdownExtension(value: string): string {
  return value.toLowerCase().endsWith(".md") ? value : `${value}.md`;
}

export function relativeToVault(absolutePath: string, root = getVaultRoot()): string {
  return path.relative(root, absolutePath).replaceAll(path.sep, "/");
}

export function titleFromPath(notePath: string): string {
  return path.basename(notePath, path.extname(notePath));
}

export type ResolveNotePathOptions = {
  folder?: string;
  root?: string;
};

export function resolveVaultPath(relativePath: string, root = getVaultRoot()): string {
  const safeSegments = relativePath
    .replaceAll("\\", "/")
    .split("/")
    .filter(Boolean)
    .map(sanitizePathSegment);

  const resolved = path.resolve(root, ...safeSegments);
  assertInsideVault(resolved, root);
  return resolved;
}

export function resolveNotePath(
  titleOrPath: string,
  options: ResolveNotePathOptions = {}
): string {
  const root = options.root ?? getVaultRoot();
  const cleaned = titleOrPath.trim().replace(/^['"]|['"]$/g, "");

  if (!cleaned) {
    throw new Error("Vault note title/path is required.");
  }

  const normalizedSlashes = cleaned.replaceAll("\\", "/");
  const looksLikeRelativePath =
    normalizedSlashes.includes("/") || normalizedSlashes.toLowerCase().endsWith(".md");

  if (looksLikeRelativePath) {
    const mdPath = ensureMarkdownExtension(normalizedSlashes);
    const resolved = resolveVaultPath(mdPath, root);
    assertMarkdownPath(resolved);
    return resolved;
  }

  const folder = options.folder?.trim()
    ? options.folder.replaceAll("\\", "/")
    : "";

  const safeTitle = sanitizePathSegment(normalizeNoteTitle(cleaned));
  const relativePath = folder
    ? `${folder}/${ensureMarkdownExtension(safeTitle)}`
    : ensureMarkdownExtension(safeTitle);

  const resolved = resolveVaultPath(relativePath, root);
  assertMarkdownPath(resolved);
  return resolved;
}
