"use client";

import { CoreEyeSigil } from "@/components/command/CoreEye";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  chernobogCommandHierarchy,
  type CommandHierarchyNode,
} from "./commandHierarchy";

const ringPositions = [
  { x: 50, y: 10 },
  { x: 77, y: 20 },
  { x: 90, y: 48 },
  { x: 77, y: 76 },
  { x: 50, y: 88 },
  { x: 23, y: 76 },
  { x: 10, y: 48 },
  { x: 23, y: 20 },
];

function initials(label: string) {
  return label
    .split(/[ /]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function statusClasses(status: CommandHierarchyNode["status"]) {
  switch (status) {
    case "attention":
      return "bg-[#ff4a3d] shadow-[0_0_12px_rgba(255,74,61,0.7)]";
    case "standby":
      return "bg-[#b47738] shadow-[0_0_10px_rgba(180,119,56,0.38)]";
    case "online":
    default:
      return "bg-[#6df2a1] shadow-[0_0_12px_rgba(109,242,161,0.52)]";
  }
}

function CenterExecutive({ node }: { node: CommandHierarchyNode }) {
  return (
    <div className="flex h-[230px] w-[230px] flex-col items-center justify-center rounded-full border border-[#ff9d2e]/38 bg-[radial-gradient(circle,rgba(255,137,40,0.16),rgba(12,7,3,0.94)_58%,rgba(3,2,1,0.98)_74%)] shadow-[0_0_70px_rgba(255,112,20,0.12),inset_0_0_32px_rgba(255,157,46,0.05)]">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#ffb15a]/45 bg-[#110803]/92 text-2xl font-semibold tracking-[0.12em] text-[#ffd09a] shadow-[0_0_28px_rgba(255,126,34,0.14)]">
        {initials(node.label)}
      </div>
      <div className="mt-5 max-w-[190px] text-center text-sm font-semibold uppercase tracking-[0.22em] text-[#ffd09a]">
        {node.label}
      </div>
      <div className="mt-2 text-[9px] uppercase tracking-[0.3em] text-[#976238]">
        {node.kind === "agent" ? "Department Agent" : "Executive Focus"}
      </div>
    </div>
  );
}

function CenterCore() {
  return (
    <div className="relative flex h-[300px] w-[410px] items-center justify-center">
      <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,139,42,0.12),transparent_66%)] blur-xl" />
      <CoreEyeSigil className="relative h-[270px] w-[410px] drop-shadow-[0_0_24px_rgba(255,126,35,0.18)]" />
      <div className="pointer-events-none absolute bottom-[34px] left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ffd09a]">
          Chernobog
        </div>
        <div className="mt-1 text-[8px] uppercase tracking-[0.28em] text-[#8f5b2a]">
          Central Executive Intelligence
        </div>
      </div>
    </div>
  );
}

