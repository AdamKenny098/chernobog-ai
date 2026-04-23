"use client";

import {
  Command,
  CornerDownLeft,
  Mic,
  ScanLine,
  Send,
  Sparkles,
} from "lucide-react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useState } from "react";

type ComposerMode = "directive" | "analysis" | "sealed";

type CommandComposerProps = {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  mode?: ComposerMode;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
};

function modeClasses(mode: ComposerMode) {
  switch (mode) {
    case "analysis":
      return {
        label: "ANALYSIS MODE",
        chip:
          "border-[rgba(255,170,90,0.2)] bg-[rgba(255,170,90,0.05)] text-[rgba(238,182,108,0.86)]",
        beam: "bg-[linear-gradient(90deg,rgba(255,142,58,0.5),rgba(255,191,126,0.95),rgba(255,142,58,0.18))]",
      };
    case "sealed":
      return {
        label: "SEALED CHANNEL",
        chip:
          "border-[rgba(132,28,28,0.22)] bg-[rgba(132,28,28,0.08)] text-[rgba(195,116,116,0.84)]",
        beam: "bg-[linear-gradient(90deg,rgba(130,26,26,0.52),rgba(255,170,90,0.26),rgba(130,26,26,0.14))]",
      };
    case "directive":
    default:
      return {
        label: "DIRECTIVE MODE",
        chip:
          "border-[rgba(255,170,90,0.22)] bg-[rgba(255,170,90,0.055)] text-[rgba(241,185,111,0.9)]",
        beam: "bg-[linear-gradient(90deg,rgba(255,142,58,0.56),rgba(255,204,146,0.96),rgba(255,142,58,0.16))]",
      };
  }
}

