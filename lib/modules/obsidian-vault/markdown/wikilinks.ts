import { normalizeNoteTitle } from "../paths";

const WIKILINK_REGEX = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

export function extractWikiLinks(markdown: string): string[] {
  const links = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = WIKILINK_REGEX.exec(markdown)) !== null) {
    const target = normalizeNoteTitle(match[1]);
    if (target) links.add(target);
  }

  return [...links].sort((a, b) => a.localeCompare(b));
}

export function hasWikiLink(markdown: string, targetTitle: string): boolean {
  const target = normalizeNoteTitle(targetTitle).toLowerCase();
  return extractWikiLinks(markdown).some(
    (link) => normalizeNoteTitle(link).toLowerCase() === target
  );
}

export function buildWikiLink(targetTitle: string, label?: string): string {
  const target = normalizeNoteTitle(targetTitle);
  const cleanLabel = label?.trim();
  return cleanLabel && cleanLabel !== target
    ? `[[${target}|${cleanLabel}]]`
    : `[[${target}]]`;
}

export function ensureLinksSection(markdown: string): string {
  if (/^## Links\s*$/im.test(markdown)) return markdown;

  const suffix = markdown.endsWith("\n") ? "" : "\n";
  return `${markdown}${suffix}\n## Links\n`;
}

export function addWikiLinkToLinksSection(
  markdown: string,
  targetTitle: string,
  relationship = "Related"
): string {
  if (hasWikiLink(markdown, targetTitle)) return markdown;

  const withSection = ensureLinksSection(markdown);
  const linkLine = `- ${relationship}: ${buildWikiLink(targetTitle)}`;

  return `${withSection.trimEnd()}\n${linkLine}\n`;
}
