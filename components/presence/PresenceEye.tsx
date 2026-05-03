"use client";

import type { PresenceState } from "./ChernobogPresenceDisplay";

type PresenceEyeProps = {
  state: PresenceState;
};

const EYE_PATH =
  "M145 260 C245 118 410 70 560 70 C710 70 875 118 975 260 C875 402 710 450 560 450 C410 450 245 402 145 260 Z";

const INNER_EYE_PATH =
  "M185 260 C295 155 430 118 560 118 C690 118 825 155 935 260 C825 365 690 402 560 402 C430 402 295 365 185 260 Z";

const LOWER_INNER_CURVE =
  "M225 260 C330 350 455 382 560 382 C665 382 790 350 895 260";

const UPPER_INNER_CURVE =
  "M225 260 C330 170 455 138 560 138 C665 138 790 170 895 260";

const CORE_CHARS = "0101CHERNOBOG9876MEMORYTOOLSROUTEAXIOMKERNELTRUST";

export default function PresenceEye({ state }: PresenceEyeProps) {
  const active = state !== "standby";

  return (
    <div className="relative flex h-[520px] w-[1120px] items-center justify-center">
      <svg
        viewBox="0 0 1120 520"
        className={[
          "h-full w-full overflow-visible",
          active ? "chernobog-eye-active" : "",
        ].join(" ")}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="eyeCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe5df" stopOpacity="1" />
            <stop offset="12%" stopColor="#ff6a5c" stopOpacity="1" />
            <stop offset="28%" stopColor="#ff1b10" stopOpacity="0.88" />
            <stop offset="58%" stopColor="#790704" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="innerEyeDark" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#160000" stopOpacity="0.78" />
            <stop offset="32%" stopColor="#030000" stopOpacity="0.99" />
            <stop offset="100%" stopColor="#000000" stopOpacity="1" />
          </radialGradient>

          <radialGradient id="codeVisibilityFade" cx="50%" cy="50%" r="66%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="34%" stopColor="white" stopOpacity="0.8" />
            <stop offset="70%" stopColor="white" stopOpacity="0.34" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="pupilRectFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd8d2" />
            <stop offset="12%" stopColor="#ff6a5c" />
            <stop offset="35%" stopColor="#ff2418" />
            <stop offset="58%" stopColor="#d80d08" />
            <stop offset="82%" stopColor="#790302" />
            <stop offset="100%" stopColor="#210000" />
            </linearGradient>

          <linearGradient id="outerEyeStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c90b06" stopOpacity="0.9" />
            <stop offset="15%" stopColor="#ff2a1e" stopOpacity="1" />
            <stop offset="32%" stopColor="#ff5a48" stopOpacity="0.92" />
            <stop offset="50%" stopColor="#d80d08" stopOpacity="0.78" />
            <stop offset="68%" stopColor="#ff5a48" stopOpacity="0.92" />
            <stop offset="85%" stopColor="#ff2a1e" stopOpacity="1" />
            <stop offset="100%" stopColor="#c90b06" stopOpacity="0.9" />
        </linearGradient>

          <filter id="redGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                1 0 0 0 0.9
                0 0.10 0 0 0
                0 0 0.06 0 0
                0 0 0 1 0"
              result="coloredBlur"
            />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter
            id="heavyRedGlow"
            x="-160%"
            y="-160%"
            width="420%"
            height="420%"
          >
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                1 0 0 0 1
                0 0.08 0 0 0
                0 0 0.04 0 0
                0 0 0 1 0"
              result="coloredBlur"
            />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter
            id="irisBloom"
            x="-180%"
            y="-180%"
            width="460%"
            height="460%"
          >
            <feGaussianBlur stdDeviation="22" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="
                1 0 0 0 1
                0 0.05 0 0 0
                0 0 0.03 0 0
                0 0 0 0.95 0"
              result="coloredBlur"
            />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <clipPath id="eyeClip">
            <path d={EYE_PATH} />
          </clipPath>

          <mask id="eyeCodeMask">
            <rect width="1120" height="520" fill="black" />
            <path d={EYE_PATH} fill="url(#codeVisibilityFade)" />
          </mask>
        </defs>

        <g filter="url(#redGlow)">
          <circle cx="510" cy="42" r="10" fill="#ff3328" />
          <circle cx="560" cy="42" r="10" fill="#ff3328" />
          <circle cx="610" cy="42" r="10" fill="#ff3328" />
        </g>

        <g filter="url(#redGlow)">
          <circle cx="510" cy="478" r="10" fill="#ff3328" />
          <circle cx="560" cy="478" r="10" fill="#ff3328" />
          <circle cx="610" cy="478" r="10" fill="#ff3328" />
        </g>

        <path d={EYE_PATH} fill="url(#innerEyeDark)" opacity="1" />

        <g clipPath="url(#eyeClip)" mask="url(#eyeCodeMask)" opacity="1">
          {Array.from({ length: 76 }).map((_, column) => {
            const x = 130 + column * 13;
            const offset = column % 2 === 0 ? 0 : 9;

            return (
              <g key={column} className="eye-code-column">
                {Array.from({ length: 28 }).map((__, row) => {
                  const char =
                    CORE_CHARS[(column * 5 + row * 3) % CORE_CHARS.length];

                  return (
                    <text
                      key={row}
                      x={x}
                      y={112 + row * 12 + offset}
                      className="eye-code-char"
                    >
                      {char}
                    </text>
                  );
                })}
              </g>
            );
          })}
        </g>

        <circle
          cx="560"
          cy="260"
          r="205"
          fill="url(#eyeCoreGlow)"
          opacity="0.3"
        />

        <path
          d={EYE_PATH}
          fill="none"
          stroke="url(#outerEyeStroke)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#heavyRedGlow)"
        />

        <path
        d={EYE_PATH}
        fill="none"
        stroke="#ff3a2d"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.72"
        />

        <path
          d={INNER_EYE_PATH}
          fill="none"
          stroke="#ff2a1e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
          filter="url(#redGlow)"
        />

        <path
          d={UPPER_INNER_CURVE}
          fill="none"
          stroke="#7d0906"
          strokeWidth="1.6"
          opacity="0.72"
        />

        <path
          d={LOWER_INNER_CURVE}
          fill="none"
          stroke="#7d0906"
          strokeWidth="1.6"
          opacity="0.72"
        />

        <g filter="url(#redGlow)">
          <path
            d="M145 260 L78 260"
            stroke="#ff3a2d"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M975 260 L1042 260"
            stroke="#ff3a2d"
            strokeWidth="3"
            strokeLinecap="round"
          />

          <circle cx="145" cy="260" r="11" fill="#ff2a1e" opacity="0.45" />
          <circle cx="975" cy="260" r="11" fill="#ff2a1e" opacity="0.45" />

          <path
            d="M128 260 L145 248 L162 260 L145 272 Z"
            fill="#ff2a1e"
            opacity="0.92"
          />
          <path
            d="M992 260 L975 248 L958 260 L975 272 Z"
            fill="#ff2a1e"
            opacity="0.92"
          />

          <circle cx="145" cy="260" r="5" fill="#ffe1dc" />
          <circle cx="975" cy="260" r="5" fill="#ffe1dc" />
        </g>

        <g
          fill="none"
          stroke="#ff4a3a"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.9"
          filter="url(#redGlow)"
        >
          <path d="M470 170 A125 125 0 0 1 535 134" />
          <path d="M585 134 A125 125 0 0 1 650 170" />
          <path d="M650 350 A125 125 0 0 1 585 386" />
          <path d="M535 386 A125 125 0 0 1 470 350" />

          <path d="M435 215 A135 135 0 0 1 455 185" opacity="0.58" />
          <path d="M665 185 A135 135 0 0 1 685 215" opacity="0.58" />
          <path d="M685 305 A135 135 0 0 1 665 335" opacity="0.58" />
          <path d="M455 335 A135 135 0 0 1 435 305" opacity="0.58" />
        </g>

<g filter="url(#irisBloom)">
{/* soft iris glow behind the pupil */}
<circle
  cx="560"
  cy="260"
  r="112"
  fill="#ff1208"
  opacity="0.12"
/>

<circle
  cx="560"
  cy="260"
  r="76"
  fill="#ff2a1e"
  opacity="0.2"
/>

{/* simple rectangular pupil */}
<rect
x="536"
y="198"
width="48"
height="124"
rx="5"
fill="url(#pupilRectFill)"
/>

<rect
x="536"
y="198"
width="48"
height="124"
rx="5"
fill="none"
stroke="#ffd2c9"
strokeWidth="1.6"
opacity="0.72"
/>

<line
x1="560"
y1="206"
x2="560"
y2="314"
stroke="#ffe1dc"
strokeWidth="1"
opacity="0.46"
/>

{/* two defined Chernobog-style reactor rings around the pupil */}
<circle
cx="560"
cy="260"
r="92"
fill="none"
stroke="#ff4a1f"
strokeWidth="5"
opacity="0.98"
/>

<circle
cx="560"
cy="260"
r="122"
fill="none"
stroke="#ff5a24"
strokeWidth="5"
opacity="0.92"
/>
</g>

        <g filter="url(#redGlow)" opacity="0.95">
          <ellipse cx="395" cy="220" rx="10" ry="4" fill="#ffd4ce" />
          <ellipse cx="725" cy="220" rx="10" ry="4" fill="#ffd4ce" />
          <ellipse cx="420" cy="325" rx="8" ry="4" fill="#ff6b5d" />
          <ellipse cx="700" cy="325" rx="8" ry="4" fill="#ff6b5d" />

          <path
            d="M310 260 L330 248 L350 260 L330 272 Z"
            fill="#ff2a1e"
            opacity="0.42"
          />
          <path
            d="M810 260 L790 248 L770 260 L790 272 Z"
            fill="#ff2a1e"
            opacity="0.42"
          />
        </g>

        <g opacity="0.16">
          <line
            x1="560"
            y1="92"
            x2="560"
            y2="428"
            stroke="#ff2a1e"
            strokeWidth="1"
          />
          <line
            x1="190"
            y1="260"
            x2="930"
            y2="260"
            stroke="#ff2a1e"
            strokeWidth="1"
          />
        </g>
      </svg>
    </div>
  );
}