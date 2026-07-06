import Link from "next/link";
import { getPrimaryNavigationRoutes } from "@/lib/chernobog-ui/routeRegistry";

export function ChernobogSidebar() {
  const routes = getPrimaryNavigationRoutes();

  return (
    <aside className="flex h-full flex-col border-r border-[#5d3214]/80 bg-[#030303] p-2.5 shadow-[inset_-1px_0_0_rgba(255,154,58,0.06)]">
      <div className="border border-[#5d3214]/70 bg-[#080604] p-2.5">
        <div className="text-[8px] uppercase tracking-[0.38em] text-[#c9782f]/70">
          Chernobog
        </div>
        <div className="mt-1.5 text-base font-semibold uppercase tracking-[0.16em] text-[#ffe0ac]">
          Override
        </div>
        <div className="mt-1.5 text-[8px] uppercase tracking-[0.2em] text-[#8e785c]">
          Command Interface
        </div>
      </div>

      <nav className="mt-2.5 grid gap-2">
        {routes.map((route) => (
          <Link
            key={route.id}
            href={route.path}
            className="group border border-[#5d3214]/60 bg-[#070504] px-2.5 py-2.5 transition hover:border-[#c9782f]/90 hover:bg-[#120a05]"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ffe0ac] group-hover:text-white">
              {route.label}
            </div>
            <div className="mt-1 font-mono text-[8px] text-[#c9782f]/75">
              {route.path}
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[7px] uppercase tracking-[0.18em] text-[#6f5a42]">
              <span>{route.kind}</span>
              <span>{route.status}</span>
            </div>
          </Link>
        ))}
      </nav>

      <div className="mt-auto border border-[#5d3214]/55 bg-black/25 p-2.5">
        <div className="text-[8px] uppercase tracking-[0.28em] text-[#8e785c]">
          Signal
        </div>
        <div className="mt-2 h-7 border border-[#5d3214]/45 bg-[radial-gradient(circle_at_center,rgba(255,154,58,0.25),transparent_45%)]" />
      </div>
    </aside>
  );
}
