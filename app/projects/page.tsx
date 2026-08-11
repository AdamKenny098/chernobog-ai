import Link from "next/link";

import { createProjectAction } from "./actions";
import { ProjectCard } from "@/components/project-operations/ProjectCard";
import {
  MachinePanel,
  SectionLabel,
  StatusPill,
  buttonClass,
  inputClass,
} from "@/components/project-operations/ui";
import {
  getDashboardSnapshot,
  getProjectStats,
} from "@/lib/modules/project-operations";

export const dynamic = "force-dynamic";

function OperationsStat({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="min-w-0 px-2 py-2 sm:px-3">
      <div className="text-[7px] uppercase tracking-[0.2em] text-[#765237]">
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono text-sm font-semibold ${
          alert && value > 0 ? "text-[#ff9a73]" : "text-[#d7a56b]"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const snapshot = getDashboardSnapshot();
  const focusStats = snapshot.commandFocus
    ? getProjectStats(snapshot.commandFocus)
    : undefined;
  const hasQueuedWork =
    snapshot.doingTasks.length > 0 || snapshot.urgentTasks.length > 0;

  return (
    <div className="space-y-3">
      {snapshot.commandFocus && focusStats ? (
        <MachinePanel label="Command focus" className="border-[#ff9d2e]/45">
          <div className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-semibold uppercase tracking-[0.2em] text-[#ffd09a]">
                    {snapshot.commandFocus.name}
                  </h1>
                  <StatusPill value={snapshot.commandFocus.status} />
                  <StatusPill value={snapshot.commandFocus.repoHealth} />
                </div>
                <p className="mt-2 max-w-2xl text-[11px] leading-5 text-[#8f6a45]">
                  {snapshot.commandFocus.summary}
                </p>
              </div>
              <Link
                href={`/projects/${snapshot.commandFocus.slug}`}
                className={buttonClass}
              >
                Open workspace
              </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[0.85fr_1.15fr]">
              <div className="border-l border-[#6a3918]/70 pl-3">
                <div className="text-[8px] uppercase tracking-[0.24em] text-[#765237]">
                  Current objective
                </div>
                <p className="mt-1.5 text-xs leading-5 text-[#b98b5d]">
                  {snapshot.commandFocus.focus}
                </p>
              </div>
              <div className="border border-[#9b5927]/65 bg-[#120904]/70 px-3 py-2.5">
                <div className="text-[8px] font-semibold uppercase tracking-[0.24em] text-[#a76d36]">
                  Next move
                </div>
                <p className="mt-1.5 text-sm leading-5 text-[#f0bd7e]">
                  {snapshot.commandFocus.nextAction}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 divide-x divide-[#4f2b14]/55 border-t border-[#5d3214]/55 bg-black/20">
            <OperationsStat label="Projects" value={snapshot.projects.length} />
            <OperationsStat label="Doing" value={snapshot.doingTasks.length} />
            <OperationsStat label="Urgent" value={snapshot.urgentTasks.length} alert />
            <OperationsStat label="Blocked" value={snapshot.blockedProjects.length} alert />
            <OperationsStat label="Stale" value={snapshot.staleProjects.length} alert />
          </div>
        </MachinePanel>
      ) : (
        <MachinePanel className="p-4">
          <h1 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffd09a]">
            No command focus selected
          </h1>
          <p className="mt-2 text-xs text-[#8f6a45]">
            Create a workspace, then set its next action to begin.
          </p>
        </MachinePanel>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
        <section className="space-y-2.5">
          <SectionLabel
            overline="Portfolio"
            title="Active projects"
            right={
              <span className="font-mono text-[9px] text-[#765237]">
                {snapshot.projects.length} workspaces
              </span>
            }
          />
          <div className="space-y-2.5">
            {snapshot.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>

        <MachinePanel label="Work queue">
          <div className="p-3">
            {!hasQueuedWork ? (
              <div className="border border-dashed border-[#5d3214]/55 px-3 py-5 text-center">
                <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#9a6a3d]">
                  Queue clear
                </div>
                <p className="mt-2 text-[11px] leading-5 text-[#765237]">
                  Open a workspace and move one concrete task into Doing.
                </p>
              </div>
            ) : null}

            {snapshot.doingTasks.length > 0 ? (
              <div>
                <div className="mb-2 flex items-center justify-between text-[8px] uppercase tracking-[0.2em] text-[#8f5b2a]">
                  <span>Doing now</span>
                  <span>{snapshot.doingTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {snapshot.doingTasks.slice(0, 4).map(({ project, board, card }) => (
                    <Link
                      key={card.id}
                      href={`/projects/${project.slug}`}
                      className="block border-l-2 border-[#c9782f]/65 bg-black/20 px-3 py-2 transition hover:bg-[#120904]"
                    >
                      <div className="text-[11px] font-semibold text-[#e4b77f]">
                        {card.title}
                      </div>
                      <div className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[#765237]">
                        {project.name} · {board.name}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {snapshot.urgentTasks.length > 0 ? (
              <div className={snapshot.doingTasks.length > 0 ? "mt-4 border-t border-[#4f2b14]/55 pt-3" : ""}>
                <div className="mb-2 flex items-center justify-between text-[8px] uppercase tracking-[0.2em] text-[#a65f49]">
                  <span>Urgent</span>
                  <span>{snapshot.urgentTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {snapshot.urgentTasks.slice(0, 4).map(({ project, card }) => (
                    <Link
                      key={card.id}
                      href={`/projects/${project.slug}`}
                      className="block border-l-2 border-[#ff4a3d]/55 bg-[#ff4a3d]/5 px-3 py-2 transition hover:bg-[#ff4a3d]/10"
                    >
                      <div className="text-[11px] font-semibold text-[#efb3a7]">
                        {card.title}
                      </div>
                      <div className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[#8d584c]">
                        {project.name}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </MachinePanel>
      </div>

      <details className="group border border-[#4f2b14]/65 bg-[#050302]/75">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-[#8b6039] transition hover:text-[#d99a54] [&::-webkit-details-marker]:hidden">
          <span>New project workspace</span>
          <span className="font-mono text-[#765237] group-open:hidden">+</span>
          <span className="hidden font-mono text-[#765237] group-open:inline">−</span>
        </summary>
        <form
          action={createProjectAction}
          className="grid gap-2 border-t border-[#4f2b14]/55 p-3 lg:grid-cols-2"
        >
          <input className={inputClass} name="name" placeholder="Project name" required />
          <input className={inputClass} name="repoName" placeholder="Repository name" required />
          <input className={inputClass} name="summary" placeholder="What is this project for?" required />
          <input className={inputClass} name="repoPath" placeholder="Local repo path (optional)" />
          <button className={`${buttonClass} lg:col-span-2 lg:justify-self-end`} type="submit">
            Create workspace
          </button>
        </form>
      </details>
    </div>
  );
}
