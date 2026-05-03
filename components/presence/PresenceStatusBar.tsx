const items = [
    ["MEMORY", "ONLINE"],
    ["TOOLS", "READY"],
    ["WORKFLOW", "IDLE"],
    ["TRUST", "HIGH"],
  ];
  
  export default function PresenceStatusBar() {
    return (
      <div className="mt-14 grid w-full max-w-5xl grid-cols-4 border-y border-red-950/70 bg-black/35 px-8 py-6 backdrop-blur-sm">
        {items.map(([label, value]) => (
          <div
            key={label}
            className="border-r border-zinc-800/80 text-center last:border-r-0"
          >
            <div className="text-sm tracking-[0.35em] text-zinc-400">
              {label}
            </div>
            <div className="mt-2 text-sm tracking-[0.28em] text-red-500 drop-shadow-[0_0_12px_rgba(255,40,30,0.85)]">
              {value}
            </div>
          </div>
        ))}
      </div>
    );
  }