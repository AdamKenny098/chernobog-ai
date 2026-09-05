"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useMemo, useState, useEffect } from "react";
import {
  CommandCenterScene3D,
  type HierarchyTransition,
} from "./CommandCenterScene3D";
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
          "pointer-events-none absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border transition duration-300",
          selected
            ? "border-[#ffb15a]/32 shadow-[0_0_90px_rgba(255,126,35,0.12)]"
            : "border-transparent group-hover:border-[#ff9d2e]/18",
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

function FloatingAuthority({
  node,
  selected,
}: {
  node: CommandHierarchyNode;
  selected: boolean;
}) {
  return (
    <div className="group relative flex h-[340px] w-[340px] items-center justify-center">
      <div
        className={[
          "pointer-events-none absolute inset-[42px] rounded-full border transition duration-300",
          selected
            ? "border-[#ffad51]/34 shadow-[0_0_80px_rgba(255,115,25,0.12)]"
            : "border-transparent group-hover:border-[#ff9d2e]/18",
        ].join(" ")}
      />
      <div className="pointer-events-none absolute bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap text-center">
        <div className="text-[12px] font-semibold uppercase tracking-[0.32em] text-[#ffd09a]">
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
  onHoverChange,
  reduceMotion,
}: {
  node: CommandHierarchyNode;
  index: number;
  onSelect: () => void;
  onHoverChange: (hovered: boolean) => void;
  reduceMotion: boolean | null;
}) {
  const canDescend = Boolean(node.children?.length);

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, scale: 0.72 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0, scale: 0.72 }}
      transition={{
        duration: reduceMotion ? 0 : 0.22,
        delay: reduceMotion ? 0 : index * 0.018,
      }}
    >
      <motion.button
        type="button"
        onClick={onSelect}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        onFocus={() => onHoverChange(true)}
        onBlur={() => onHoverChange(false)}
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
        className="group relative flex h-[118px] w-[132px] items-end justify-center rounded-full pb-1 text-center transition hover:scale-105 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9d2e]"
      >
        <span
          className={`absolute right-[22px] top-[19px] h-1.5 w-1.5 rounded-full ${statusDot(node.status)}`}
        />
        <span className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-transparent transition group-hover:border-[#ff9d2e]/28 group-focus-visible:border-[#ff9d2e]/38" />
        <span className="rounded-sm border border-[#6f3b1a]/38 bg-[#050301]/72 px-2 py-1 backdrop-blur-[2px]">
          <span className="block max-w-[118px] text-[8px] font-semibold uppercase leading-3 tracking-[0.13em] text-[#c98f52] transition group-hover:text-[#ffd09a]">
            {node.label}
          </span>
          <span className="mt-0.5 block text-[6px] uppercase tracking-[0.16em] text-[#664328]">
            {canDescend ? "open" : "focus"}
          </span>
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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [transition, setTransition] = useState<HierarchyTransition>({
    serial: 0,
    mode: "initial",
    originIndex: null,
    depth: 0,
  });

  const current = path[path.length - 1];
  const nodes = useMemo(() => current.children ?? [], [current]);

  function selectNode(node: CommandHierarchyNode, index: number) {
    setCenterSelected(false);
    setHoveredNodeId(null);
    setTransition((existing) => ({
      serial: existing.serial + 1,
      mode: "forward",
      originIndex: index,
      depth: path.length,
    }));
    setPath((existing) => [...existing, node]);
  }

  const goBack = useCallback(() => {
    if (path.length <= 1) {
      setCenterSelected(false);
      return;
    }

    const parent = path[path.length - 2];
    const departing = path[path.length - 1];
    const departingIndex =
      parent.children?.findIndex((node) => node.id === departing.id) ?? -1;

    setCenterSelected(false);
    setHoveredNodeId(null);
    setTransition((existing) => ({
      serial: existing.serial + 1,
      mode: "back",
      originIndex: departingIndex >= 0 ? departingIndex : null,
      depth: Math.max(0, path.length - 2),
    }));
    setPath((existing) => existing.slice(0, -1));
  }, [path]);

  function goTo(index: number) {
    if (index === path.length - 1) {
      return;
    }

    setCenterSelected(false);
    setHoveredNodeId(null);
    setTransition((existing) => ({
      serial: existing.serial + 1,
      mode: "jump",
      originIndex: null,
      depth: index,
    }));
    setPath((existing) => existing.slice(0, index + 1));
  }

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return;
      }

      const activeElement = document.activeElement;
      const isEditing =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement ||
        (activeElement instanceof HTMLElement &&
          activeElement.isContentEditable);

      if (isEditing) {
        return;
      }

      if (path.length > 1) {
        event.preventDefault();
        goBack();
        return;
      }

      if (centerSelected) {
        event.preventDefault();
        setCenterSelected(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [centerSelected, goBack, path.length]);

  return (
    <section className="relative min-h-[860px] overflow-hidden">
      <CommandCenterScene3D
        current={current}
        nodes={nodes.slice(0, 8)}
        hoveredNodeId={hoveredNodeId}
        transition={transition}
      />

      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_48%,rgba(255,105,18,0.045),transparent_27%),radial-gradient(circle_at_50%_48%,rgba(255,157,46,0.018),transparent_54%)]" />

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
        className="relative z-20 mx-auto h-[840px] w-full min-w-[920px] max-w-[1680px]"
        aria-label="Chernobog command hierarchy"
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="48"
            r="31"
            fill="none"
            stroke="rgba(255,157,46,0.08)"
            strokeWidth="0.12"
          />
          <circle
            cx="50"
            cy="48"
            r="39"
            fill="none"
            stroke="rgba(255,157,46,0.035)"
            strokeWidth="0.1"
            strokeDasharray="1.1 1.8"
          />
          {nodes.slice(0, 8).map((node, index) => {
            const position = ringPositions[index];
            return (
              <line
                key={`line-${node.id}`}
                x1="50"
                y1="48"
                x2={position.x}
                y2={position.y}
                stroke="rgba(255,157,46,0.085)"
                strokeWidth="0.1"
              />
            );
          })}
        </svg>

        <AnimatePresence mode="wait" initial={false}>
          <motion.button
            key={`center-${current.id}`}
            type="button"
            onClick={() => setCenterSelected((value) => !value)}
            aria-label={`Focus ${current.label}`}
            aria-pressed={centerSelected}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, scale: 1.08 }}
            transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
            className="group absolute left-1/2 top-[48%] z-20 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ff9d2e]/80"
          >
            {current.kind === "core" ? (
              <FloatingCore selected={centerSelected} />
            ) : (
              <FloatingAuthority node={current} selected={centerSelected} />
            )}
          </motion.button>
        </AnimatePresence>

        <AnimatePresence mode="popLayout" initial={false}>
          {nodes.slice(0, 8).map((node, index) => {
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
                  onSelect={() => selectNode(node, index)}
                  onHoverChange={(hovered) =>
                    setHoveredNodeId(hovered ? node.id : null)
                  }
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

        {nodes.length === 0 && !centerSelected ? (
          <div className="pointer-events-none absolute bottom-9 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-[0.22em] text-[#5f4128]">
            End of defined command layer - press Esc or Back to return
          </div>
        ) : null}
      </div>
    </section>
  );
}
