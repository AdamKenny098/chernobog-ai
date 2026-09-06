import Link from "next/link";
import { RecursiveCommandHierarchy } from "./RecursiveCommandHierarchy";
import { SensoryControlDeck } from "@/components/chernobog-ui/sensory/SensoryControlDeck";
import type { CommandCenterModel } from "./commandCenterModel";

function CommandHeader({ model }: { model: CommandCenterModel }) {
  return (
    <header className="relative z-40 flex flex-wrap items-center justify-between gap-3 border-b border-[#7b431c]/35 bg-[#030201]/88 px-5 py-3 backdrop-blur-sm">
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-[0.42em] text-[#8f5b2a]">
          Chernobog // Override
        </div>
        <h1 className="mt-1 text-base font-semibold uppercase tracking-[0.26em] text-[#ffd09a]">
          Command Center
        </h1>
      </div>

      <nav
        aria-label="Command Center quick routes"
        className="flex flex-wrap items-center justify-end gap-2"
      >
        {model.headerLinks.map((link) => {
          const content = (
            <span className="flex items-center gap-2 border border-[#7b431c]/45 bg-black/25 px-2.5 py-1.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-[#c68d50] transition group-hover:border-[#ff9d2e]/65 group-hover:text-[#ffd09a]">
              <span
                className={[
                  "h-1.5 w-1.5 rounded-full",
                  link.tone === "green"
                    ? "bg-[#6df2a1] shadow-[0_0_8px_rgba(109,242,161,0.45)]"
                    : link.tone === "red"
                      ? "bg-[#ff4a3d]"
                      : "bg-[#ff9d2e]",
                ].join(" ")}
              />
              <span>{link.label}</span>
              <span className="text-[#6f5235]">{link.signal}</span>
            </span>
          );

          if (!link.isOpenable) {
            return <span key={link.id}>{content}</span>;
          }

          return (
            <Link key={link.id} href={link.path} className="group">
              {content}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

export function CommandCenterView({ model }: { model: CommandCenterModel }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020201] text-[#f3d2a0]">
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_44%,rgba(255,111,22,0.065),transparent_38%),#020201]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,157,46,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,157,46,0.14)_1px,transparent_1px)] [background-size:58px_58px]" />
<CommandHeader model={model} />
        <RecursiveCommandHierarchy />
        <SensoryControlDeck />
      </div>
    </main>
  );
}
