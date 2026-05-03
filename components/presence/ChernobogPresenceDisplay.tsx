"use client";

import CodeRain from "./CodeRain";
import PresenceEye from "./PresenceEye";
import PresenceStatusBar from "./PresenceStatusBar";
import PresenceCommandStrip from "./PresenceCommandStrip";

export type PresenceState =
  | "standby"
  | "listening"
  | "processing"
  | "executing"
  | "responding"
  | "warning";

export default function ChernobogPresenceDisplay() {
  const state: PresenceState = "standby";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020203] text-[#f2f2f2]">
      <CodeRain />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,20,20,0.18),transparent_38%,rgba(0,0,0,0.92)_78%)]" />
      <div className="pointer-events-none absolute inset-0 border border-red-950/40" />

      <header className="absolute left-12 top-10 z-20">
        <div className="text-3xl tracking-[0.55em] text-red-500 drop-shadow-[0_0_18px_rgba(255,40,30,0.55)]">
          CHERNOBOG
        </div>
        <div className="mt-3 text-xs tracking-[0.35em] text-zinc-400">
          PERSONAL AI COMMAND SYSTEM
        </div>
        <div className="mt-4 h-px w-40 bg-red-500/70 shadow-[0_0_14px_rgba(255,40,30,0.8)]" />
      </header>

      <div className="absolute right-12 top-12 z-20 text-right">
        <div className="text-xs tracking-[0.28em] text-zinc-400">
          SECURE CHANNEL
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <span className="h-1 w-8 bg-red-500 shadow-[0_0_12px_rgba(255,40,30,0.9)]" />
          <span className="h-1 w-8 bg-red-500/70" />
          <span className="h-1 w-8 bg-red-500/40" />
        </div>
      </div>

      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-8 pt-24">
        <div className="scale-[1.35]">
            <PresenceEye state={state} />
        </div>

        <div className="mt-16 text-center">
          <div className="text-3xl tracking-[0.45em] text-red-500 drop-shadow-[0_0_18px_rgba(255,40,30,0.7)]">
            {state === "standby" && "STANDBY"}
            {state === "listening" && "LISTENING"}
            {state === "processing" && "PROCESSING"}
            {state === "executing" && "EXECUTING"}
            {state === "responding" && "RESPONDING"}
            {state === "warning" && "WARNING"}
          </div>

          <div className="mt-3 text-sm tracking-[0.28em] text-zinc-400">
            {state === "standby" && "AWAITING DIRECTIVE"}
            {state === "listening" && "RECEIVING INPUT"}
            {state === "processing" && "ROUTING COMMAND"}
            {state === "executing" && "ACTION IN PROGRESS"}
            {state === "responding" && "TRANSMITTING RESPONSE"}
            {state === "warning" && "ATTENTION REQUIRED"}
          </div>
        </div>

        <PresenceStatusBar />
        <PresenceCommandStrip message="Awaiting directive." />
      </section>
    </main>
  );
}