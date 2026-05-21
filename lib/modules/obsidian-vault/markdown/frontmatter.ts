import type { VaultNoteFrontmatter } from "../types";

export type ParsedMarkdown = {
  frontmatter: VaultNoteFrontmatter;
  body: string;
  rawFrontmatter?: string;
};

function parseScalar(value: string): string | number | boolean | string[] | null {
  const trimmed = value.trim();

  if (trimmed === "") return "";
  if (trimmed === "null") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }

  return trimmed.replace(/^['"]|['"]$/g, "");
}

export function parseFrontmatter(markdown: string): ParsedMarkdown {
  if (!markdown.startsWith("---\n")) {
    return {
      frontmatter: {},
      body: markdown,
    };
  }

  const closingIndex = markdown.indexOf("\n---", 4);

  if (closingIndex === -1) {
    return {
      frontmatter: {},
      body: markdown,
    };
  }

  const rawFrontmatter = markdown.slice(4, closingIndex).trim();
  const body = markdown.slice(closingIndex + "\n---".length).replace(/^\n/, "");
  const frontmatter: VaultNoteFrontmatter = {};

  for (const line of rawFrontmatter.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();

    if (key) {
      frontmatter[key] = parseScalar(value);
    }
  }

  return {
    frontmatter,
    body,
    rawFrontmatter,
  };
}

function formatValue(value: VaultNoteFrontmatter[string]): string {
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
  if (typeof value === "string") {
    if (/^[a-zA-Z0-9_./ -]+$/.test(value)) return value;
    return JSON.stringify(value);
  }

  return String(value);
}

export function buildFrontmatter(frontmatter: VaultNoteFrontmatter): string {
  const entries = Object.entries(frontmatter).filter(([, value]) => value !== undefined);

  if (entries.length === 0) return "";

  return [
    "---",
    ...entries.map(([key, value]) => `${key}: ${formatValue(value)}`),
    "---",
    "",
  ].join("\n");
}

export function replaceFrontmatter(
  markdown: string,
  nextFrontmatter: VaultNoteFrontmatter
): string {
  const parsed = parseFrontmatter(markdown);
  return `${buildFrontmatter(nextFrontmatter)}${parsed.body}`;
}
