export function ChernobogTopBar({ currentArea }: { currentArea?: string }) {
  return (
    <header className="border-b border-[#5d3214]/80 bg-[#050403]/95 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,154,58,0.08)]">
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <div className="text-[8px] uppercase tracking-[0.4em] text-[#c9782f]/70">
            Chernobog V6.2 / God Program Interface
          </div>
          <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffe0ac]">
            {currentArea ?? "Operational Surface"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
          {[
            ["Route Registry", "Online"],
            ["Command Router", "Preserved"],
            ["Vault Memory", "Available"],
            ["Review Layer", "Protected"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border border-[#5d3214]/70 bg-black/35 px-2 py-1.5 text-right"
            >
              <div className="text-[7px] uppercase tracking-[0.22em] text-[#8e785c]">
                {label}
              </div>
              <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-[#ffd28a]">
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
