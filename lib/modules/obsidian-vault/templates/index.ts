import type { VaultNoteType } from "../types";
import { normalizeNoteTitle } from "../paths";
import { projectTemplate } from "./projectTemplate";
import { featureTemplate } from "./featureTemplate";
import { decisionTemplate } from "./decisionTemplate";
import { devLogTemplate } from "./devLogTemplate";
import { bugTemplate } from "./bugTemplate";
import { taskTemplate } from "./taskTemplate";

export type BuildTemplateInput = {
  title: string;
  type?: VaultNoteType;
  project?: string;
  summary?: string;
};

export function defaultFolderForType(type: VaultNoteType, project?: string): string | undefined {
  switch (type) {
    case "project":
      return "02_Projects";
    case "feature":
    case "task":
    case "bug":
      return project ? `02_Projects/${project}` : "02_Projects";
    case "decision":
      return "06_Decisions";
    case "dev_log":
      return "05_Logs/Daily";
    case "research":
      return "04_Resources/Research";
    case "concept":
      return "04_Resources/Concepts";
    default:
      return undefined;
  }
}

export function buildNoteTemplate(input: BuildTemplateInput): string {
  const title = normalizeNoteTitle(input.title);
  const project = input.project;

  switch (input.type ?? "note") {
    case "project":
      return projectTemplate({ title, area: input.summary });
    case "feature":
      return featureTemplate({ title, project });
    case "decision":
      return decisionTemplate({ title, project });
    case "dev_log":
      return devLogTemplate({ title, project, summary: input.summary });
    case "bug":
      return bugTemplate({ title, project });
    case "task":
      return taskTemplate({ title, project });
    default:
      return `# ${title}\n\n## Notes\n${input.summary ?? ""}\n\n## Links\n- \n`;
  }
}
