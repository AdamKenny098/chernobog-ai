"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Cpu,
  Crosshair,
  Eye,
  Power,
  Radio,
  ScanSearch,
  Send,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import ChernobogDebugPanel from "@/components/ChernobogDebugPanel";

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

type LogEntry = {
    id: string;
    time: string;
    source: string;
    text: string;
  };

  const starterLogs: LogEntry[] = [
    {
      id: "starter-1",
      time: "00:00:01",
      source: "CORE",
      text: "Override shell initialized.",
    },
    {
      id: "starter-2",
      time: "00:00:02",
      source: "SYSTEM",
      text: "Synthetic combat frame telemetry linked.",
    },
    {
      id: "starter-3",
      time: "00:00:03",
      source: "VISION",
      text: "Optic lattice online. Threat scan stable.",
    },
    {
      id: "starter-4",
      time: "00:00:04",
      source: "MEMORY",
      text: "Session buffer active. Long-term archive absent.",
    },
  ];

const subsystemCards = [
  {
    title: "Override Protocol",
    value: "ARMED",
    detail: "Transformation logic staged",
    icon: ShieldAlert,
  },
  {
    title: "Optic Core",
    value: "TRACKING",
    detail: "Chest-eye lens aligned",
    icon: Eye,
  },
  {
    title: "Combat Frame",
    value: "READY",
    detail: "Synthetic body telemetry nominal",
    icon: Cpu,
  },
  {
    title: "Signal Relay",
    value: "LOCKED",
    detail: "Remote directive channel stable",
    icon: Radio,
  },
];

