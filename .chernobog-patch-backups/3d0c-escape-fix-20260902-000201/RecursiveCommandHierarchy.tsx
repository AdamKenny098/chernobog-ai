"use client";

import { CoreEyeSigil } from "@/components/command/CoreEye";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  chernobogCommandHierarchy,
  type CommandHierarchyNode,
} from "./commandHierarchy";

const ringPositions = [
  { x: 50, y: 8 },
  { x: 78, y: 18 },
  { x: 91, y: 48 },
  { x: 78, y: 78 },
  { x: 50, y: 90 },
  { x: 22, y: 78 },
  { x: 9, y: 48 },
  { x: 22, y: 18 },
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

function statusDot(status: CommandHierarchyNode["status"]) {
  switch (status) {
    case "attention":
      return "bg-[#ff4a3d] shadow-[0_0_14px_rgba(255,74,61,0.72)]";
    case "standby":
      return "bg-[#a66a32] shadow-[0_0_12px_rgba(166,106,50,0.42)]";
    case "online":
    default:
      return "bg-[#6df2a1] shadow-[0_0_14px_rgba(109,242,161,0.56)]";
  }
}

function FloatingCore({ selected }: { selected: boolean }) {
  return (
    <div className="group relative flex h-[390px] w-[620px] max-w-[66vw] items-center justify-center">
      <div
        className={[
          "pointer-events-none absolute left-1/2 top-1/2 h-[320px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition duration-300",
          selected
            ? "bg-[#ff7d22]/14"
            : "bg-[#ff7d22]/7 group-hover:bg-[#ff7d22]/11",
        ].join(" ")}
      />
      <div
        className={[
          "pointer-events-none absolute left-1/2 top-1/2 h-[290px] w-[290px] -translate-x-1/2 -translate-y-1/2 rounded-full border transition duration-300",
          selected
            ? "border-[#ffb15a]/42 shadow-[0_0_70px_rgba(255,126,35,0.16)]"
            : "border-[#ff9d2e]/16 group-hover:border-[#ff9d2e]/32",
        ].join(" ")}
      />
      <CoreEyeSigil
        className={[
          "relative h-[360px] w-[620px] transition duration-300",
          selected
            ? "drop-shadow-[0_0_34px_rgba(255,141,50,0.34)]"
            : "drop-shadow-[0_0_22px_rgba(255,126,35,0.18)] group-hover:drop-shadow-[0_0_30px_rgba(255,141,50,0.28)]",
        ].join(" ")}
      />
      <div className="pointer-events-none absolute bottom-[38px] left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
        <div className="text-[12px] font-semibold uppercase tracking-[0.42em] text-[#ffd09a]">
          Chernobog
        </div>
        <div className="mt-1 text-[8px] uppercase tracking-[0.3em] text-[#83552f]">
          Central Executive Intelligence
        </div>
      </div>
    </div>
  );
}

function FloatingExecutive({
  node,
  selected,
}: {
  node: CommandHierarchyNode;
  selected: boolean;
}) {
  return (
    <div className="group relative flex h-[300px] w-[300px] items-center justify-center">
      <div
        className={[
          "absolute inset-8 rounded-full border bg-[radial-gradient(circle,rgba(255,133,36,0.12),rgba(4,2,1,0.96)_66%)] transition duration-300",
          selected
            ? "border-[#ffad51]/60 shadow-[0_0_70px_rgba(255,115,25,0.19)]"
            : "border-[#8f4d21]/40 group-hover:border-[#ff9d2e]/58",
        ].join(" ")}
      />
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-[#a75b28]/55 bg-[#080402] text-2xl font-semibold tracking-[0.12em] text-[#e6a35f] shadow-[0_0_32px_rgba(255,113,24,0.1)]">
        {initials(node.label)}
      </div>
      <div className="pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffd09a]">
          {node.label}
        </div>
        <div className="mt-1 text-[8px] uppercase tracking-[0.22em] text-[#765033]">
          {node.kind === "agent" ? "Department Agent" : "Executive Directorate"}
        </div>
      </div>
    </div>
  );
}

function OrbitNode({
  node,
  index,
  onSelect,
  reduceMotion,
}: {
  node: CommandHierarchyNode;
  index: number;
  onSelect: () => void;
  reduceMotion: boolean | null;
}) {
  const canDescend = Boolean(node.children?.length);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.72 }}
      transition={{
        duration: reduceMotion ? 0 : 0.25,
        delay: reduceMotion ? 0 : index * 0.025,
      }}
    >
      <motion.button
        type="button"
        onClick={onSelect}
        aria-label={`Focus ${node.label}`}
        animate={
          reduceMotion
            ? undefined
            : {
                y: [0, -3, 0, 3, 0],
              }
        }
        transition={
          reduceMotion
            ? undefined
            : {
                duration: 5.2 + index * 0.22,
                repeat: Infinity,
                ease: "easeInOut",
              }
        }
        className="group relative flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full border border-[#7b431c]/52 bg-[#050301]/82 text-center shadow-[0_0_28px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,132,32,0.025)] backdrop-blur-[2px] transition hover:scale-105 hover:border-[#ff9d2e]/78 hover:bg-[#100703]/92 hover:shadow-[0_0_34px_rgba(255,118,25,0.11)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9d2e]"
      >
        <span
          className={`absolute right-[13px] top-[12px] h-1.5 w-1.5 rounded-full ${statusDot(node.status)}`}
        />
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#8b4d21]/55 bg-black/25 text-[10px] font-semibold tracking-[0.12em] text-[#df9958] transition group-hover:border-[#ff9d2e]/70 group-hover:text-[#ffd09a]">
          {initials(node.label)}
        </span>
        <span className="mt-2 max-w-[94px] text-[8px] font-semibold uppercase leading-3 tracking-[0.13em] text-[#c98f52] transition group-hover:text-[#ffd09a]">
          {node.label}
        </span>
        <span className="mt-1 text-[6px] uppercase tracking-[0.16em] text-[#664328]">
          {canDescend ? "open" : "focus"}
        </span>
      </motion.button>
    </motion.div>
  );
}

