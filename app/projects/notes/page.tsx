import Link from "next/link";

import { MachinePanel, SectionLabel, formatDateTime } from "@/components/project-operations/ui";
import { getAllNotes, getPinnedNotes } from "@/lib/modules/project-operations";

export const dynamic = "force-dynamic";

export default function ProjectNotesPage() {
  const pinnedNotes = getPinnedNotes();
  const notes = getAllNotes();

  return (
    <div className="space-y-5">
      <header className="border border-[#6a3918]/75 bg-[#050302]/95 p-4">
        <div className="text-[9px] uppercase tracking-[0.34em] text-[#9a5e2b]">Project memory</div>
        <h1 className="mt-2 text-xl font-semibold uppercase tracking-[0.2em] text-[#ffd09a]">Notes</h1>
        <p className="mt-3 text-xs leading-6 text-[#a77f58]">Pinned decisions and operating context across every active project.</p>
      </header>

      <section className="space-y-3">
        <SectionLabel overline="priority context" title="Pinned notes" />
        <div className="grid gap-3 xl:grid-cols-3">
          {pinnedNotes.map(({ project, note }) => (
            <Link key={`${project.id}-${note.id}`} href={`/projects/${project.slug}`}>
              <MachinePanel className="h-full border-[#d1ad48]/30 p-4 transition hover:border-[#e0c36f]/55">
                <div className="text-[8px] uppercase tracking-[0.22em] text-[#b59644]">{project.name}</div>
                <h2 className="mt-2 text-sm font-semibold text-[#efcf83]">{note.title}</h2>
                <p className="mt-3 text-xs leading-6 text-[#aa8759]">{note.content}</p>
                <div className="mt-3 text-[9px] text-[#765237]">Updated {formatDateTime(note.updatedAt)}</div>
              </MachinePanel>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel overline="all context" title="Active notes" right={<span className="text-[9px] text-[#765237]">{notes.length} recorded</span>} />
        <div className="grid gap-3 xl:grid-cols-3">
          {notes.map(({ project, note }) => (
            <Link key={`${project.id}-${note.id}`} href={`/projects/${project.slug}`}>
              <MachinePanel className="h-full p-4 transition hover:border-[#ff9d2e]/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[8px] uppercase tracking-[0.22em] text-[#8f5b2a]">{project.name}</div>
                  {note.pinned ? <span className="text-[8px] uppercase tracking-[0.16em] text-[#d1ad48]">pinned</span> : null}
                </div>
                <h2 className="mt-2 text-sm font-semibold text-[#e4b77f]">{note.title}</h2>
                <p className="mt-3 text-xs leading-6 text-[#98704c]">{note.content}</p>
              </MachinePanel>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
