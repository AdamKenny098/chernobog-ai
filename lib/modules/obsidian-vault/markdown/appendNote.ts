import fs from "node:fs/promises";
import { assertVaultMarkdownPath } from "../policy";
import { relativeToVault, resolveNotePath, titleFromPath } from "../paths";

export type AppendVaultNoteOptions = {
  folder?: string;
  heading?: string;
  createIfMissing?: boolean;
};

export type AppendVaultNoteResult = {
  title: string;
  path: string;
  relativePath: string;
  appendedChars: number;
  created: boolean;
};

export async function appendVaultNote(
  titleOrPath: string,
  content: string,
  options: AppendVaultNoteOptions = {}
): Promise<AppendVaultNoteResult> {
  const notePath = resolveNotePath(titleOrPath, { folder: options.folder });
  assertVaultMarkdownPath(notePath);

  const exists = await fs
    .access(notePath)
    .then(() => true)
    .catch(() => false);

  if (!exists && !options.createIfMissing) {
    throw new Error(`Vault note does not exist: ${relativeToVault(notePath)}`);
  }

  if (!exists) {
    await fs.writeFile(notePath, `# ${titleFromPath(notePath)}\n`, "utf8");
  }

  const heading = options.heading?.trim();
  const block = [
    "",
    heading ? `## ${heading}` : null,
    content.trim(),
    "",
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  await fs.appendFile(notePath, block, "utf8");

  return {
    title: titleFromPath(notePath),
    path: notePath,
    relativePath: relativeToVault(notePath),
    appendedChars: content.length,
    created: !exists,
  };
}