function GlyphButton({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`relative flex h-[40px] w-[40px] items-center justify-center overflow-hidden [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] border transition ${
        active
          ? "border-[rgba(255,176,104,0.22)] bg-[linear-gradient(180deg,rgba(255,170,90,0.07),rgba(255,170,90,0.02))] text-[rgba(240,188,118,0.94)]"
          : "border-[rgba(255,176,104,0.12)] bg-[linear-gradient(180deg,rgba(255,170,90,0.03),rgba(255,170,90,0.008))] text-[rgba(214,167,112,0.78)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.018),transparent_68%,rgba(120,16,16,0.035))]" />
      <div className="absolute right-[5px] top-[5px] h-[8px] w-[8px] border-r border-t border-[rgba(255,176,104,0.1)]" />
      <div className="relative z-10">{children}</div>
    </button>
  );
}

function SideCard({
  label,
  value,
  detail,
  children,
}: {
  label: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden px-3 py-2.5">
      <div className="absolute inset-0 [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)] border border-[rgba(255,170,90,0.1)] bg-[linear-gradient(180deg,rgba(255,170,90,0.022),rgba(255,170,90,0.006))] shadow-[inset_0_0_0_1px_rgba(255,190,120,0.018)]" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.014),transparent_72%,rgba(120,16,16,0.03))]" />
        <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.12),transparent)]" />
        <div className="absolute bottom-0 left-0 h-px w-[34%] bg-[linear-gradient(90deg,rgba(255,166,82,0.22),transparent)]" />
        <div className="absolute right-[8px] top-[8px] h-[10px] w-[10px] border-r border-t border-[rgba(255,176,104,0.06)]" />
      </div>

      <div className="relative z-10">
        <div className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
          {label}
        </div>
        <div className="mt-2 text-[14px] font-medium uppercase tracking-[0.14em] text-[rgba(236,231,223,0.94)]">
          {value}
        </div>
        {detail ? (
          <div className="mt-1.5 text-[9px] uppercase tracking-[0.24em] text-[rgba(232,178,104,0.78)]">
            {detail}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export default function CommandComposer({
  value,
  placeholder = "ISSUE DIRECTIVE TO CHERNOBOG...",
  disabled = false,
  mode = "directive",
  onChange,
  onSubmit,
}: CommandComposerProps) {
  const [internalValue, setInternalValue] = useState("");
  const controlled = value !== undefined;
  const currentValue = controlled ? value : internalValue;
  const modeStyle = modeClasses(mode);

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    if (!controlled) setInternalValue(next);
    onChange?.(next);
  }

  function submit() {
    const trimmed = currentValue.trim();
    if (!trimmed || disabled) return;
    onSubmit?.(trimmed);
    if (!controlled) setInternalValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[8%] right-[8%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.18),transparent)]" />
        <div className="absolute left-[4%] right-[4%] bottom-[14px] h-px bg-[linear-gradient(90deg,transparent,rgba(255,170,90,0.08),transparent)]" />
        <div className="absolute left-[6%] bottom-[18px] h-px w-[14%] bg-[linear-gradient(90deg,rgba(255,170,90,0.22),transparent)]" />
        <div className="absolute right-[6%] bottom-[18px] h-px w-[14%] bg-[linear-gradient(90deg,transparent,rgba(255,170,90,0.22))]" />
      </div>

      <div className="relative z-10 overflow-hidden px-4 py-4 md:px-5 md:py-4">
        <div className="absolute inset-0 [clip-path:polygon(18px_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%,0_18px)] border border-[rgba(255,170,90,0.12)] bg-[linear-gradient(180deg,rgba(10,11,15,0.96),rgba(7,8,11,0.99))] shadow-[inset_0_0_0_1px_rgba(255,190,120,0.024)]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.022),transparent_26%,transparent_80%,rgba(120,16,16,0.045))]" />
          <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.16),transparent)]" />
          <div className="absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(255,180,100,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,180,100,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
          <div className="absolute left-[20px] top-[20px] h-[14px] w-[14px] border-l border-t border-[rgba(255,176,104,0.08)]" />
          <div className="absolute right-[20px] top-[20px] h-[14px] w-[14px] border-r border-t border-[rgba(255,176,104,0.08)]" />
          <div className="absolute bottom-[20px] left-[20px] h-[14px] w-[14px] border-b border-l border-[rgba(255,176,104,0.08)]" />
          <div className="absolute bottom-[20px] right-[20px] h-[14px] w-[14px] border-b border-r border-[rgba(255,176,104,0.08)]" />
        </div>

        <div className="relative z-10">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-[34px] w-[34px] shrink-0 items-center justify-center [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)] border border-[rgba(255,170,90,0.14)] bg-[linear-gradient(180deg,rgba(255,170,90,0.04),rgba(255,170,90,0.012))] text-[rgba(221,170,112,0.84)] shadow-[inset_0_0_0_1px_rgba(255,190,120,0.02)]">
                <Command className="h-4 w-4" strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-[0.34em] text-[rgba(219,210,197,0.84)]">
                  DIRECTIVE CONSOLE
                </div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
                  DOCKED COMMAND ALTAR
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex min-h-[28px] items-center border px-3 text-[9px] font-medium uppercase tracking-[0.28em] ${modeStyle.chip}`}
              >
                {modeStyle.label}
              </span>

              <GlyphButton>
                <ScanLine className="h-4 w-4" strokeWidth={1.8} />
              </GlyphButton>
              <GlyphButton>
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
              </GlyphButton>
              <GlyphButton>
                <Mic className="h-4 w-4" strokeWidth={1.8} />
              </GlyphButton>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 [clip-path:polygon(16px_0,100%_0,100%_calc(100%-16px),calc(100%-16px)_100%,0_100%,0_16px)] border border-[rgba(255,170,90,0.12)] bg-[linear-gradient(180deg,rgba(255,170,90,0.03),rgba(255,170,90,0.008))]" />
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,145,55,0.045)_0%,transparent_66%)]" />
                <div className="absolute left-0 top-0 h-px w-full bg-[linear-gradient(90deg,transparent,rgba(255,176,104,0.16),transparent)]" />
                <div className="absolute left-[14px] top-[14px] h-[14px] w-[14px] border-l border-t border-[rgba(255,176,104,0.08)]" />
                <div className="absolute bottom-[14px] right-[14px] h-[14px] w-[14px] border-b border-r border-[rgba(255,176,104,0.08)]" />
                <div className="absolute left-1/2 top-0 h-[22px] w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(255,176,104,0.14),transparent)]" />
                <div className="absolute left-1/2 bottom-0 h-[22px] w-px -translate-x-1/2 bg-[linear-gradient(180deg,transparent,rgba(255,176,104,0.14))]" />
              </div>

              <div className="relative z-10 px-4 py-3.5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
                    DIRECTIVE INPUT
                  </div>

                  <div className="flex items-center gap-2 text-[8px] uppercase tracking-[0.22em] text-[rgba(168,143,114,0.66)]">
                    <span>ENTER // EXECUTE</span>
                    <span className="h-1 w-1 rounded-full bg-[rgba(255,170,90,0.5)]" />
                    <span>SHIFT+ENTER // LINE BREAK</span>
                  </div>
                </div>

                <textarea
                  value={currentValue}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  disabled={disabled}
                  placeholder={placeholder}
                  rows={6}
                  className="min-h-[164px] w-full resize-none bg-transparent text-[13px] uppercase leading-7 tracking-[0.05em] text-[rgba(236,231,223,0.95)] placeholder:text-[rgba(173,146,118,0.46)] outline-none"
                />

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
                      CHANNEL INTEGRITY
                    </span>
                    <span className="h-2 w-2 rounded-full bg-[rgba(93,210,159,0.94)] shadow-[0_0_10px_rgba(93,210,159,0.32)]" />
                    <span className="text-[9px] uppercase tracking-[0.24em] text-[rgba(228,179,111,0.82)]">
                      STABLE
                    </span>
                  </div>

                  <div className="text-[9px] uppercase tracking-[0.24em] text-[rgba(168,143,114,0.68)]">
                    {currentValue.length.toString().padStart(3, "0")} GLYPHS
                  </div>
                </div>

                <div className="mt-2.5 h-[3px] w-full overflow-hidden bg-[rgba(255,170,90,0.05)]">
                  <div className={`h-full w-[54%] ${modeStyle.beam}`} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
              <SideCard label="CHANNEL" value="PRIMARY" detail="OPTIC-ROUTED" />

              <div className="relative overflow-hidden px-3 py-2.5">
                <div className="absolute inset-0 [clip-path:polygon(12px_0,100%_0,100%_calc(100%-12px),calc(100%-12px)_100%,0_100%,0_12px)] border border-[rgba(255,170,90,0.1)] bg-[linear-gradient(180deg,rgba(255,170,90,0.024),rgba(255,170,90,0.006))]" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,170,90,0.014),transparent_72%,rgba(120,16,16,0.03))]" />
                <div className="relative z-10">
                  <div className="text-[9px] uppercase tracking-[0.24em] text-[rgba(183,133,86,0.72)]">
                    SUBMIT
                  </div>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={disabled || !currentValue.trim()}
                    className="mt-2 inline-flex min-h-[40px] w-full items-center justify-between gap-3 border border-[rgba(255,176,104,0.18)] bg-[linear-gradient(180deg,rgba(255,170,90,0.065),rgba(255,170,90,0.016))] px-3 text-left disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <span className="text-[10px] uppercase tracking-[0.26em] text-[rgba(240,185,111,0.92)]">
                      EXECUTE
                    </span>
                    <Send className="h-4 w-4 text-[rgba(240,185,111,0.88)]" strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              <SideCard label="RETURN PATH" value="DIRECT RESPONSE">
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[9px] uppercase tracking-[0.22em] text-[rgba(183,133,86,0.68)]">
                    RESPONSE VECTOR
                  </span>
                  <CornerDownLeft
                    className="h-4 w-4 text-[rgba(233,178,104,0.78)]"
                    strokeWidth={1.8}
                  />
                </div>
              </SideCard>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}