import Link from "next/link";

import { MachinePanel } from "@/components/project-operations/ui";

export default function ProjectNotFound() {
  return (
    <MachinePanel label="Workspace unavailable" className="p-5">
      <h1 className="text-base font-semibold uppercase tracking-[0.18em] text-[#ffd09a]">Project not found</h1>
      <p className="mt-3 text-xs leading-6 text-[#9f7955]">The project does not exist or has been archived.</p>
      <Link href="/projects" className="mt-4 inline-block border border-[#9b5927]/75 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-[#f0b66f]">Return to Project Operations</Link>
    </MachinePanel>
  );
}
