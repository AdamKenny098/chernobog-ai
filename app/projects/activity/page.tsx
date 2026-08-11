import { ActivityList } from "@/components/project-operations/ActivityList";
import { MachinePanel } from "@/components/project-operations/ui";
import { getRecentActivity } from "@/lib/modules/project-operations";

export const dynamic = "force-dynamic";

export default function ProjectActivityPage() {
  const activity = getRecentActivity(100);

  return (
    <div className="space-y-5">
      <header className="border border-[#6a3918]/75 bg-[#050302]/95 p-4">
        <div className="text-[9px] uppercase tracking-[0.34em] text-[#9a5e2b]">Operational trace</div>
        <h1 className="mt-2 text-xl font-semibold uppercase tracking-[0.2em] text-[#ffd09a]">Project Activity</h1>
        <p className="mt-3 text-xs leading-6 text-[#a77f58]">Recent project, task, note, link, and system changes across active workspaces.</p>
      </header>

      <MachinePanel label="Cross-project trace" className="p-4">
        <ActivityList activity={activity} />
      </MachinePanel>
    </div>
  );
}
