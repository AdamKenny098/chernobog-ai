import path from "node:path";
import { getVaultRoot } from "../config";
import { relativeToVault } from "../paths";
import { buildWikiLink } from "../markdown/wikilinks";
import { scanVaultNotes } from "./scanVault";
import { writeVaultNote } from "../markdown/writeNote";

export type GenerateProjectIndexResult = {
  project: string;
  path: string;
  relativePath: string;
  noteCount: number;
};

function inferProjectFolder(project: string): string {
  return path.posix.join("02_Projects", project);
}

export async function generateProjectIndex(
  project: string,
  options: { folder?: string; overwrite?: boolean } = {}
): Promise<GenerateProjectIndexResult> {
  const folder = options.folder ?? inferProjectFolder(project);
  const notes = await scanVaultNotes({ folder });
  const date = new Date().toISOString().slice(0, 10);

  const grouped = new Map<string, typeof notes>();

  for (const note of notes) {
    const type = typeof note.frontmatter.type === "string" ? note.frontmatter.type : "note";
    const existing = grouped.get(type) ?? [];
    existing.push(note);
    grouped.set(type, existing);
  }

  const sections = [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, typeNotes]) => {
      const lines = typeNotes
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((note) => `- ${buildWikiLink(note.title)} — ${note.relativePath}`)
        .join("\n");

      return `## ${type}\n${lines}`;
    })
    .join("\n\n");

  const body = `# ${project} Project Index\n\nGenerated: ${date}\n\n## Project\n- ${buildWikiLink(project)}\n\n${sections || "No notes found yet."}\n`;

  const result = await writeVaultNote(`${project} Project Index`, body, {
    folder,
    overwrite: options.overwrite ?? true,
    frontmatter: {
      type: "project_index",
      project,
      generated: date,
      tags: ["index", `project/${project.toLowerCase().replace(/\s+/g, "-")}`],
    },
  });

  return {
    project,
    path: result.path,
    relativePath: relativeToVault(result.path, getVaultRoot()),
    noteCount: notes.length,
  };
}
