"use client";

import { useState } from "react";

type UnifiedCommand = {
  raw: string;
  normalized: string;
  domain: string;
  action: string;
  target: string;
  reference: string;
  query?: string;
  stepIndex?: number;
  confidence: number;
  confidenceLevel: string;
  reasons: string[];
};

type CommandLanguagePanelProps = {
  defaultMessage?: string;
};

export default function CommandLanguagePanel({
  defaultMessage = "",
}: CommandLanguagePanelProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [command, setCommand] = useState<UnifiedCommand | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function parseCommand() {
    const value = message.trim();

    if (!value) {
      setError("Enter a command to inspect.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/debug/command-language?message=${encodeURIComponent(value)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const raw = await response.text();

      if (!response.ok) {
        throw new Error(`Command Language API ${response.status}: ${raw}`);
      }

      const data = JSON.parse(raw);
      setCommand(data.command ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse command."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[rgba(255,160,70,0.14)] bg-black/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#ffb066]/80">
            Command Language
          </h2>
          <p className="mt-1 text-xs text-[#d6d1c7]/45">
            Inspect unified domain, action, target, reference, and confidence.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg border border-[rgba(255,160,70,0.18)] px-3 py-1.5 text-xs text-[#ffb066] transition hover:bg-[rgba(255,120,40,0.08)]"
        >
          {open ? "Collapse" : "Expand"}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4">
          <div>
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Enter a command to inspect..."
              className="w-full rounded-lg border border-[rgba(255,160,70,0.14)] bg-black/40 px-3 py-2 text-xs text-[#d6d1c7] outline-none placeholder:text-[#d6d1c7]/30 focus:border-[rgba(255,160,70,0.32)]"
            />

            <button
              type="button"
              onClick={parseCommand}
              className="mt-2 rounded-lg border border-[rgba(255,160,70,0.18)] px-3 py-1.5 text-xs text-[#d6d1c7]/70 transition hover:bg-[rgba(255,120,40,0.08)]"
            >
              {loading ? "Parsing" : "Parse"}
            </button>
          </div>

          <div className="rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/25 p-3">
  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ffb066]/70">
    Example Commands
  </div>

  <div className="mt-2 grid gap-2">
    {[
      "make a plan for finishing V4.9",
      "complete step 1",
      "show working memory",
      "find roadmap",
      "open the first one",
      "remember that Chernobog has unified commands",
      "command help",
    ].map((example) => (
      <button
        key={example}
        type="button"
        onClick={() => setMessage(example)}
        className="rounded-lg border border-[rgba(255,160,70,0.08)] bg-black/20 px-3 py-2 text-left text-xs text-[#d6d1c7]/65 transition hover:border-[rgba(255,160,70,0.22)] hover:bg-[rgba(255,120,40,0.06)]"
      >
        {example}
      </button>
    ))}
  </div>
</div>

          {error ? (
            <div className="rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          {command ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Domain", command.domain],
                  ["Action", command.action],
                  ["Target", command.target],
                  ["Reference", command.reference],
                  ["Confidence", `${Math.round(command.confidence * 100)}%`],
                  ["Level", command.confidenceLevel],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/25 p-3"
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[#d6d1c7]/35">
                      {label}
                    </div>
                    <div className="mt-1 break-words font-mono text-xs text-[#ffb066]">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {command.query ? (
                <div className="rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/25 p-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#d6d1c7]/35">
                    Query
                  </div>
                  <div className="mt-1 text-xs text-[#d6d1c7]/70">
                    {command.query}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-[rgba(255,160,70,0.1)] bg-black/25 p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[#d6d1c7]/35">
                  Reasons
                </div>
                <div className="mt-2 space-y-1">
                  {command.reasons.length === 0 ? (
                    <div className="text-xs text-[#d6d1c7]/40">No reasons.</div>
                  ) : (
                    command.reasons.map((reason, index) => (
                      <div
                        key={`${reason}-${index}`}
                        className="rounded-lg bg-black/25 p-2 text-xs text-[#d6d1c7]/65"
                      >
                        {reason}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}