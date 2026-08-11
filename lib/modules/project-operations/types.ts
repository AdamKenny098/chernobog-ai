export type ProjectStatus =
  | "Active"
  | "Planning"
  | "Blocked"
  | "Polish"
  | "Archived";

export type RepoHealth = "Healthy" | "Watch" | "Needs Attention";

export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export type TaskColumnId = "backlog" | "next" | "doing" | "done";

export type ActivityType = "project" | "task" | "note" | "link" | "system";

export type ProjectActivityEntry = {
  id: string;
  type: ActivityType;
  summary: string;
  detail?: string;
  createdAt: string;
};

export type ProjectTaskCard = {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  due: string;
  urgent: boolean;
  column: TaskColumnId;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectBoard = {
  id: string;
  name: string;
  description: string;
  cards: ProjectTaskCard[];
};

export type ProjectNote = {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProjectLink = {
  id: string;
  label: string;
  url: string;
  type: string;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  summary: string;
  status: ProjectStatus;
  repoHealth: RepoHealth;
  repoName: string;
  repoPath?: string;
  focus: string;
  nextAction: string;
  blockers: string[];
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  boards: ProjectBoard[];
  notes: ProjectNote[];
  links: ProjectLink[];
  activity: ProjectActivityEntry[];
};

export type ProjectStats = {
  boardCount: number;
  noteCount: number;
  urgentCount: number;
  doingCount: number;
  totalCards: number;
  doneCount: number;
  progress: number;
  blocked: boolean;
};

export type ProjectTaskResult = {
  project: Project;
  board: ProjectBoard;
  card: ProjectTaskCard;
};

export type ProjectNoteResult = {
  project: Project;
  note: ProjectNote;
};

export type RecentActivityResult = {
  project: Project;
  entry: ProjectActivityEntry;
};

export type ProjectDashboardSnapshot = {
  projects: Project[];
  commandFocus?: Project;
  urgentTasks: ProjectTaskResult[];
  nextTasks: ProjectTaskResult[];
  doingTasks: ProjectTaskResult[];
  repoWatch: Project[];
  blockedProjects: Project[];
  staleProjects: Project[];
  recentActivity: RecentActivityResult[];
};

export type ProjectSettingsInput = {
  name: string;
  summary: string;
  status: ProjectStatus;
  repoHealth: RepoHealth;
  repoName: string;
  repoPath?: string;
  focus: string;
  nextAction: string;
  blockers: string[];
};

export type TaskCardInput = {
  title: string;
  description: string;
  priority: TaskPriority;
  due: string;
  urgent: boolean;
  column: TaskColumnId;
};

export type ProjectNoteInput = {
  title: string;
  content: string;
  pinned: boolean;
};

export type ProjectLinkInput = {
  label: string;
  url: string;
  type: string;
};

export type ProjectOperationsModuleCommand =
  | { kind: "project_operations_status" }
  | { kind: "project_list" }
  | { kind: "project_urgent_list" }
  | { kind: "project_show"; projectQuery: string }
  | { kind: "project_create"; name: string }
  | {
      kind: "project_task_add";
      projectQuery: string;
      title: string;
      urgent: boolean;
    }
  | {
      kind: "project_task_move";
      taskIdentifier: string;
      column: TaskColumnId;
    }
  | { kind: "project_task_complete"; taskIdentifier: string }
  | { kind: "project_focus_set"; projectQuery: string; focus: string }
  | {
      kind: "project_next_action_set";
      projectQuery: string;
      nextAction: string;
    };

export type ProjectOperationsCommandResult = {
  ok: boolean;
  title: string;
  message: string;
  data?: Record<string, unknown>;
};
