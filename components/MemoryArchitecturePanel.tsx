"use client";

import { useEffect, useState } from "react";

type MemoryContextBlock = {
  layer: "short_term" | "working" | "long_term";
  title: string;
  lines: string[];
};

type BuiltMemoryContext = {
  shortTerm: MemoryContextBlock;
  working: MemoryContextBlock;
  longTerm: MemoryContextBlock;
  systemText: string;
};

type MemoryArchitecturePanelProps = {
  sessionId: string;
};

function getLayerLabel(layer: MemoryContextBlock["layer"]) {
  switch (layer) {
    case "short_term":
      return "Short-Term";
    case "working":
      return "Working";
    case "long_term":
      return "Long-Term";
    default:
      return layer;
  }
}

function MemoryBlock({ block }: { block: MemoryContextBlock }) {
  return (
    <section className="rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/25 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffb066]/70">
            {getLayerLabel(block.layer)} Memory
          </div>
          <div className="mt-1 text-xs text-[#d6d1c7]/45">{block.title}</div>
        </div>

        <div className="rounded-md border border-[rgba(255,160,70,0.12)] px-2 py-1 font-mono text-[11px] text-[#ffb066]/80">
          {block.lines.length}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {block.lines.length === 0 ? (
          <div className="rounded-lg border border-[rgba(255,160,70,0.08)] bg-black/20 p-2 text-xs text-[#d6d1c7]/40">
            No entries.
          </div>
        ) : (
          block.lines.map((line, index) => (
            <div
              key={`${block.layer}-${index}-${line}`}
              className="rounded-lg border border-[rgba(255,160,70,0.08)] bg-black/20 p-2 text-xs leading-relaxed text-[#d6d1c7]/70"
            >
              {line}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default function MemoryArchitecturePanel({
  sessionId,
}: MemoryArchitecturePanelProps) {
  const [open, setOpen] = useState(false);
  const [showSystemText, setShowSystemText] = useState(false);
  const [memoryContext, setMemoryContext] =
    useState<BuiltMemoryContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  async function loadMemoryContext() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/debug/memory?sessionId=${encodeURIComponent(sessionId)}&query=${encodeURIComponent(query)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const raw = await response.text();

      if (!response.ok) {
        throw new Error(`Memory API ${response.status}: ${raw}`);
      }

      const data = JSON.parse(raw);

      setMemoryContext(data.memoryContext ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load memory context."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadMemoryContext();
  }, [open, sessionId]);

  return (
    <section className="rounded-2xl border border-[rgba(255,160,70,0.14)] bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ffb066]/80">
            Memory Architecture
          </h2>
          <p className="mt-1 text-xs text-[#d6d1c7]/45">
            Layered short-term, working, and long-term memory context.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-lg border border-[rgba(255,160,70,0.18)] px-3 py-1.5 text-xs text-[#ffb066] transition hover:bg-[rgba(255,120,40,0.08)]"
          >
            {open ? "Collapse" : "Expand"}
          </button>

          <button
            type="button"
            onClick={loadMemoryContext}
            className="rounded-lg border border-[rgba(255,160,70,0.18)] px-3 py-1.5 text-xs text-[#d6d1c7]/70 transition hover:bg-[rgba(255,120,40,0.08)]"
          >
            {loading ? "Loading" : "Refresh"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

            <div className="rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/25 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffb066]/70">
                Relevance Query
            </div>
            <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter long-term memory by query..."
                className="mt-2 w-full rounded-lg border border-[rgba(255,160,70,0.14)] bg-black/40 px-3 py-2 text-xs text-[#d6d1c7] outline-none placeholder:text-[#d6d1c7]/30 focus:border-[rgba(255,160,70,0.32)]"
            />
            </div>

          {!error && !memoryContext && loading ? (
            <div className="text-sm text-[#d6d1c7]/45">
              Loading memory context...
            </div>
          ) : null}

          {memoryContext ? (
            <>
              <MemoryBlock block={memoryContext.shortTerm} />
              <MemoryBlock block={memoryContext.working} />
              <MemoryBlock block={memoryContext.longTerm} />

              <section className="rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/25 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffb066]/70">
                      System Context
                    </div>
                    <div className="mt-1 text-xs text-[#d6d1c7]/45">
                      Full context injected into routed model responses.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSystemText((value) => !value)}
                    className="rounded-lg border border-[rgba(255,160,70,0.18)] px-3 py-1.5 text-xs text-[#d6d1c7]/70 transition hover:bg-[rgba(255,120,40,0.08)]"
                  >
                    {showSystemText ? "Hide" : "Show"}
                  </button>
                </div>

                {showSystemText ? (
                  <pre className="mt-3 max-h-[360px] overflow-auto rounded-lg bg-black/40 p-3 text-xs leading-relaxed text-[#d6d1c7]/65 [scrollbar-width:thin]">
                    {memoryContext.systemText}
                  </pre>
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}