import Link from "next/link";
import { getPrimaryNavigationRoutes } from "@/lib/chernobog-ui/routeRegistry";

export function ChernobogSidebar() {
  const routes = getPrimaryNavigationRoutes();

  return (
    <aside className="flex h-full flex-col border-r border-[#6f3d18]/70 bg-[#030303] p-4 shadow-[inset_-1px_0_0_rgba(255,154,58,0.06)]">
      <div className="border border-[#6f3d18]/60 bg-[#080604] p-3">
        <div className="text-[9px] uppercase tracking-[0.42em] text-[#c9782f]/70">
          Chernobog
        </div>
        <div className="mt-2 text-lg font-semibold uppercase tracking-[0.16em] text-[#ffe0ac]">
          Override
        </div>
        <div className="mt-2 text-[9px] uppercase tracking-[0.22em] text-[#8e785c]">
          Command Interface
        </div>
      </div>

      <nav className="mt-4 grid gap-2">
        {routes.map((route) => (
          <Link
            key={route.id}
            href={route.path}
            className="group border border-[#6f3d18]/55 bg-[#070504] px-3 py-3 transition hover:border-[#c9782f]/90 hover:bg-[#120a05]"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ffe0ac] group-hover:text-white">
              {route.label}
            </div>
            <div className="mt-1 font-mono text-[10px] text-[#c9782f]/75">
              {route.path}
            </div>
            <div className="mt-2 flex items-center justify-between text-[8px] uppercase tracking-[0.2em] text-[#6f5a42]">
              <span>{route.kind}</span>
              <span>{route.status}</span>
            </div>
          </Link>
        ))}
      </nav>

      <div className="mt-auto border border-[#6f3d18]/50 bg-black/25 p-3">
        <div className="text-[9px] uppercase tracking-[0.3em] text-[#8e785c]">
          Signal
        </div>
        <div className="mt-2 h-8 border border-[#6f3d18]/45 bg-[radial-gradient(circle_at_center,rgba(255,154,58,0.25),transparent_45%)]" />
      </div>
    </aside>
  );
}
