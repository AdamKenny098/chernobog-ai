export function ChernobogTopBar({ currentArea }: { currentArea?: string }) {
  return (
    <header className="border-b border-[#6f3d18]/70 bg-[#050403]/95 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,154,58,0.08)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[9px] uppercase tracking-[0.42em] text-[#c9782f]/70">
            Chernobog V6.2 / God Program Interface
          </div>
          <div className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-[#ffe0ac]">
            {currentArea ?? "Operational Surface"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            ["Route Registry", "Online"],
            ["Command Router", "Preserved"],
            ["Vault Memory", "Available"],
            ["Review Layer", "Protected"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border border-[#6f3d18]/60 bg-black/35 px-3 py-2 text-right"
            >
              <div className="text-[8px] uppercase tracking-[0.24em] text-[#8e785c]">
                {label}
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffd28a]">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
