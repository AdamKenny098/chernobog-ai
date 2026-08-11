import type { ReactNode } from "react";

import {
  addProjectLinkAction,
  addProjectNoteAction,
  archiveProjectAction,
  archiveProjectNoteAction,
  deleteProjectLinkAction,
  toggleProjectNotePinnedAction,
  updateProjectNoteAction,
  updateProjectSettingsAction,
} from "@/app/projects/actions";
import type {
  Project,
  ProjectStatus,
  RepoHealth,
} from "@/lib/modules/project-operations";
import { getProjectStats } from "@/lib/modules/project-operations";

import { ActivityList } from "./ActivityList";
import { ProjectBoard } from "./ProjectBoard";
import {
  MachinePanel,
  SectionLabel,
  StatusPill,
  buttonClass,
  formatDateTime,
  inputClass,
  normalizeExternalUrl,
  quietButtonClass,
} from "./ui";

const statuses: ProjectStatus[] = ["Active", "Planning", "Blocked", "Polish"];
const repoHealthOptions: RepoHealth[] = ["Healthy", "Watch", "Needs Attention"];

const drawerClass =
  "group scroll-mt-4 border border-[#5d3214]/70 bg-[#080503]/92 shadow-[inset_0_0_0_1px_rgba(255,166,66,0.04)]";
const summaryClass =
  "flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#a87340] transition hover:bg-[#120904]/70 hover:text-[#e0a764] [&::-webkit-details-marker]:hidden";

function Readout({
  label,
  value,
  detail,
  alert = false,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  alert?: boolean;
}) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <div className="text-[7px] uppercase tracking-[0.24em] text-[#765237]">
        {label}
      </div>
      <div
        className={`mt-1 font-mono text-sm font-semibold uppercase tracking-[0.1em] ${
          alert ? "text-[#ff9a73]" : "text-[#e2ad70]"
        }`}
      >
        {value}
      </div>
      <div className="mt-1 truncate text-[7px] uppercase tracking-[0.16em] text-[#5f412b]">
        {detail}
      </div>
    </div>
  );
}

function IntelRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3 border-b border-[#4f2b14]/45 py-2 last:border-b-0">
      <div className="text-[7px] uppercase tracking-[0.2em] text-[#765237]">
        {label}
      </div>
      <div className="min-w-0 break-words text-right font-mono text-[9px] text-[#c18d5b]">
        {children}
      </div>
    </div>
  );
}

function DrawerSummary({
  label,
  meta,
}: {
  label: string;
  meta: string;
}) {
  return (
    <summary className={summaryClass}>
      <span className="flex items-center gap-3">
        <span className="font-mono text-[#c9782f] group-open:rotate-90">›</span>
        {label}
      </span>
      <span className="font-mono text-[8px] font-normal tracking-[0.16em] text-[#765237]">
        {meta}
      </span>
    </summary>
  );
}

