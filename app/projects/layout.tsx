import Link from "next/link";
import type { ReactNode } from "react";

import { ChernobogShell } from "@/components/chernobog-ui/ChernobogShell";

const links = [
  { href: "/projects", label: "Overview" },
  { href: "/projects/notes", label: "Notes" },
  { href: "/projects/activity", label: "Activity" },
  { href: "/command", label: "Console" },
];

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <ChernobogShell currentArea="Project Operations">
      <nav
        aria-label="Project Operations"
        className="mb-3 flex min-h-8 flex-wrap items-center gap-x-1 border-b border-[#5d3214]/65 bg-[#050302]/60 px-1"
      >
        <span className="mr-2 hidden text-[8px] font-semibold uppercase tracking-[0.28em] text-[#765237] sm:inline">
          Project Ops
        </span>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="border-b border-transparent px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8b6039] transition hover:border-[#ff9d2e]/70 hover:text-[#ffd09a]"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </ChernobogShell>
  );
}
