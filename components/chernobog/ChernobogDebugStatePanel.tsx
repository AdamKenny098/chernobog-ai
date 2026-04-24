"use client";

import { useEffect, useMemo, useState } from "react";

type DebugMessage = {
  id: number;
  role: string;
  content: string;
  route: string | null;
  created_at: string;
};

type DebugToolCall = {
  id: number;
  tool_name: string;
  success: boolean;
  created_at: string;
  input: unknown;
  output: unknown;
};

type DebugState = {
  messages: DebugMessage[];
  memories: string[];
  toolCalls: DebugToolCall[];
};

type ChernobogDebugStatePanelProps = {
  defaultOpen?: boolean;
};

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function ChernobogDebugStatePanel({
  defaultOpen = false,
}: ChernobogDebugStatePanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<DebugState | null>(null);
  const [error, setError] = useState<string>("");

  async function loadDebugState() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/debug/state", {
        method: "GET",
        cache: "no-store",
      });

      const raw = await res.text();
      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        throw new Error(`Debug API ${res.status}: ${raw}`);
      }

      if (!contentType.includes("application/json")) {
        throw new Error(`Expected JSON, got: ${raw}`);
      }

      const data = JSON.parse(raw) as DebugState;
      setState(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load debug state."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    void loadDebugState();
  }, [open]);

  const messageCount = state?.messages.length ?? 0;
  const memoryCount = state?.memories.length ?? 0;
  const toolCount = state?.toolCalls.length ?? 0;

  const titleText = useMemo(() => {
    if (loading) return "Debug State — Loading";
    if (error) return "Debug State — Error";
    return "Debug State";
  }, [loading, error]);

  return (
    <section className="rounded-2xl border border-[rgba(255,160,70,0.14)] bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ffb066]/80">
            {titleText}
          </h2>

          <p className="mt-1 text-xs text-[#d6d1c7]/45">
            Messages: {messageCount} · Memories: {memoryCount} · Tool Calls:{" "}
            {toolCount}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="rounded-lg border border-[rgba(255,160,70,0.18)] px-3 py-1.5 text-xs text-[#ffb066] transition hover:bg-[rgba(255,120,40,0.08)]"
            type="button"
          >
            {open ? "Collapse" : "Expand"}
          </button>

          <button
            onClick={() => void loadDebugState()}
            className="rounded-lg border border-[rgba(255,160,70,0.18)] px-3 py-1.5 text-xs text-[#d6d1c7]/70 transition hover:bg-[rgba(255,120,40,0.08)]"
            type="button"
          >
            {loading ? "Loading" : "Refresh"}
          </button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 max-h-[720px] space-y-6 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {error ? (
            <div className="rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {!error && !state && loading ? (
            <div className="text-sm text-[#d6d1c7]/45">
              Loading debug state...
            </div>
          ) : null}

          {state ? (
            <>
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6d1c7]/45">
                  Stored Memories
                </h3>

                <div className="space-y-2">
                  {state.memories.length === 0 ? (
                    <div className="rounded-lg border border-[rgba(255,160,70,0.1)] bg-black/30 p-3 text-sm text-[#d6d1c7]/45">
                      No persisted memories.
                    </div>
                  ) : (
                    state.memories.map((memory, index) => (
                      <div
                        key={`${memory}-${index}`}
                        className="rounded-lg border border-[rgba(255,160,70,0.1)] bg-black/30 p-3 text-sm text-[#d6d1c7]/75"
                      >
                        {memory}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6d1c7]/45">
                  Recent Tool Calls
                </h3>

                <div className="space-y-3">
                  {state.toolCalls.length === 0 ? (
                    <div className="rounded-lg border border-[rgba(255,160,70,0.1)] bg-black/30 p-3 text-sm text-[#d6d1c7]/45">
                      No tool calls recorded.
                    </div>
                  ) : (
                    state.toolCalls.map((toolCall) => (
                      <div
                        key={toolCall.id}
                        className="rounded-lg border border-[rgba(255,160,70,0.1)] bg-black/30 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold text-[#d6d1c7]">
                            {toolCall.tool_name}
                          </div>

                          <div
                            className={`text-xs font-medium ${
                              toolCall.success
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                          >
                            {toolCall.success ? "SUCCESS" : "FAILED"}
                          </div>
                        </div>

                        <div className="mt-1 text-xs text-[#d6d1c7]/35">
                          {toolCall.created_at}
                        </div>

                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs uppercase tracking-wide text-[#d6d1c7]/45">
                            Input
                          </summary>
                          <pre className="mt-2 overflow-x-auto rounded bg-black/40 p-2 text-xs text-[#d6d1c7]/65">
                            {prettyJson(toolCall.input)}
                          </pre>
                        </details>

                        <details className="mt-3">
                          <summary className="cursor-pointer text-xs uppercase tracking-wide text-[#d6d1c7]/45">
                            Output
                          </summary>
                          <pre className="mt-2 overflow-x-auto rounded bg-black/40 p-2 text-xs text-[#d6d1c7]/65">
                            {prettyJson(toolCall.output)}
                          </pre>
                        </details>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#d6d1c7]/45">
                  Recent Messages
                </h3>

                <div className="space-y-3">
                  {state.messages.length === 0 ? (
                    <div className="rounded-lg border border-[rgba(255,160,70,0.1)] bg-black/30 p-3 text-sm text-[#d6d1c7]/45">
                      No messages recorded.
                    </div>
                  ) : (
                    state.messages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-lg border border-[rgba(255,160,70,0.1)] bg-black/30 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-[#d6d1c7]">
                            {message.role.toUpperCase()}
                          </div>

                          <div className="text-xs text-[#d6d1c7]/35">
                            {message.route ?? "no-route"} · {message.created_at}
                          </div>
                        </div>

                        <div className="mt-2 whitespace-pre-wrap text-sm text-[#d6d1c7]/70">
                          {message.content}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}