export function RecursiveCommandHierarchy() {
  const reduceMotion = useReducedMotion();
  const [path, setPath] = useState<CommandHierarchyNode[]>([
    chernobogCommandHierarchy,
  ]);

  const current = path[path.length - 1];
  const children = useMemo(() => current.children ?? [], [current]);

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 230, damping: 25, mass: 0.8 };

  function selectNode(node: CommandHierarchyNode) {
    setPath((existing) => [...existing, node]);
  }

  function goBack() {
    setPath((existing) =>
      existing.length > 1 ? existing.slice(0, -1) : existing,
    );
  }

  function goTo(index: number) {
    setPath((existing) => existing.slice(0, index + 1));
  }

  return (
    <section
      className="relative min-h-[760px] overflow-hidden border border-[#7b431c]/70 bg-[#050302]/94 shadow-[inset_0_0_70px_rgba(255,120,35,0.025)]"
      onKeyDown={(event) => {
        if (event.key === "Escape" && path.length > 1) {
          event.preventDefault();
          goBack();
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(255,116,22,0.09),transparent_28%),linear-gradient(rgba(255,157,46,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,157,46,0.018)_1px,transparent_1px)] bg-[size:auto,52px_52px,52px_52px]" />

      <header className="relative z-30 flex min-h-[58px] flex-wrap items-center justify-between gap-3 border-b border-[#7b431c]/45 bg-black/20 px-4 py-3">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.32em] text-[#8f5b2a]">
            3D-0 // hierarchy interaction proof
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {path.map((node, index) => (
              <span key={node.id} className="flex items-center gap-1.5">
                {index > 0 ? (
                  <span className="text-[10px] text-[#65411f]">/</span>
                ) : null}
                <button
                  type="button"
                  onClick={() => goTo(index)}
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d99a57] transition hover:text-[#ffd09a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9d2e]"
                >
                  {node.label}
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-[9px] uppercase tracking-[0.2em] text-[#725033] sm:inline">
            Esc = back
          </span>
          <button
            type="button"
            onClick={goBack}
            disabled={path.length === 1}
            className="border border-[#7b431c]/60 bg-[#0c0603] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-[#d99a57] transition enabled:hover:border-[#ff9d2e]/70 enabled:hover:text-[#ffd09a] disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9d2e]"
          >
            Back one layer
          </button>
        </div>
      </header>

      <div className="relative z-10 h-[700px] min-w-[720px]" aria-label="Chernobog command hierarchy">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <circle cx="50" cy="48" r="28" fill="none" stroke="rgba(255,157,46,0.08)" strokeWidth="0.18" />
          <circle cx="50" cy="48" r="37" fill="none" stroke="rgba(255,157,46,0.05)" strokeWidth="0.14" strokeDasharray="1.2 1.7" />
          {children.slice(0, 8).map((node, index) => {
            const position = ringPositions[index];
            return (
              <line
                key={`line-${node.id}`}
                x1="50"
                y1="48"
                x2={position.x}
                y2={position.y}
                stroke="rgba(255,157,46,0.18)"
                strokeWidth="0.18"
              />
            );
          })}
        </svg>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`center-${current.id}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.72, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 1.16, rotate: 2 }}
            transition={transition}
            className="absolute left-1/2 top-[48%] z-20 -translate-x-1/2 -translate-y-1/2"
          >
            {current.kind === "core" ? <CenterCore /> : <CenterExecutive node={current} />}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="popLayout" initial={false}>
          {children.slice(0, 8).map((node, index) => {
            const position = ringPositions[index];
            const canDescend = Boolean(node.children?.length);

            return (
              <div
                key={`${current.id}-${node.id}-position`}
                className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                <motion.button
                  type="button"
                  layoutId={`hierarchy-node-${node.id}`}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.55 }}
                  transition={{ ...transition, delay: reduceMotion ? 0 : index * 0.025 }}
                  onClick={() => selectNode(node)}
                  aria-label={`Focus ${node.label}`}
                  className="group relative flex h-[104px] w-[124px] flex-col items-center justify-center border border-[#7b431c]/70 bg-[#090402]/96 px-2 text-center shadow-[0_0_30px_rgba(0,0,0,0.52),inset_0_0_20px_rgba(255,133,33,0.025)] transition hover:border-[#ff9d2e]/75 hover:bg-[#120803] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9d2e]"
                  style={{
                    clipPath:
                      "polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)",
                  }}
                >
                  <span className={`absolute right-2 top-2 h-1.5 w-1.5 rounded-full ${statusClasses(node.status)}`} />
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8b4d21]/60 bg-black/25 text-[10px] font-semibold tracking-[0.12em] text-[#e7aa68] group-hover:border-[#ff9d2e]/70 group-hover:text-[#ffd09a]">
                    {initials(node.label)}
                  </span>
                  <span className="mt-2 max-w-[108px] text-[9px] font-semibold uppercase leading-4 tracking-[0.15em] text-[#d8a169] group-hover:text-[#ffd09a]">
                    {node.label}
                  </span>
                  <span className="mt-1 text-[7px] uppercase tracking-[0.18em] text-[#6e492c]">
                    {canDescend ? "open directorate" : "focus agent"}
                  </span>
                </motion.button>
              </div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.aside
            key={`detail-${current.id}`}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="absolute bottom-4 left-1/2 z-30 w-[min(760px,82%)] -translate-x-1/2 border border-[#7b431c]/55 bg-[#050302]/94 px-4 py-3 text-center shadow-[0_0_28px_rgba(0,0,0,0.38)]"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span className={`h-1.5 w-1.5 rounded-full ${statusClasses(current.status)}`} />
              <span className="text-[9px] font-semibold uppercase tracking-[0.24em] text-[#f2c27d]">
                {current.title}
              </span>
              <span className="text-[8px] uppercase tracking-[0.22em] text-[#815632]">
                {current.subtitle}
              </span>
            </div>
            <p className="mx-auto mt-2 max-w-[680px] text-[10px] leading-5 text-[#a77c54]">
              {current.summary}
            </p>
            {children.length === 0 ? (
              <div className="mt-2 text-[8px] uppercase tracking-[0.2em] text-[#694629]">
                No lower command layer defined yet â€” use Back to return to the parent directorate.
              </div>
            ) : null}
          </motion.aside>
        </AnimatePresence>
      </div>
    </section>
  );
}