export function RecursiveCommandHierarchy() {
  const reduceMotion = useReducedMotion();
  const [path, setPath] = useState<CommandHierarchyNode[]>([
    chernobogCommandHierarchy,
  ]);
  const [centerSelected, setCenterSelected] = useState(false);

  const current = path[path.length - 1];
  const children = useMemo(() => current.children ?? [], [current]);

  function selectNode(node: CommandHierarchyNode) {
    setCenterSelected(false);
    setPath((existing) => [...existing, node]);
  }

  function goBack() {
    setCenterSelected(false);
    setPath((existing) =>
      existing.length > 1 ? existing.slice(0, -1) : existing,
    );
  }

  function goTo(index: number) {
    setCenterSelected(false);
    setPath((existing) => existing.slice(0, index + 1));
  }

  return (
    <section
      className="relative min-h-[860px] overflow-hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape" && path.length > 1) {
          event.preventDefault();
          goBack();
        }
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(255,105,18,0.09),transparent_24%),radial-gradient(circle_at_50%_48%,rgba(255,157,46,0.025),transparent_52%)]" />

      <div className="absolute left-5 top-4 z-40 flex flex-wrap items-center gap-2">
        {path.map((node, index) => (
          <span key={node.id} className="flex items-center gap-2">
            {index > 0 ? (
              <span className="text-[9px] text-[#57381f]">/</span>
            ) : null}
            <button
              type="button"
              onClick={() => goTo(index)}
              className="text-[8px] font-semibold uppercase tracking-[0.2em] text-[#8e623c] transition hover:text-[#ffd09a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9d2e]"
            >
              {node.label}
            </button>
          </span>
        ))}
      </div>

      {path.length > 1 ? (
        <button
          type="button"
          onClick={goBack}
          className="absolute right-5 top-4 z-40 border border-[#71401f]/45 bg-black/20 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.2em] text-[#96663d] transition hover:border-[#ff9d2e]/60 hover:text-[#ffd09a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9d2e]"
        >
          Back
        </button>
      ) : null}

      <div
        className="relative mx-auto h-[840px] w-full min-w-[920px] max-w-[1680px]"
        aria-label="Chernobog command hierarchy"
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="48"
            r="31"
            fill="none"
            stroke="rgba(255,157,46,0.10)"
            strokeWidth="0.14"
          />
          <circle
            cx="50"
            cy="48"
            r="39"
            fill="none"
            stroke="rgba(255,157,46,0.055)"
            strokeWidth="0.12"
            strokeDasharray="1.1 1.8"
          />
          <circle
            cx="50"
            cy="48"
            r="22"
            fill="none"
            stroke="rgba(255,157,46,0.05)"
            strokeWidth="0.1"
            strokeDasharray="0.7 1.4"
          />
          {children.slice(0, 8).map((node, index) => {
            const position = ringPositions[index];
            return (
              <line
                key={`line-${node.id}`}
                x1="50"
                y1="48"
                x2={position.x}
                y2={position.y}
                stroke="rgba(255,157,46,0.13)"
                strokeWidth="0.12"
              />
            );
          })}
        </svg>

        {!reduceMotion ? (
          <>
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[48%] h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#ff9d2e]/8"
              animate={{ rotate: 360 }}
              transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[48%] h-[690px] w-[690px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#ff9d2e]/5"
              animate={{ rotate: -360 }}
              transition={{ duration: 130, repeat: Infinity, ease: "linear" }}
            />
          </>
        ) : null}

        <AnimatePresence mode="wait" initial={false}>
          <motion.button
            key={`center-${current.id}`}
            type="button"
            onClick={() => setCenterSelected((value) => !value)}
            aria-label={`Focus ${current.label}`}
            aria-pressed={centerSelected}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.76 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 1.14 }}
            transition={{ duration: reduceMotion ? 0 : 0.34, ease: "easeOut" }}
            className="group absolute left-1/2 top-[48%] z-20 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9d2e]/80"
          >
            {current.kind === "core" ? (
              <FloatingCore selected={centerSelected} />
            ) : (
              <FloatingExecutive node={current} selected={centerSelected} />
            )}
          </motion.button>
        </AnimatePresence>

        <AnimatePresence mode="popLayout" initial={false}>
          {children.slice(0, 8).map((node, index) => {
            const position = ringPositions[index];

            return (
              <div
                key={`${current.id}-${node.id}-position`}
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                <OrbitNode
                  node={node}
                  index={index}
                  onSelect={() => selectNode(node)}
                  reduceMotion={reduceMotion}
                />
              </div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {centerSelected ? (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 6 }}
              className="pointer-events-none absolute bottom-8 left-1/2 z-30 max-w-[620px] -translate-x-1/2 text-center"
            >
              <div className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#e5a25f]">
                {current.title}
              </div>
              <p className="mt-2 text-[9px] leading-5 text-[#79583d]">
                {current.summary}
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {children.length === 0 && !centerSelected ? (
          <div className="pointer-events-none absolute bottom-9 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-[0.22em] text-[#5f4128]">
            End of defined command layer — press Esc or Back to return
          </div>
        ) : null}
      </div>
    </section>
  );
}