export default function UmbraAIConsoleV1() {
  const [booted, setBooted] = useState(true);
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>(starterLogs);
  const logContainerRef = useRef<HTMLDivElement | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    if (!logContainerRef.current) return;

    logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
  }, [logs]);

  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: `${4 + ((i * 11) % 92)}%`,
        top: `${5 + ((i * 19) % 82)}%`,
        duration: 4 + (i % 5),
        delay: i * 0.14,
      })),
    []
  );

  function pushLog(source: string, text: string) {
    const entry: LogEntry = {
        id: crypto.randomUUID(),
        time: formatTime(new Date()),
        source,
        text,
      };

    setLogs((prev) => [...prev.slice(-9), entry]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
  
    const value = input.trim();
    if (!value) return;
  
    pushLog("USER", value);
    setInput("");
  
    try {
      pushLog("SYSTEM", "Routing directive to core...");
  
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: value,
          sessionId,
        })
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        pushLog("ERROR", data?.error ?? "Unknown backend error.");
        return;
      }
  
      if (data?.route) {
        pushLog("ROUTER", String(data.route).toUpperCase());
      }
  
      pushLog("CHERNOBOG", data?.reply ?? "No response returned.");
    } catch (error) {
      console.error(error);
      pushLog("ERROR", "Failed to reach /api/chat.");
    }
  }

  function toggleBoot() {
    const next = !booted;
    setBooted(next);
    pushLog("SYSTEM", next ? "Override shell brought online." : "Override shell set to passive state.");
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#07090c] text-white">
      <div className="relative min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_50%_40%,rgba(255,107,0,0.14),transparent_24%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.03),transparent_18%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent,rgba(255,145,0,0.03),transparent)]" />

        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute h-[2px] w-[2px] rounded-full bg-orange-300/70 blur-[1px]"
            style={{ left: particle.left, top: particle.top }}
            animate={{ y: [0, -8, 0], opacity: [0.12, 0.72, 0.12] }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col p-6 md:p-8">
          <header className="mb-6 grid gap-4 border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl lg:grid-cols-[1fr_auto]" style={{ clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px))" }}>
            <div>
              <div className="mb-2 text-xs uppercase tracking-[0.38em] text-orange-300/80">
                God Program Interface
              </div>
              <h1 className="text-3xl font-semibold tracking-[0.12em] md:text-4xl">
                CHERNOBOG // OVERRIDE
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60 md:text-base">
                Rebuilt to lean into a militarized synthetic aesthetic: charcoal armor,
                amber-orange holographic light, a singular optic core, and a harder,
                angular UI inspired by cybernetic override visuals.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start lg:self-center">
              <button
                onClick={toggleBoot}
                className="flex items-center gap-2 border border-orange-400/30 bg-orange-400/10 px-4 py-3 text-sm text-orange-100 transition hover:bg-orange-400/18"
                style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}
              >
                <Power className="h-4 w-4" />
                {booted ? "Set Passive" : "Boot Shell"}
              </button>
              <div className="border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70" style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}>
                Status: <span className={booted ? "text-orange-300" : "text-white/40"}>{booted ? "OVERRIDE ACTIVE" : "PASSIVE"}</span>
              </div>
            </div>
          </header>

          <div className="grid flex-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
            <aside className="border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl" style={{ clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))" }}>
              <div className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-white/55">
                <Cpu className="h-4 w-4 text-orange-300" />
                Subsystems
              </div>

              <div className="space-y-3">
                {subsystemCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div
                      key={card.title}
                      className="border border-white/10 bg-black/25 p-4"
                      style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-white">{card.title}</div>
                          <div className="mt-1 text-xs text-white/48">{card.detail}</div>
                        </div>
                        <div className="border border-orange-400/20 bg-orange-400/10 p-2">
                          <Icon className="h-4 w-4 text-orange-300" />
                        </div>
                      </div>
                      <div className="text-lg font-semibold tracking-[0.16em] text-orange-200">{card.value}</div>
                    </div>
                  );
                })}
              </div>
            </aside>

            <main className="flex flex-col gap-6">
              <section className="relative overflow-hidden border border-white/10 bg-white/[0.04] px-6 py-8 backdrop-blur-xl" style={{ clipPath: "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))" }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,154,40,0.16),transparent_34%)]" />
                <div className="absolute left-6 top-6 h-16 w-16 border-l border-t border-orange-300/25" />
                <div className="absolute bottom-6 right-6 h-16 w-16 border-b border-r border-orange-300/25" />

                <div className="relative flex flex-col items-center justify-center">
                  <div className="relative mb-8 flex h-[360px] w-[360px] items-center justify-center">
                    <motion.div
                      className="absolute h-[310px] w-[310px] border border-orange-300/16"
                      style={{ clipPath: "polygon(50% 0%, 88% 12%, 100% 50%, 88% 88%, 50% 100%, 12% 88%, 0% 50%, 12% 12%)" }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
                    />

                    <motion.div
                      className="absolute h-[248px] w-[248px] rounded-full border border-orange-300/10"
                      animate={{ rotate: -360, scale: [1, 1.02, 1] }}
                      transition={{ rotate: { duration: 18, repeat: Infinity, ease: "linear" }, scale: { duration: 3.2, repeat: Infinity, ease: "easeInOut" } }}
                    />

                    <motion.div
                      className="absolute top-[46px] flex gap-3"
                      animate={{ opacity: booted ? [0.45, 1, 0.45] : 0.25 }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {[0, 1, 2].map((dot) => (
                        <div
                          key={`top-dot-${dot}`}
                          className="h-3 w-3 rounded-full border border-orange-200/40 bg-orange-300/80 shadow-[0_0_14px_rgba(255,140,0,0.55)]"
                        />
                      ))}
                    </motion.div>

                    <motion.div
                      className="absolute bottom-[46px] flex gap-3"
                      animate={{ opacity: booted ? [1, 0.45, 1] : 0.25 }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    >
                      {[0, 1, 2].map((dot) => (
                        <div
                          key={`bottom-dot-${dot}`}
                          className="h-3 w-3 rounded-full border border-orange-200/40 bg-orange-300/80 shadow-[0_0_14px_rgba(255,140,0,0.55)]"
                        />
                      ))}
                    </motion.div>

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative h-[230px] w-[320px]">
                        <div
                          className="absolute inset-0 border border-orange-200/14 bg-[#0b0f14]/70 shadow-[0_0_60px_rgba(255,90,0,0.15)]"
                          style={{ clipPath: "polygon(6% 50%, 20% 20%, 50% 6%, 80% 20%, 94% 50%, 80% 80%, 50% 94%, 20% 80%)" }}
                        />

                        <div
                          className="absolute left-[34px] top-1/2 h-[118px] w-[86px] -translate-y-1/2 border border-orange-200/20 bg-[#0c1117]"
                          style={{ clipPath: "polygon(100% 10%, 38% 0, 0 50%, 38% 100%, 100% 90%, 72% 50%)" }}
                        />
                        <div
                          className="absolute right-[34px] top-1/2 h-[118px] w-[86px] -translate-y-1/2 border border-orange-200/20 bg-[#0c1117]"
                          style={{ clipPath: "polygon(0 10%, 62% 0, 100% 50%, 62% 100%, 0 90%, 28% 50%)" }}
                        />

                        <motion.div
                          className="absolute left-1/2 top-1/2 h-[174px] w-[174px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/35"
                          animate={{ scale: booted ? [1, 1.04, 1] : 1, opacity: booted ? [0.7, 1, 0.7] : 0.35 }}
                          transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <motion.div
                          className="absolute left-1/2 top-1/2 h-[138px] w-[138px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-orange-300 shadow-[0_0_36px_rgba(255,110,0,0.45)]"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                        />
                        <motion.div
                          className="absolute left-1/2 top-1/2 h-[106px] w-[106px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-orange-200/40"
                          animate={{ rotate: -360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        />

                        <motion.div
                          className="absolute left-1/2 top-1/2 h-[86px] w-[34px] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border border-orange-100/60 bg-[linear-gradient(to_bottom,rgba(255,228,180,0.95),rgba(255,137,41,0.92),rgba(190,65,0,0.95))] shadow-[0_0_26px_rgba(255,120,0,0.7)]"
                          animate={{ opacity: booted ? [0.82, 1, 0.82] : 0.4, scaleY: booted ? [1, 1.05, 1] : 1 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        />

                        <div className="absolute left-1/2 top-[30px] h-[2px] w-[150px] -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-300/60 to-transparent" />
                        <div className="absolute left-1/2 bottom-[30px] h-[2px] w-[150px] -translate-x-1/2 bg-gradient-to-r from-transparent via-orange-300/60 to-transparent" />

                        <motion.div
                          className="absolute left-1/2 top-1/2 h-[3px] w-[280px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-red-400/80 to-transparent blur-[1px]"
                          animate={{ opacity: [0.25, 0.8, 0.25], scaleX: [0.96, 1, 0.96] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                        />

                        <div className="absolute left-1/2 bottom-[56px] flex w-[136px] -translate-x-1/2 gap-[4px]">
                          {Array.from({ length: 9 }).map((_, index) => (
                            <motion.div
                              key={`grid-${index}`}
                              className="h-3 flex-1 border border-orange-300/14 bg-orange-300/14"
                              animate={{ opacity: booted ? [0.15, 0.5, 0.15] : 0.1 }}
                              transition={{ duration: 1.3, repeat: Infinity, delay: index * 0.08, ease: "easeInOut" }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="mb-2 text-xs uppercase tracking-[0.48em] text-orange-300/70">
                      Core Emblem
                    </div>
                    <h2 className="text-2xl font-semibold tracking-[0.12em] md:text-3xl">Chernobog Sigil State</h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/60 md:text-base">
                      The center display now uses the actual symbolic language you pointed out:
                      the eye-shaped frame, the circular iris, the vertical pupil, and the three-dot
                      rows above and below. That reads much closer to the Chernobog identity than the
                      earlier generic combat-frame silhouette.
                    </p>
                  </div>
                </div>
              </section>

              <section className="flex min-h-[460px] flex-col border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl" style={{ clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))" }}>
                <div className="mb-4 flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-white/55">
                  <ScanSearch className="h-4 w-4 text-orange-300" />
                  Directive Console
                </div>

                <div
                  ref={logContainerRef}
                  className="mb-4 h-[340px] overflow-y-auto border border-white/10 bg-black/35 p-4 pr-3 font-mono text-sm"
                  style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(251,146,60,0.65) rgba(255,255,255,0.06)" }}
                >
                  <div className="space-y-2 text-white/75">
                    {logs.map((log) => (
                      <div key={log.id} className="grid grid-cols-[84px_112px_1fr] gap-3 break-words">
                        <span className="text-white/35">{log.time}</span>
                        <span className="text-orange-300/85">{log.source}</span>
                        <span>{log.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="mt-auto flex flex-col gap-3 md:flex-row">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Issue directive..."
                    className="h-12 flex-1 border border-white/10 bg-black/35 px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-orange-400/45"
                    style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}
                  />
                  <button
                    type="submit"
                    className="flex h-12 items-center justify-center gap-2 border border-orange-400/30 bg-orange-400/10 px-5 text-sm text-orange-100 transition hover:bg-orange-400/20"
                    style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </form>
              </section>
            </main>

            <aside className="border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl" style={{ clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))" }}>
              <div className="mb-4 text-sm uppercase tracking-[0.28em] text-white/55">
                Combat Telemetry
              </div>

              <div className="space-y-5">
                <div className="border border-white/10 bg-black/25 p-4" style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}>
                  <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
                    <Crosshair className="h-4 w-4 text-orange-300" />
                    Targeting Lattice
                  </div>
                  <div className="space-y-2">
                    {[91, 74, 83, 68, 96, 78].map((value, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 text-xs text-white/35">{i + 1}</div>
                        <div className="h-2 flex-1 overflow-hidden bg-white/10">
                          <motion.div
                            className="h-full bg-gradient-to-r from-amber-700 via-orange-400 to-yellow-200"
                            initial={{ width: 0 }}
                            animate={{ width: `${booted ? value : 10}%` }}
                            transition={{ duration: 0.8, delay: i * 0.08 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-white/10 bg-black/25 p-4" style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}>
                  <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
                    <Sparkles className="h-4 w-4 text-orange-300" />
                    Visual Notes
                  </div>
                  <ul className="space-y-3 text-sm text-white/62">
                    <li>Gunmetal body panels instead of soft glass-card styling.</li>
                    <li>Amber-orange holographic light instead of pure blood-red glow.</li>
                    <li>Singular chest optic as the visual anchor.</li>
                    <li>Angled military HUD frames rather than rounded sci-fi bubbles.</li>
                    <li>Small red streaks to hint at scarf / warning-light energy.</li>
                  </ul>
                </div>

                <div className="border border-white/10 bg-black/25 p-4" style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))" }}>
                  <div className="mb-3 text-sm text-white/70">Recommended Next Pass</div>
                  <p className="text-sm leading-6 text-white/60">
                    After the visual is locked, the right next step is adding a real model
                    endpoint and replacing the fake response table. Do not pile in voice or
                    pseudo-neural extras before the chat loop works.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <ChernobogDebugPanel />
      </div>
    </div>
  );
}
