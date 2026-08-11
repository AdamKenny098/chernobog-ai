import Link from "next/link";

import type { RecentActivityResult } from "@/lib/modules/project-operations";

import { formatDateTime } from "./ui";

const activityClasses: Record<RecentActivityResult["entry"]["type"], string> = {
  project: "border-[#6aa8ff]/35 text-[#9bc3ff]",
  task: "border-[#ff9d2e]/35 text-[#ffc27f]",
  note: "border-[#ebcf62]/35 text-[#f4df91]",
  link: "border-[#65cbd0]/35 text-[#9ce6e9]",
  system: "border-[#8d6a49]/35 text-[#b28b66]",
};

export function ActivityList({
  activity,
  showProject = true,
}: {
  activity: RecentActivityResult[];
  showProject?: boolean;
}) {
  if (activity.length === 0) {
    return (
      <div className="border border-dashed border-[#5d3214]/55 p-4 text-xs text-[#765237]">
        No activity has been recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activity.map(({ project, entry }) => (
        <article key={`${project.id}-${entry.id}`} className="border border-[#5d3214]/55 bg-black/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`border px-2 py-0.5 text-[8px] uppercase tracking-[0.18em] ${activityClasses[entry.type]}`}>
              {entry.type}
            </span>
            <span className="text-[9px] text-[#765237]">{formatDateTime(entry.createdAt)}</span>
            {showProject ? (
              <Link href={`/projects/${project.slug}`} className="text-[9px] uppercase tracking-[0.14em] text-[#b5773e] hover:text-[#ffc27f]">
                {project.name}
              </Link>
            ) : null}
          </div>
          <div className="mt-2 text-xs font-semibold text-[#e4b77f]">{entry.summary}</div>
          {entry.detail ? <p className="mt-1 text-[11px] leading-5 text-[#8f6a45]">{entry.detail}</p> : null}
        </article>
      ))}
    </div>
  );
}
