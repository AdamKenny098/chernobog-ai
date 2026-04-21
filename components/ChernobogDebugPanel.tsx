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

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function ChernobogDebugPanel() {
  const [open, setOpen] = useState(false);
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
      setError(err instanceof Error ? err.message : "Failed to load debug state.");
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
    if (loading) return "Debug Console — Loading";
    if (error) return "Debug Console — Error";
    return "Debug Console";
  }, [loading, error]);

  return (
    <>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-4 right-4 z-50 rounded-md border border-neutral-700 bg-black/80 px-4 py-2 text-sm text-neutral-200 shadow-lg backdrop-blur"
        type="button"
      >
        {open ? "Close Debug" : "Open Debug"}
      </button>

      {open && (
        <div className="fixed right-4 top-4 bottom-20 z-40 w-[420px] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/95 text-neutral-100 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <div>
              <div className="text-sm font-semibold tracking-wide">{titleText}</div>
              <div className="mt-1 text-xs text-neutral-400">
                Messages: {messageCount} | Memories: {memoryCount} | Tool Calls: {toolCount}
              </div>
            </div>

            <button
              onClick={() => void loadDebugState()}
              className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-200 hover:bg-neutral-900"
              type="button"
            >
              Refresh
            </button>
          </div>

          <div className="h-full overflow-y-auto p-4 space-y-6">
            {error && (
              <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {!error && !state && loading && (
              <div className="text-sm text-neutral-400">Loading debug state...</div>
            )}

            {state && (
              <>
                <section>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                    Stored Memories
                  </h2>

                  <div className="space-y-2">
                    {state.memories.length === 0 ? (
                      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-400">
                        No persisted memories.
                      </div>
                    ) : (
                      state.memories.map((memory, index) => (
                        <div
                          key={`${memory}-${index}`}
                          className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-200"
                        >
                          {memory}
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                    Recent Tool Calls
                  </h2>

                  <div className="space-y-3">
                    {state.toolCalls.length === 0 ? (
                      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-400">
                        No tool calls recorded.
                      </div>
                    ) : (
                      state.toolCalls.map((toolCall) => (
                        <div
                          key={toolCall.id}
                          className="rounded-lg border border-neutral-800 bg-neutral-900 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-neutral-100">
                              {toolCall.tool_name}
                            </div>
                            <div
                              className={`text-xs font-medium ${
                                toolCall.success ? "text-green-400" : "text-red-400"
                              }`}
                            >
                              {toolCall.success ? "SUCCESS" : "FAILED"}
                            </div>
                          </div>

                          <div className="mt-1 text-xs text-neutral-500">
                            {toolCall.created_at}
                          </div>

                          <div className="mt-3">
                            <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
                              Input
                            </div>
                            <pre className="overflow-x-auto rounded bg-black/40 p-2 text-xs text-neutral-300">
                              {prettyJson(toolCall.input)}
                            </pre>
                          </div>

                          <div className="mt-3">
                            <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
                              Output
                            </div>
                            <pre className="overflow-x-auto rounded bg-black/40 p-2 text-xs text-neutral-300">
                              {prettyJson(toolCall.output)}
                            </pre>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-neutral-400">
                    Recent Messages
                  </h2>

                  <div className="space-y-3">
                    {state.messages.length === 0 ? (
                      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm text-neutral-400">
                        No messages recorded.
                      </div>
                    ) : (
                      state.messages.map((message) => (
                        <div
                          key={message.id}
                          className="rounded-lg border border-neutral-800 bg-neutral-900 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-neutral-100">
                              {message.role.toUpperCase()}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {message.route ?? "no-route"} · {message.created_at}
                            </div>
                          </div>

                          <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-300">
                            {message.content}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}