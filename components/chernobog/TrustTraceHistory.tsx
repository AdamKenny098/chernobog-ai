"use client";

import { useEffect, useState } from "react";

type TrustTraceSummary = {
  id: string;
  route: string;
  tool: string;
  success: boolean;
  input: string;
  startedAt: string;
  finishedAt?: string;
  steps?: unknown[];
};

type TrustTraceHistoryProps = {
  onSelectTrace?: (trace: any) => void;
};

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TrustTraceHistory({ onSelectTrace }: TrustTraceHistoryProps) {
  const [traces, setTraces] = useState<TrustTraceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTraces() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/debug/traces", {
        method: "GET",
        cache: "no-store",
      });

      const raw = await response.text();

      if (!response.ok) {
        throw new Error(`Trace API ${response.status}: ${raw}`);
      }

      const data = JSON.parse(raw);
      setTraces(data.traces ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load traces.");
    } finally {
      setLoading(false);
    }
  }

  async function clearTraces() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/debug/traces", {
        method: "DELETE",
      });

      if (!response.ok) {
        const raw = await response.text();
        throw new Error(`Trace API ${response.status}: ${raw}`);
      }

      setTraces([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear traces.");
    } finally {
      setLoading(false);
    }
  }

  async function selectTrace(id: string) {
    try {
      setError("");

      const response = await fetch(`/api/debug/traces?id=${encodeURIComponent(id)}`, {
        method: "GET",
        cache: "no-store",
      });

      const raw = await response.text();

      if (!response.ok) {
        throw new Error(`Trace API ${response.status}: ${raw}`);
      }

      const data = JSON.parse(raw);

      if (data.trace) {
        onSelectTrace?.({
          id: data.trace.id,
          route: data.trace.route,
          tool: data.trace.tool,
          success: data.trace.success,
          failureCategory: data.trace.failureCategory,
          summary: [
            `trace=${data.trace.id}`,
            `route=${data.trace.route}`,
            `tool=${data.trace.tool}`,
            `success=${data.trace.success}`,
          ].join(" | "),
          steps: data.trace.steps ?? [],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trace.");
    }
  }

  useEffect(() => {
    void loadTraces();
  }, []);

  return (
    <section className="rounded-2xl border border-[rgba(255,160,70,0.14)] bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ffb066]/80">
            Trace History
          </h2>
          <p className="mt-1 text-xs text-[#d6d1c7]/45">
            Recent command audit trail.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadTraces}
            className="rounded-lg border border-[rgba(255,160,70,0.18)] px-3 py-1.5 text-xs text-[#d6d1c7]/70 transition hover:bg-[rgba(255,120,40,0.08)]"
          >
            {loading ? "Loading" : "Refresh"}
          </button>

          <button
            type="button"
            onClick={clearTraces}
            className="rounded-lg border border-[rgba(255,80,80,0.24)] px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-950/30"
          >
            Clear
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {traces.length === 0 ? (
          <div className="rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/30 p-3 text-sm text-[#d6d1c7]/45">
            No traces recorded yet.
          </div>
        ) : (
          traces.map((trace) => (
            <button
              type="button"
              key={trace.id}
              onClick={() => selectTrace(trace.id)}
              className="block w-full rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/30 p-3 text-left transition hover:border-[rgba(255,160,70,0.28)] hover:bg-[rgba(255,120,40,0.06)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-[#ffb066]">
                  {trace.route} / {trace.tool}
                </span>

                <span className="font-mono text-[11px] text-[#d6d1c7]/35">
                  {formatTime(trace.startedAt)}
                </span>
              </div>

              <div className="mt-2 line-clamp-1 text-xs text-[#d6d1c7]/45">
                {trace.input}
              </div>

              <div className="mt-2 font-mono text-[11px] text-[#d6d1c7]/35">
                {trace.success ? "success" : "failed"} · {trace.id}
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}