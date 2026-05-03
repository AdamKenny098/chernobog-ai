"use client";

import { memo, useMemo } from "react";
import type { CSSProperties } from "react";

const CODE_STREAMS = [
  "010101",
  "CHERNOBOG",
  "MEMORY",
  "TOOLS",
  "ROUTE",
  "AXIOM",
  "WAKE",
  "TRUST",
  "CORE",
  "SYSTEM",
  "NODE",
  "WATCH",
  "HOME",
  "LAB",
  "SIGNAL",
  "VECTOR",
  "GHOST",
  "THREAD",
  "ORBIT",
  "KERNEL",
];

type ColumnLayer = "far" | "near";

type ColumnConfig = {
  id: string;
  text: string;
  left: number;
  duration: number;
  delay: number;
  fontSize: number;
  opacity: number;
  blur: boolean;
  bright: boolean;
  short: boolean;
  layer: ColumnLayer;
};

const FAR_COLUMN_COUNT = 34;
const NEAR_COLUMN_COUNT = 28;

function getCharacter(columnIndex: number, rowIndex: number) {
  const stream = CODE_STREAMS[(columnIndex + rowIndex) % CODE_STREAMS.length];
  return stream[(columnIndex * 3 + rowIndex * 5) % stream.length];
}

function buildColumnText(columnIndex: number, layer: ColumnLayer) {
    const baseLength = layer === "near" ? 30 : 24;
    const length = baseLength + ((columnIndex * 7) % 22);

  let text = "";

  for (let rowIndex = 0; rowIndex < length; rowIndex += 1) {
    text += getCharacter(columnIndex, rowIndex);

    if (rowIndex < length - 1) {
      text += "\n";
    }
  }

  return text;
}

function makeFarColumns(): ColumnConfig[] {
  return Array.from({ length: FAR_COLUMN_COUNT }, (_, index) => {
    const left = (index / FAR_COLUMN_COUNT) * 100;
    const distanceFromCenter = Math.abs(left - 50);
    const centerBoost = distanceFromCenter < 18;

    return {
      id: `far-${index}`,
      text: buildColumnText(index, "far"),
      left,
      duration: 2.8 + ((index * 13) % 5),
      delay: -((index * 5) % 23),
      fontSize: 16 + ((index * 3) % 6),
      opacity: centerBoost
        ? 0.34 + ((index * 11) % 34) / 100
        : 0.2 + ((index * 11) % 28) / 100,
      blur: index % 9 === 0,
      bright: index % 17 === 0 || centerBoost,
      short: index % 6 === 0,
      layer: "far",
    };
  });
}

function makeNearColumns(): ColumnConfig[] {
  return Array.from({ length: NEAR_COLUMN_COUNT }, (_, index) => {
    const normalized = index / Math.max(NEAR_COLUMN_COUNT - 1, 1);
    const left = 28 + normalized * 44;
    const distanceFromCenter = Math.abs(left - 50);
    const centerBoost = distanceFromCenter < 16;

    return {
      id: `near-${index}`,
      text: buildColumnText(index + 1000, "near"),
      left,
      duration: 2.4 + ((index * 7) % 4),
      delay: -((index * 3) % 19),
      fontSize: 18 + ((index * 5) % 7),
      opacity: centerBoost
        ? 0.44 + ((index * 11) % 26) / 100
        : 0.28 + ((index * 11) % 20) / 100,
      blur: index % 8 === 0,
      bright: true,
      short: index % 5 === 0,
      layer: "near",
    };
  });
}

function createColumnStyle(column: ColumnConfig): CSSProperties {
  return {
    left: `${column.left}%`,
    fontSize: `${column.fontSize}px`,
    opacity: column.opacity,
    animationDuration: `${column.duration}s`,
    animationDelay: `${column.delay}s`,
  };
}

