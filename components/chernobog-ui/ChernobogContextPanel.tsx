const contextItems = [
  ["Active Project", "Chernobog"],
  ["Vault Memory", "Available"],
  ["Chernobog Inc", "Online"],
  ["Open Reviews", "Placeholder"],
  ["Current Task", "Density Pass / Classic Theme Restore"],
  ["Trust Mode", "Read-only UI"],
];

export function ChernobogContextPanel() {
  return (
    <aside className="hidden h-full border-l border-[#5d3214]/80 bg-[#030303] p-2.5 shadow-[inset_1px_0_0_rgba(255,154,58,0.06)] xl:block">
      <div className="text-[8px] uppercase tracking-[0.38em] text-[#c9782f]/70">
        Context
      </div>
      <div className="mt-2.5 grid gap-2">
        {contextItems.map(([label, value]) => (
          <div
            key={label}
            className="border border-[#5d3214]/60 bg-[#070504] p-2.5"
          >
            <div className="text-[8px] uppercase tracking-[0.24em] text-[#8e785c]">
              {label}
            </div>
            <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ffe0ac]">
              {value}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
