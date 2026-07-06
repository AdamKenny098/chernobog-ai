const contextItems = [
  ["Active Project", "Chernobog"],
  ["Vault Memory", "Available"],
  ["Chernobog Inc", "Online"],
  ["Open Reviews", "Placeholder"],
  ["Current Task", "Classic Theme Restore"],
  ["Trust Mode", "Read-only UI"],
];

export function ChernobogContextPanel() {
  return (
    <aside className="hidden h-full border-l border-[#6f3d18]/70 bg-[#030303] p-4 shadow-[inset_1px_0_0_rgba(255,154,58,0.06)] xl:block">
      <div className="text-[9px] uppercase tracking-[0.42em] text-[#c9782f]/70">
        Context
      </div>
      <div className="mt-4 grid gap-3">
        {contextItems.map(([label, value]) => (
          <div
            key={label}
            className="border border-[#6f3d18]/55 bg-[#070504] p-3"
          >
            <div className="text-[9px] uppercase tracking-[0.26em] text-[#8e785c]">
              {label}
            </div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#ffe0ac]">
              {value}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
