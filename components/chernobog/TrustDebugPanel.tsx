"use client";

type DebugTraceStep = {
  type: string;
  label: string;
  detail?: string;
  timestamp: string;
};

type DebugTrace = {
  id: string;
  route: string;
  tool: string;
  success: boolean;
  summary: string;
  steps: DebugTraceStep[];
};

type TrustDebugPanelProps = {
  trace?: DebugTrace | null;
  visible: boolean;
  onToggleVisible: () => void;
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

function stringifyDetail(detail?: string) {
  if (!detail) return null;

  if (detail.length <= 220) {
    return detail;
  }

  return `${detail.slice(0, 220)}...`;
}

export function TrustDebugPanel({
  trace,
  visible,
  onToggleVisible,
}: TrustDebugPanelProps) {
  return (
    <section className="rounded-2xl border border-red-500/20 bg-black/35 p-4 shadow-[0_0_30px_rgba(127,29,29,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-red-200">
            Developer Trust Layer
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Route, tool, workflow and failure visibility.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleVisible}
          className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-100 transition hover:bg-red-950/30"
        >
          {visible ? "Hide Trace" : "Show Trace"}
        </button>
      </div>

      {!visible ? null : (
        <div className="mt-4 space-y-4">
          {!trace ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-500">
              No trace available yet. Send a command to generate one.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="text-zinc-500">Route</div>
                  <div className="mt-1 font-mono text-red-100">{trace.route}</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="text-zinc-500">Tool</div>
                  <div className="mt-1 font-mono text-red-100">{trace.tool}</div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="text-zinc-500">Success</div>
                  <div className="mt-1 font-mono text-red-100">
                    {trace.success ? "true" : "false"}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="text-zinc-500">Steps</div>
                  <div className="mt-1 font-mono text-red-100">
                    {trace.steps.length}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Trace Summary
                </div>
                <div className="mt-2 break-all font-mono text-xs text-zinc-300">
                  {trace.summary}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                <div className="mb-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                  Timeline
                </div>

                <div className="space-y-2">
                  {trace.steps.map((step, index) => (
                    <div
                      key={`${step.timestamp}-${index}`}
                      className="rounded-lg border border-zinc-800/80 bg-black/30 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-zinc-600">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="rounded-md border border-red-500/20 bg-red-950/20 px-2 py-0.5 font-mono text-[11px] text-red-200">
                            {step.type}
                          </span>
                        </div>

                        <span className="font-mono text-[11px] text-zinc-600">
                          {formatTime(step.timestamp)}
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-zinc-200">
                        {step.label}
                      </div>

                      {stringifyDetail(step.detail) ? (
                        <div className="mt-2 whitespace-pre-wrap break-words rounded-md bg-zinc-950/80 p-2 font-mono text-xs text-zinc-500">
                          {stringifyDetail(step.detail)}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}