const RainColumn = memo(function RainColumn({
  column,
}: {
  column: ColumnConfig;
}) {
  const isNear = column.layer === "near";

  return (
    <div
      className={[
        "absolute font-mono leading-[1.04] tracking-[0.12em]",
        "whitespace-pre text-red-500",
        "chernobog-code-column",
        column.blur ? "blur-[0.7px]" : "",
        column.bright ? "chernobog-code-hot" : "chernobog-code-standard",
        column.short ? "max-h-[66vh] overflow-hidden" : "",
        isNear ? "top-[-42%]" : "top-[-58%]",
      ].join(" ")}
      style={createColumnStyle(column)}
    >
      {column.text}
    </div>
  );
});

export default function CodeRain() {
  const farColumns = useMemo(() => makeFarColumns(), []);
  const nearColumns = useMemo(() => makeNearColumns(), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#020000]">
      <style>
        {`
          @keyframes chernobog-code-rain {
            0% {
              transform: translate3d(0, -18%, 0);
            }

            100% {
              transform: translate3d(0, 150%, 0);
            }
          }

          .chernobog-code-column {
            animation-name: chernobog-code-rain;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            will-change: transform;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            contain: layout paint style;
            user-select: none;
          }

          .chernobog-code-standard {
            text-shadow:
              0 0 4px rgba(255, 34, 24, 0.72),
              0 0 12px rgba(255, 20, 12, 0.28);
          }

          .chernobog-code-hot {
            text-shadow:
              0 0 6px rgba(255, 80, 62, 0.95),
              0 0 18px rgba(255, 30, 18, 0.7),
              0 0 34px rgba(255, 20, 12, 0.35);
          }
        `}
      </style>

      <svg
        className="absolute inset-0 h-full w-full opacity-60"
        preserveAspectRatio="none"
        viewBox="0 0 1920 1080"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="codeRainCenterGlow" cx="50%" cy="42%" r="46%">
            <stop offset="0%" stopColor="#ff1c12" stopOpacity="0.26" />
            <stop offset="36%" stopColor="#7c0603" stopOpacity="0.12" />
            <stop offset="72%" stopColor="#140000" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="codeRainEyeField" cx="50%" cy="39%" r="24%">
            <stop offset="0%" stopColor="#ff2a1e" stopOpacity="0.18" />
            <stop offset="54%" stopColor="#8a0704" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="codeRainTopFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff281c" stopOpacity="0.22" />
            <stop offset="48%" stopColor="#ff1208" stopOpacity="0.09" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="1920" height="1080" fill="url(#codeRainCenterGlow)" />
        <rect width="1920" height="1080" fill="url(#codeRainEyeField)" />
        <rect width="1920" height="520" fill="url(#codeRainTopFade)" />

        <g opacity="0.22">
          <line x1="960" y1="0" x2="960" y2="1080" stroke="#ff2117" />
          <circle
            cx="960"
            cy="450"
            r="410"
            fill="none"
            stroke="#ff2117"
            strokeOpacity="0.14"
          />
          <circle
            cx="960"
            cy="450"
            r="620"
            fill="none"
            stroke="#ff2117"
            strokeOpacity="0.08"
          />
        </g>
      </svg>

      <div className="absolute inset-0 opacity-90">
        {farColumns.map((column) => (
          <RainColumn key={column.id} column={column} />
        ))}
      </div>

      <div className="absolute inset-0 opacity-85">
        {nearColumns.map((column) => (
          <RainColumn key={column.id} column={column} />
        ))}
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.24)_0%,rgba(0,0,0,0.16)_20%,transparent_38%,rgba(0,0,0,0.22)_62%,rgba(0,0,0,0.82)_100%)]" />

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_0%,rgba(0,0,0,0.14)_42%,rgba(0,0,0,0.44)_78%,rgba(0,0,0,0.88)_100%)]" />

      <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,40,30,0.34)_1px,transparent_1px),linear-gradient(90deg,rgba(255,40,30,0.22)_1px,transparent_1px)] [background-size:64px_64px]" />
    </div>
  );
}