import Link from "next/link";

import type { Project } from "@/lib/modules/project-operations";
import { getProjectStats } from "@/lib/modules/project-operations";

import {
  MachinePanel,
  StatusPill,
} from "./ui";

export function ProjectCard({ project }: { project: Project }) {
  const stats = getProjectStats(project);

  return (
    <MachinePanel className="p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd09a]">
              {project.name}
            </h3>
            <StatusPill value={project.status} />
            <StatusPill value={project.repoHealth} />
          </div>
          <p className="mt-2 text-[11px] leading-5 text-[#8f6a45]">
            {project.summary}
          </p>
        </div>

        <Link
          href={`/projects/${project.slug}`}
          className="shrink-0 border border-[#7c451e]/75 bg-[#120904] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-[#d99a54] transition hover:border-[#ff9d2e] hover:text-[#ffe1b7]"
        >
          Open
        </Link>
      </div>

      <div className="mt-3 border-l border-[#ff9d2e]/35 pl-3">
        <div className="text-[8px] uppercase tracking-[0.22em] text-[#8f5b2a]">Next action</div>
        <p className="mt-1 text-xs leading-5 text-[#d5a36e]">{project.nextAction}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#4f2b14]/45 pt-2 text-[8px] uppercase tracking-[0.16em] text-[#765237]">
        <span><strong className="text-[#c8945e]">{stats.doingCount}</strong> doing</span>
        <span><strong className="text-[#c8945e]">{stats.urgentCount}</strong> urgent</span>
        <span><strong className="text-[#c8945e]">{stats.progress}%</strong> complete</span>
        <div className="h-1 min-w-24 flex-1 overflow-hidden bg-[#1e120a]">
          <div
            className="h-full bg-[#c9782f]"
            style={{ width: `${stats.progress}%` }}
          />
        </div>
      </div>
    </MachinePanel>
  );
}