export function ProjectWorkspace({ project }: { project: Project }) {
  const stats = getProjectStats(project);
  const activity = project.activity.map((entry) => ({ project, entry })).slice(0, 16);
  const activeNotes = project.notes.filter((note) => !note.archived);

  return (
    <div className="space-y-3">
      <header className="relative overflow-hidden border border-[#70401d]/80 bg-[radial-gradient(circle_at_75%_0%,rgba(255,140,45,0.08),transparent_36%),linear-gradient(135deg,#0b0704,#050403_70%)] shadow-[inset_0_0_0_1px_rgba(255,166,66,0.06),0_0_34px_rgba(0,0,0,0.35)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff9d2e]/65 to-transparent" />
        <div className="pointer-events-none absolute right-8 top-0 h-16 w-16 rotate-45 border-b border-l border-[#7b451e]/30" />

        <div className="relative grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <div className="text-[8px] font-semibold uppercase tracking-[0.4em] text-[#9a5e2b]">
              Project operations // active workspace
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold uppercase tracking-[0.24em] text-[#ffe0ac] md:text-3xl">
                {project.name}
              </h1>
              <div className="flex flex-wrap gap-1.5">
                <StatusPill value={project.status} />
                <StatusPill value={project.repoHealth} />
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-[11px] leading-5 text-[#a78360]">
              {project.summary}
            </p>
          </div>

          <nav aria-label={`${project.name} workspace sections`} className="flex flex-wrap gap-1.5 lg:max-w-[270px] lg:justify-end">
            {[
              ["#execution", "Execution"],
              ["#memory", "Memory"],
              ["#history", "History"],
              ["#settings", "Settings"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="border border-[#5d3214]/70 bg-black/20 px-2.5 py-1.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#98704c] transition hover:border-[#c9782f] hover:text-[#f0b66f]"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-[#4f2b14]/55 border-t border-[#5d3214]/65 bg-black/20 sm:grid-cols-5 sm:divide-y-0">
          <Readout label="Doing" value={stats.doingCount} detail="Current execution" />
          <Readout label="Urgent" value={stats.urgentCount} detail="Pressure signals" alert={stats.urgentCount > 0} />
          <Readout label="Tasks" value={stats.totalCards} detail="Active cards" />
          <Readout label="Notes" value={stats.noteCount} detail="Stored context" />
          <Readout label="Progress" value={`${stats.progress}%`} detail="Cards completed" />
        </div>
      </header>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
        <MachinePanel label="Active directive" className="min-h-[250px]">
          <div className="relative flex h-full min-h-[210px] flex-col justify-between overflow-hidden p-5">
            <div className="pointer-events-none absolute inset-5 border border-[#5d3214]/20" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#9b5927]/15 to-transparent" />
            <div className="relative">
              <div className="text-[8px] uppercase tracking-[0.34em] text-[#8f5b2a]">
                Current objective
              </div>
              <p className="mt-3 max-w-3xl text-base font-medium leading-7 text-[#efc18c]">
                {project.focus}
              </p>
            </div>

            <div className="relative mt-8 border-l-2 border-[#d27b2b]/65 bg-[#160b05]/65 px-4 py-3">
              <div className="text-[8px] font-semibold uppercase tracking-[0.28em] text-[#a76d36]">
                Recommended next move
              </div>
              <p className="mt-2 text-sm leading-6 text-[#ffd09a]">
                {project.nextAction}
              </p>
            </div>

            <div className="relative mt-5">
              <div className="mb-1.5 flex items-center justify-between text-[7px] uppercase tracking-[0.2em] text-[#765237]">
                <span>Completion signal</span>
                <span className="font-mono text-[#bd8248]">{stats.progress}%</span>
              </div>
              <div className="h-1 overflow-hidden bg-[#1e120a]">
                <div
                  className="h-full bg-gradient-to-r from-[#8b451b] via-[#d27b2b] to-[#ffd09a] shadow-[0_0_12px_rgba(255,157,46,0.35)]"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>
            </div>
          </div>
        </MachinePanel>

        <MachinePanel label="Mission intelligence" className="p-4">
          <div className="space-y-0">
            <IntelRow label="Repository">{project.repoName}</IntelRow>
            <IntelRow label="Local path">{project.repoPath || "Not linked"}</IntelRow>
            <IntelRow label="Boards">{project.boards.length} active</IntelRow>
            <IntelRow label="Last signal">{formatDateTime(project.updatedAt)}</IntelRow>
          </div>

          <div className="mt-4 border-t border-[#5d3214]/55 pt-3">
            <div className="flex items-center justify-between">
              <div className="text-[8px] font-semibold uppercase tracking-[0.24em] text-[#a76d36]">
                Blocker scan
              </div>
              <span className={`font-mono text-[9px] ${project.blockers.length > 0 ? "text-[#ff9a73]" : "text-[#79c996]"}`}>
                {project.blockers.length > 0 ? `${project.blockers.length} detected` : "clear"}
              </span>
            </div>
            {project.blockers.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {project.blockers.map((blocker) => (
                  <li key={blocker} className="border-l border-[#ff4a3d]/45 pl-3 text-[10px] leading-5 text-[#c18d7f]">
                    {blocker}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[10px] leading-5 text-[#765237]">
                No active blockers recorded for this workspace.
              </p>
            )}
          </div>
        </MachinePanel>
      </section>

      <section id="execution" className="scroll-mt-4 space-y-3">
        <SectionLabel
          overline="Execution matrix"
          title="Project boards"
          right={
            <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-[#765237]">
              {stats.totalCards} cards // {project.boards.length} boards
            </span>
          }
        />
        {project.boards.map((board) => (
          <ProjectBoard key={board.id} projectSlug={project.slug} board={board} />
        ))}
      </section>

      <details id="memory" className={drawerClass}>
        <DrawerSummary
          label="Project memory and references"
          meta={`${activeNotes.length} notes // ${project.links.length} links`}
        />
        <div className="grid gap-3 border-t border-[#5d3214]/55 p-3 xl:grid-cols-[1.15fr_0.85fr]">
          <MachinePanel label="Project notes" className="p-3">
            <form action={addProjectNoteAction} className="grid gap-2 border border-[#5d3214]/50 bg-black/20 p-3">
              <input type="hidden" name="slug" value={project.slug} />
              <input className={inputClass} name="title" placeholder="Note title" required />
              <textarea className={inputClass} name="content" placeholder="Decision, context, rule, or reminder" rows={3} required />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-xs text-[#9f7955]"><input type="checkbox" name="pinned" /> Pin note</label>
                <button className={buttonClass} type="submit">Add note</button>
              </div>
            </form>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {activeNotes.map((note) => (
                <article key={note.id} className="border border-[#5d3214]/55 bg-[#050302] p-3">
                  <form action={updateProjectNoteAction} className="grid gap-2">
                    <input type="hidden" name="slug" value={project.slug} />
                    <input type="hidden" name="noteId" value={note.id} />
                    <div className="flex items-center gap-2">
                      <input className={inputClass} name="title" defaultValue={note.title} required />
                      {note.pinned ? <span className="text-[8px] uppercase tracking-[0.16em] text-[#e0c36f]">pinned</span> : null}
                    </div>
                    <textarea className={inputClass} name="content" defaultValue={note.content} rows={4} required />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs text-[#9f7955]"><input type="checkbox" name="pinned" defaultChecked={note.pinned} /> Pinned</label>
                      <button className={buttonClass} type="submit">Save</button>
                    </div>
                  </form>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={toggleProjectNotePinnedAction}>
                      <input type="hidden" name="slug" value={project.slug} />
                      <input type="hidden" name="noteId" value={note.id} />
                      <button className={quietButtonClass} type="submit">{note.pinned ? "Unpin" : "Pin"}</button>
                    </form>
                    <form action={archiveProjectNoteAction}>
                      <input type="hidden" name="slug" value={project.slug} />
                      <input type="hidden" name="noteId" value={note.id} />
                      <button className={quietButtonClass} type="submit">Archive</button>
                    </form>
                  </div>
                </article>
              ))}
              {activeNotes.length === 0 ? (
                <div className="border border-dashed border-[#5d3214]/45 p-4 text-center text-[10px] text-[#765237] lg:col-span-2">
                  No active notes. Add only context worth carrying forward.
                </div>
              ) : null}
            </div>
          </MachinePanel>

          <MachinePanel label="Project links" className="p-3">
            <form action={addProjectLinkAction} className="grid gap-2">
              <input type="hidden" name="slug" value={project.slug} />
              <input className={inputClass} name="label" placeholder="Link label" required />
              <input className={inputClass} name="url" placeholder="URL" required />
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <input className={inputClass} name="type" defaultValue="Reference" required />
                <button className={buttonClass} type="submit">Add link</button>
              </div>
            </form>
            <div className="mt-4 space-y-2">
              {project.links.map((link) => (
                <article key={link.id} className="border-l border-[#7c451e]/70 bg-black/20 px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#e4b77f]">{link.label}</div>
                      <div className="mt-1 text-[8px] uppercase tracking-[0.16em] text-[#765237]">{link.type}</div>
                    </div>
                    <form action={deleteProjectLinkAction}>
                      <input type="hidden" name="slug" value={project.slug} />
                      <input type="hidden" name="linkId" value={link.id} />
                      <button className={quietButtonClass} type="submit">Remove</button>
                    </form>
                  </div>
                  <a href={normalizeExternalUrl(link.url)} target="_blank" rel="noreferrer" className="mt-2 block truncate text-[10px] text-[#b5773e] hover:text-[#ffc27f]">{link.url}</a>
                </article>
              ))}
              {project.links.length === 0 ? <div className="border border-dashed border-[#5d3214]/45 p-4 text-center text-[10px] text-[#765237]">No links recorded.</div> : null}
            </div>
          </MachinePanel>
        </div>
      </details>

      <details className={drawerClass}>
        <DrawerSummary label="Console command deck" meta="4 shortcuts" />
        <div className="grid gap-2 border-t border-[#5d3214]/55 p-3 lg:grid-cols-2">
          <code className="border-l border-[#9b5927]/70 bg-black/25 px-3 py-2 text-[10px] text-[#c9894d]">show project {project.name}</code>
          <code className="border-l border-[#9b5927]/70 bg-black/25 px-3 py-2 text-[10px] text-[#c9894d]">add task to {project.name}: &lt;title&gt;</code>
          <code className="border-l border-[#9b5927]/70 bg-black/25 px-3 py-2 text-[10px] text-[#c9894d]">set project {project.name} focus: &lt;focus&gt;</code>
          <code className="border-l border-[#9b5927]/70 bg-black/25 px-3 py-2 text-[10px] text-[#c9894d]">set project {project.name} next action: &lt;action&gt;</code>
        </div>
      </details>

      <details id="history" className={drawerClass}>
        <DrawerSummary label="Activity trace" meta={`${activity.length} recent signals`} />
        <div className="border-t border-[#5d3214]/55 p-3">
          <ActivityList activity={activity} showProject={false} />
        </div>
      </details>

      <details id="settings" className={drawerClass}>
        <DrawerSummary label="Project configuration and archive" meta="restricted controls" />
        <div className="border-t border-[#5d3214]/55 p-3">
          <form action={updateProjectSettingsAction} className="grid gap-3">
            <input type="hidden" name="slug" value={project.slug} />
            <div className="grid gap-3 lg:grid-cols-2">
              <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Name<input className={inputClass} name="name" defaultValue={project.name} required /></label>
              <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Repository<input className={inputClass} name="repoName" defaultValue={project.repoName} required /></label>
            </div>
            <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Summary<textarea className={inputClass} name="summary" defaultValue={project.summary} rows={3} required /></label>
            <div className="grid gap-3 lg:grid-cols-3">
              <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Status<select className={inputClass} name="status" defaultValue={project.status}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
              <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Repo health<select className={inputClass} name="repoHealth" defaultValue={project.repoHealth}>{repoHealthOptions.map((health) => <option key={health}>{health}</option>)}</select></label>
              <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Local repo path<input className={inputClass} name="repoPath" defaultValue={project.repoPath ?? ""} placeholder="C:\\path\\to\\repo" /></label>
            </div>
            <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Current focus<input className={inputClass} name="focus" defaultValue={project.focus} required /></label>
            <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Next action<input className={inputClass} name="nextAction" defaultValue={project.nextAction} required /></label>
            <label className="grid gap-1 text-[9px] uppercase tracking-[0.16em] text-[#8d623e]">Blockers, one per line<textarea className={inputClass} name="blockers" defaultValue={project.blockers.join("\n")} rows={4} /></label>
            <button className={`${buttonClass} w-fit`} type="submit">Save configuration</button>
          </form>

          <div className="mt-5 border-t border-[#ff4a3d]/25 pt-4">
            <div className="text-[8px] font-semibold uppercase tracking-[0.24em] text-[#a65f49]">Archive control</div>
            <p className="mt-2 text-[10px] leading-5 text-[#8d6851]">Archiving hides this workspace from active views. Its SQLite record remains recoverable.</p>
            <form action={archiveProjectAction} className="mt-3">
              <input type="hidden" name="slug" value={project.slug} />
              <button className="border border-[#ff4a3d]/40 bg-[#ff4a3d]/5 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[#ff9f96] transition hover:bg-[#ff4a3d]/10" type="submit">Archive project</button>
            </form>
          </div>
        </div>
      </details>
    </div>
  );
}
