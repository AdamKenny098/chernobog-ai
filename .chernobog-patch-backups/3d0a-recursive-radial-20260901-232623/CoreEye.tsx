"use client";

type CoreEyeProps = {
  title?: string;
  subtitle?: string;
  statusLabel?: string;
  body?: string;
};

function Dot({
  size = 8,
  opacity = 1,
}: {
  size?: number;
  opacity?: number;
}) {
  return (
    <span
      className="rounded-full bg-[rgba(255,176,88,1)]"
      style={{
        width: size,
        height: size,
        opacity,
        boxShadow:
          "0 0 10px rgba(255,168,88,0.34), 0 0 22px rgba(255,120,35,0.12)",
      }}
    />
  );
}

function TriDots({
  positionClass,
}: {
  positionClass: string;
}) {
  return (
    <div
      className={`absolute left-1/2 ${positionClass} z-30 flex -translate-x-1/2 items-center gap-3`}
    >
      <Dot size={7} opacity={0.82} />
      <Dot size={8} opacity={1} />
      <Dot size={7} opacity={0.82} />
    </div>
  );
}

function CornerFrame() {
    return (
      <div className="pointer-events-none absolute inset-0">
        {/* Main inset frame */}
        <div className="absolute inset-[18px] rounded-[8px] border border-[rgba(255,140,56,0.06)]" />
  
        {/* Hard clipped corners */}
        <div className="absolute left-2 top-2 h-10 w-10 border-l border-t border-[rgba(255,155,72,0.16)]" />
        <div className="absolute right-2 top-2 h-10 w-10 border-r border-t border-[rgba(255,155,72,0.16)]" />
        <div className="absolute bottom-2 left-2 h-10 w-10 border-b border-l border-[rgba(255,155,72,0.16)]" />
        <div className="absolute bottom-2 right-2 h-10 w-10 border-b border-r border-[rgba(255,155,72,0.16)]" />
  
        {/* Extra angled corner cuts */}
        <div className="absolute left-0 top-0 h-8 w-20 border-t border-[rgba(255,130,45,0.08)] [clip-path:polygon(0_0,100%_0,80%_100%,0_100%)]" />
        <div className="absolute right-0 top-0 h-8 w-20 border-t border-[rgba(255,130,45,0.08)] [clip-path:polygon(20%_100%,100%_100%,100%_0,0_0)]" />
        <div className="absolute left-0 bottom-0 h-8 w-20 border-b border-[rgba(255,130,45,0.08)] [clip-path:polygon(0_0,80%_0,100%_100%,0_100%)]" />
        <div className="absolute right-0 bottom-0 h-8 w-20 border-b border-[rgba(255,130,45,0.08)] [clip-path:polygon(0_100%,100%_100%,100%_0,20%_0)]" />
  
        {/* Long upper and lower segmented rails */}
        <div className="absolute left-[7%] top-[6%] h-px w-[28%] bg-[linear-gradient(90deg,rgba(255,140,56,0.14),rgba(255,140,56,0.03))]" />
        <div className="absolute right-[7%] top-[6%] h-px w-[28%] bg-[linear-gradient(90deg,rgba(255,140,56,0.03),rgba(255,140,56,0.14))]" />
        <div className="absolute left-[7%] bottom-[6%] h-px w-[26%] bg-[linear-gradient(90deg,rgba(255,140,56,0.12),rgba(255,140,56,0.02))]" />
        <div className="absolute right-[7%] bottom-[6%] h-px w-[26%] bg-[linear-gradient(90deg,rgba(255,140,56,0.02),rgba(255,140,56,0.12))]" />
  
        {/* Side lock rails */}
        <div className="absolute left-[4.5%] top-[21%] h-px w-[13%] bg-[linear-gradient(90deg,rgba(255,150,68,0.18),transparent)]" />
        <div className="absolute right-[4.5%] top-[21%] h-px w-[13%] bg-[linear-gradient(90deg,transparent,rgba(255,150,68,0.18))]" />
        <div className="absolute left-[4.5%] top-1/2 h-px w-[16%] -translate-y-1/2 bg-[linear-gradient(90deg,rgba(255,150,68,0.2),transparent)]" />
        <div className="absolute right-[4.5%] top-1/2 h-px w-[16%] -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,150,68,0.2))]" />
        <div className="absolute left-[4.5%] bottom-[17%] h-px w-[12%] bg-[linear-gradient(90deg,rgba(255,150,68,0.14),transparent)]" />
        <div className="absolute right-[4.5%] bottom-[17%] h-px w-[12%] bg-[linear-gradient(90deg,transparent,rgba(255,150,68,0.14))]" />
  
        {/* Tiny red markers */}
        <div className="absolute left-[8%] top-[17%] h-[3px] w-[3px] rounded-full bg-[rgba(210,52,32,0.9)] shadow-[0_0_8px_rgba(210,52,32,0.45)]" />
        <div className="absolute right-[8%] top-[17%] h-[3px] w-[3px] rounded-full bg-[rgba(210,52,32,0.9)] shadow-[0_0_8px_rgba(210,52,32,0.45)]" />
        <div className="absolute left-[9%] bottom-[22%] h-[2px] w-[2px] rounded-full bg-[rgba(210,52,32,0.9)] shadow-[0_0_8px_rgba(210,52,32,0.45)]" />
        <div className="absolute right-[9%] bottom-[22%] h-[2px] w-[2px] rounded-full bg-[rgba(210,52,32,0.9)] shadow-[0_0_8px_rgba(210,52,32,0.45)]" />
        
        {/* Left system tick column */}
        <div className="absolute left-[6px] top-[18%] flex flex-col gap-3 opacity-35">
            {Array.from({ length: 11 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
                <div className="h-[2px] w-[2px] rounded-full bg-[rgba(255,150,68,0.45)]" />
                <div className="h-px w-3 bg-[rgba(255,150,68,0.12)]" />
            </div>
            ))}
        </div>

        {/* Left lower system tick column */}
        <div className="absolute left-[6px] bottom-[18%] flex flex-col gap-3 opacity-35">
            {Array.from({ length: 11 }).map((_, i) => (
            <div key={`b-${i}`} className="flex items-center gap-2">
                <div className="h-[2px] w-[2px] rounded-full bg-[rgba(255,150,68,0.45)]" />
                <div className="h-px w-3 bg-[rgba(255,150,68,0.12)]" />
            </div>
            ))}
        </div>

      </div>
    );
  }

function CoreEyeSvg() {
  const radialTicks = Array.from({ length: 48 }).map((_, i) => {
    const angle = (i * 360) / 48;
    const r1 = i % 4 === 0 ? 82 : 86;
    const r2 = i % 4 === 0 ? 95 : 90;
    const rad = (angle * Math.PI) / 180;

    const x1 = 500 + Math.cos(rad) * r1;
    const y1 = 260 + Math.sin(rad) * r1;
    const x2 = 500 + Math.cos(rad) * r2;
    const y2 = 260 + Math.sin(rad) * r2;

    return (
      <line
        key={`tick-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(255, 174, 120, 0.9)"
        strokeWidth={i % 4 === 0 ? 1 : 0.55}
        strokeLinecap="round"
      />
    );
  });

  const fineRays = Array.from({ length: 24 }).map((_, i) => {
    const angle = (i * 360) / 24;
    const rad = (angle * Math.PI) / 180;

    const x1 = 500 + Math.cos(rad) * 102;
    const y1 = 260 + Math.sin(rad) * 102;
    const x2 = 500 + Math.cos(rad) * 170;
    const y2 = 260 + Math.sin(rad) * 170;

    return (
      <line
        key={`ray-${i}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="rgba(255,150,68,0.12)"
        strokeWidth={0.8}
        strokeLinecap="round"
      />
    );
  });

  return (
    <svg
      viewBox="0 0 1000 520"
      className="h-full w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="panelGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb66e" stopOpacity="0.06" />
          <stop offset="34%" stopColor="#ff9c45" stopOpacity="0.025" />
          <stop offset="70%" stopColor="#ff9c45" stopOpacity="0.008" />
          <stop offset="100%" stopColor="#ff9c45" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="irisSoft" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff1df" stopOpacity="1" />
          <stop offset="18%" stopColor="#ffcf8f" stopOpacity="0.92" />
          <stop offset="42%" stopColor="#ff9f45" stopOpacity="0.48" />
          <stop offset="72%" stopColor="#ff7a1f" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ff7a1f" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="irisDisc" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe1b8" stopOpacity="0.92" />
            <stop offset="30%" stopColor="#ffbf78" stopOpacity="0.9" />
            <stop offset="62%" stopColor="#ff9f45" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#ff7f26" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="centerLine" x1="80" y1="260" x2="920" y2="260">
          <stop offset="0%" stopColor="#ffab61" stopOpacity="0" />
          <stop offset="18%" stopColor="#ffab61" stopOpacity="0.06" />
          <stop offset="50%" stopColor="#fff0da" stopOpacity="0.72" />
          <stop offset="82%" stopColor="#ffab61" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffab61" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="verticalLine" x1="500" y1="60" x2="500" y2="460">
          <stop offset="0%" stopColor="#ffab61" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffcd96" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#ffab61" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="pupilGlow" x1="500" y1="158" x2="500" y2="362">
          <stop offset="0%" stopColor="#ff7f2a" stopOpacity="0" />
          <stop offset="18%" stopColor="#ffb86f" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#fff9f0" stopOpacity="1" />
          <stop offset="82%" stopColor="#ffb86f" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ff7f2a" stopOpacity="0" />
        </linearGradient>

        <linearGradient id="pupilCore" x1="500" y1="190" x2="500" y2="330">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="50%" stopColor="#fffdf8" stopOpacity="1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.04" />
        </linearGradient>

        <filter id="irisBlur" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5.2" />
        </filter>

        <filter id="pupilBlur" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4.2" />
        </filter>

        <filter id="microGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2" />
        </filter>

        <clipPath id="eyeClip">
          <path d="M210 260 Q500 102 790 260 Q500 418 210 260 Z" />
        </clipPath>
      </defs>

      <rect x="0" y="0" width="1000" height="520" fill="url(#panelGlow)" />

      <g opacity="0.11">
        <circle cx="500" cy="260" r="236" stroke="rgba(255,158,78,0.06)" strokeWidth="1" />
        <circle cx="500" cy="260" r="210" stroke="rgba(255,158,78,0.05)" strokeWidth="1" />
        <circle cx="500" cy="260" r="184" stroke="rgba(255,158,78,0.045)" strokeWidth="1" />
        <circle cx="500" cy="260" r="47" stroke="rgba(255,220,170,0.16)" strokeWidth="1" />
      </g>

      <g opacity="0.08">
        <path d="M500 26 V494" stroke="url(#verticalLine)" strokeWidth="1" />
        <path d="M56 260 H944" stroke="url(#centerLine)" strokeWidth="1.1" />
        <path d="M360 120 L640 400" stroke="rgba(255,160,82,0.05)" strokeWidth="1" />
        <path d="M640 120 L360 400" stroke="rgba(255,160,82,0.05)" strokeWidth="1" />
      </g>

      <g opacity="0.22">
        <circle cx="500" cy="260" r="166" stroke="rgba(255,154,64,0.11)" strokeWidth="1" />
        <circle cx="500" cy="260" r="144" stroke="rgba(255,154,64,0.1)" strokeWidth="1" />
        <circle cx="500" cy="260" r="122" stroke="rgba(255,154,64,0.08)" strokeWidth="1" />
      </g>

      <g opacity="0.22">{fineRays}</g>

      {/* Weapon scaffold layer */}
      <g opacity="0.22">
        {/* Side rails */}
        <path d="M86 260 H232" stroke="rgba(255,150,64,0.2)" strokeWidth="1" />
        <path d="M768 260 H914" stroke="rgba(255,150,64,0.2)" strokeWidth="1" />

        {/* Upper support rails */}
        <path d="M168 136 H350" stroke="rgba(255,150,64,0.08)" strokeWidth="1" />
        <path d="M650 136 H832" stroke="rgba(255,150,64,0.08)" strokeWidth="1" />

        {/* Lower support rails */}
        <path d="M176 384 H346" stroke="rgba(255,150,64,0.07)" strokeWidth="1" />
        <path d="M654 384 H824" stroke="rgba(255,150,64,0.07)" strokeWidth="1" />

        {/* Side brackets */}
        <path d="M188 222 L158 260 L188 298" stroke="rgba(255,168,84,0.2)" strokeWidth="1" />
        <path d="M812 222 L842 260 L812 298" stroke="rgba(255,168,84,0.2)" strokeWidth="1" />

        {/* Weapon diagonals */}
        <path d="M250 182 L388 236" stroke="rgba(255,136,50,0.12)" strokeWidth="1" />
        <path d="M750 182 L612 236" stroke="rgba(255,136,50,0.12)" strokeWidth="1" />
        <path d="M250 338 L388 284" stroke="rgba(255,136,50,0.12)" strokeWidth="1" />
        <path d="M750 338 L612 284" stroke="rgba(255,136,50,0.12)" strokeWidth="1" />

        {/* Arc fragments */}
        <path d="M390 150 A125 125 0 0 1 610 150" stroke="rgba(255,174,92,0.12)" strokeWidth="1" fill="none" />
        <path d="M390 370 A125 125 0 0 0 610 370" stroke="rgba(255,174,92,0.12)" strokeWidth="1" fill="none" />

        {/* Vertical guide extensions */}
        <path d="M500 88 V146" stroke="rgba(255,162,76,0.11)" strokeWidth="1" />
        <path d="M500 374 V432" stroke="rgba(255,162,76,0.11)" strokeWidth="1" />
      </g>

      <g opacity="0.22">
        <path d="M92 260 H224" stroke="rgba(255,145,58,0.16)" strokeWidth="1" />
        <path d="M776 260 H908" stroke="rgba(255,145,58,0.16)" strokeWidth="1" />

        <path d="M160 122 H362" stroke="rgba(255,145,58,0.08)" strokeWidth="1" />
        <path d="M638 122 H840" stroke="rgba(255,145,58,0.08)" strokeWidth="1" />

        <path d="M172 398 H344" stroke="rgba(255,145,58,0.07)" strokeWidth="1" />
        <path d="M656 398 H828" stroke="rgba(255,145,58,0.07)" strokeWidth="1" />

        <path d="M186 224 L154 260 L186 296" stroke="rgba(255,156,72,0.14)" strokeWidth="1" />
        <path d="M814 224 L846 260 L814 296" stroke="rgba(255,156,72,0.14)" strokeWidth="1" />

        <path d="M244 176 L384 232" stroke="rgba(255,140,56,0.09)" strokeWidth="1" />
        <path d="M756 176 L616 232" stroke="rgba(255,140,56,0.09)" strokeWidth="1" />
        <path d="M244 344 L384 288" stroke="rgba(255,140,56,0.09)" strokeWidth="1" />
        <path d="M756 344 L616 288" stroke="rgba(255,140,56,0.09)" strokeWidth="1" />

        <path d="M410 182 l18 10" stroke="rgba(255,176,98,0.18)" strokeWidth="1" />
        <path d="M590 182 l-18 10" stroke="rgba(255,176,98,0.18)" strokeWidth="1" />
        <path d="M410 338 l18 -10" stroke="rgba(255,176,98,0.18)" strokeWidth="1" />
        <path d="M590 338 l-18 -10" stroke="rgba(255,176,98,0.18)" strokeWidth="1" />

        <path d="M500 96 V144" stroke="rgba(255,162,76,0.12)" strokeWidth="1" />
        <path d="M500 376 V424" stroke="rgba(255,162,76,0.12)" strokeWidth="1" />
      </g>

      <g opacity="0.9">

      <path
          d="M126 260 L274 190 L500 154 L726 190 L874 260 L726 330 L500 366 L274 330 Z"
          stroke="rgba(255,126,40,0.07)"
          strokeWidth="1"
        />
        <path
          d="M356 260 Q500 188 644 260 Q500 332 356 260 Z"
          stroke="rgba(255,188,116,0.16)"
          strokeWidth="0.9"
        />

        <path
          d="M148 260 L286 196 L500 164 L714 196 L852 260 L714 324 L500 356 L286 324 Z"
          stroke="rgba(255,144,52,0.14)"
          strokeWidth="1"
        />
        <path
          d="M170 260 L300 201 L500 170 L700 201 L830 260 L700 319 L500 350 L300 319 Z"
          stroke="rgba(255,162,72,0.22)"
          strokeWidth="1.05"
        />
        <path
          d="M210 260 Q500 102 790 260 Q500 418 210 260 Z"
          stroke="rgba(255,190,120,0.6)"
          strokeWidth="1.35"
        />
        <path
          d="M244 260 Q500 124 756 260 Q500 396 244 260 Z"
          stroke="rgba(255,174,92,0.2)"
          strokeWidth="1"
        />
        <path
          d="M280 260 Q500 145 720 260 Q500 375 280 260 Z"
          stroke="rgba(255,190,120,0.32)"
          strokeWidth="1.08"
        />
        <path
          d="M328 260 Q500 173 672 260 Q500 347 328 260 Z"
          stroke="rgba(255,190,120,0.18)"
          strokeWidth="0.95"
        />
      </g>

      
      <g opacity="0.24" clipPath="url(#eyeClip)">
        <circle cx="500" cy="260" r="112" stroke="rgba(255,170,90,0.08)" strokeWidth="1" />
        <circle cx="500" cy="260" r="98" stroke="rgba(255,170,90,0.09)" strokeWidth="1" />
        <circle cx="500" cy="260" r="84" stroke="rgba(255,170,90,0.1)" strokeWidth="1" />
        <circle cx="500" cy="260" r="70" stroke="rgba(255,188,118,0.14)" strokeWidth="1.15" />
      </g>

      <g opacity="0.58">
        <path d="M250 260 H750" stroke="rgba(255,184,112,0.18)" strokeWidth="1" />
        <path d="M500 118 V402" stroke="rgba(255,184,112,0.14)" strokeWidth="1" />
        <path d="M334 191 L392 224" stroke="rgba(255,184,112,0.18)" strokeWidth="1" />
        <path d="M666 191 L608 224" stroke="rgba(255,184,112,0.18)" strokeWidth="1" />
        <path d="M334 329 L392 296" stroke="rgba(255,184,112,0.18)" strokeWidth="1" />
        <path d="M666 329 L608 296" stroke="rgba(255,184,112,0.18)" strokeWidth="1" />
        
      </g>

      <g opacity="0.38">
        {radialTicks}
      </g>

      <g opacity="0.18">
        <path d="M448 260 h6" stroke="rgba(255,196,124,0.22)" strokeWidth="1" />
        <path d="M546 260 h6" stroke="rgba(255,196,124,0.22)" strokeWidth="1" />
        <path d="M500 208 v6" stroke="rgba(255,196,124,0.22)" strokeWidth="1" />
        <path d="M500 306 v6" stroke="rgba(255,196,124,0.22)" strokeWidth="1" />
      </g>

      <g opacity="0.22">
        <path d="M458 186 A82 82 0 0 1 542 186" stroke="rgba(255,186,114,0.12)" strokeWidth="1" fill="none" />
        <path d="M458 334 A82 82 0 0 0 542 334" stroke="rgba(255,186,114,0.12)" strokeWidth="1" fill="none" />
      </g>

      <g opacity="0.82">
        <circle cx="500" cy="260" r="110" stroke="rgba(255,146,50,0.08)" strokeWidth="0.9" />
        <circle cx="500" cy="260" r="104" stroke="rgba(255,146,50,0.12)" strokeWidth="1" />
        <circle cx="500" cy="260" r="92" stroke="rgba(255,190,120,0.28)" strokeWidth="1.2" />
        <circle cx="500" cy="260" r="84" stroke="rgba(255,146,50,0.12)" strokeWidth="0.9" />
        <circle cx="500" cy="260" r="76" stroke="rgba(255,190,120,0.44)" strokeWidth="1.4" />
        <circle cx="500" cy="260" r="68" stroke="rgba(255,146,50,0.14)" strokeWidth="0.9" />
        <circle cx="500" cy="260" r="61" stroke="rgba(255,190,120,0.22)" strokeWidth="1" />
        <circle cx="500" cy="260" r="54" stroke="rgba(255,196,124,0.18)" strokeWidth="0.85" />
      </g>

      {/* Outer energy aura */}
      <g opacity="0.5">
        <path
          d="M500 194 L530 260 L500 326 L470 260 Z"
          fill="url(#irisSoft)"
          filter="url(#irisBlur)"
        />
      </g>

      {/* Pronounced inner iris */}
      <g opacity="1">
        <path
          d="M500 206 L519 260 L500 314 L481 260 Z"
          fill="url(#irisDisc)"
          stroke="rgba(255,210,150,0.32)"
          strokeWidth="0.8"
        />
      </g>

      {/* Tight outer blade bloom */}
      <g opacity="0.9">
        <path
          d="M500 154 L512 260 L500 366 L488 260 Z"
          fill="url(#pupilGlow)"
          filter="url(#pupilBlur)"
        />
      </g>

      {/* Main blade */}
      <g opacity="1">
        <path
          d="M500 170 L505.5 260 L500 350 L494.5 260 Z"
          fill="url(#pupilGlow)"
        />
      </g>

      {/* White-hot inner spine */}
      <g opacity="1">
        <path
          d="M500 198 L502 260 L500 322 L498 260 Z"
          fill="url(#pupilCore)"
        />
        <path
          d="M500 184 V336"
          stroke="rgba(255,252,246,0.72)"
          strokeWidth="0.75"
          strokeLinecap="round"
        />
      </g>

      <g opacity="0.55">
        <line x1="500" y1="114" x2="500" y2="125" stroke="rgba(255,190,120,0.85)" strokeWidth="1" />
        <line x1="500" y1="395" x2="500" y2="406" stroke="rgba(255,190,120,0.85)" strokeWidth="1" />
        <line x1="354" y1="260" x2="365" y2="260" stroke="rgba(255,190,120,0.85)" strokeWidth="1" />
        <line x1="635" y1="260" x2="646" y2="260" stroke="rgba(255,190,120,0.85)" strokeWidth="1" />

        <circle cx="500" cy="114" r="1.8" fill="rgba(255,184,112,0.85)" />
        <circle cx="500" cy="406" r="1.8" fill="rgba(255,184,112,0.85)" />
        <circle cx="354" cy="260" r="1.8" fill="rgba(255,184,112,0.85)" />
        <circle cx="646" cy="260" r="1.8" fill="rgba(255,184,112,0.85)" />
      </g>

      <g opacity="0.42">
        <circle cx="300" cy="260" r="1.5" fill="rgba(220,70,40,0.9)" />
        <circle cx="700" cy="260" r="1.5" fill="rgba(220,70,40,0.9)" />
        <circle cx="500" cy="106" r="1.5" fill="rgba(220,70,40,0.9)" />
        <circle cx="500" cy="414" r="1.5" fill="rgba(220,70,40,0.9)" />
      </g>

      <g opacity="0.16">
        <path d="M96 260 H160" stroke="rgba(255,160,82,0.2)" strokeWidth="1" />
        <path d="M840 260 H904" stroke="rgba(255,160,82,0.2)" strokeWidth="1" />
        <path d="M500 44 V82" stroke="rgba(255,160,82,0.12)" strokeWidth="1" />
        <path d="M500 438 V476" stroke="rgba(255,160,82,0.12)" strokeWidth="1" />
      </g>

      <g opacity="0.12">
        <path d="M260 175 l10 0" stroke="rgba(255,170,90,0.7)" strokeWidth="1" />
        <path d="M730 175 l10 0" stroke="rgba(255,170,90,0.7)" strokeWidth="1" />
        <path d="M260 345 l10 0" stroke="rgba(255,170,90,0.7)" strokeWidth="1" />
        <path d="M730 345 l10 0" stroke="rgba(255,170,90,0.7)" strokeWidth="1" />

        <path d="M244 189 l8 -4" stroke="rgba(255,170,90,0.58)" strokeWidth="1" />
        <path d="M748 185 l8 4" stroke="rgba(255,170,90,0.58)" strokeWidth="1" />
        <path d="M244 331 l8 4" stroke="rgba(255,170,90,0.58)" strokeWidth="1" />
        <path d="M748 335 l8 -4" stroke="rgba(255,170,90,0.58)" strokeWidth="1" />
      </g>
    </svg>
  );
}

export default function CoreEye({
  title = "CHERNOBOG SIGIL STATE",
  subtitle = "CORE EMBLEM",
  statusLabel = "OPTIC CORE: SYNCHRONIZED",
  body = "The center display now uses the actual symbolic language you pointed out: the eye-shaped frame, the circular iris, the vertical pupil, and the three-dot rows above and below. That reads much closer to the Chernobog identity than the earlier generic combat-frame silhouette.",
}: CoreEyeProps) {
  return (
    <section className="relative min-h-[720px] overflow-hidden rounded-[4px] border border-[rgba(255,150,70,0.08)] bg-[radial-gradient(circle_at_center,rgba(16,20,28,0.96)_0%,rgba(7,10,15,0.985)_60%,rgba(4,6,10,1)_100%)] px-4 pb-10 pt-8 shadow-[inset_0_0_80px_rgba(255,120,35,0.02),0_0_80px_rgba(0,0,0,0.35)] [clip-path:polygon(0_0,98.9%_0,100%_1.7%,100%_98.3%,98.9%_100%,1.1%_100%,0_98.3%,0_1.7%)] md:px-6 md:pb-12 md:pt-10">
      <CornerFrame />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,145,55,0.05)_0%,rgba(255,145,55,0.012)_28%,transparent_68%)]" />
        <div className="absolute inset-0 opacity-[0.022] [background-image:linear-gradient(rgba(255,180,100,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,180,100,0.14)_1px,transparent_1px)] [background-size:82px_82px]" />

        <div className="absolute left-[7%] right-[7%] top-[8.5%] h-px bg-[linear-gradient(90deg,transparent,rgba(255,170,90,0.08),transparent)]" />
        <div className="absolute left-[10%] right-[10%] bottom-[13%] h-px bg-[linear-gradient(90deg,transparent,rgba(255,170,90,0.06),transparent)]" />

        <div className="absolute left-[7%] top-1/2 h-px w-[19%] -translate-y-1/2 bg-[linear-gradient(90deg,rgba(255,170,90,0.08),transparent)]" />
        <div className="absolute right-[7%] top-1/2 h-px w-[19%] -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,170,90,0.08))]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="mb-7 inline-flex items-center gap-3 text-[10px] uppercase tracking-[0.42em] text-[rgba(181,129,83,0.55)]">
          <span className="h-px w-10 bg-[linear-gradient(90deg,transparent,rgba(255,170,90,0.28))]" />
          <span>{subtitle}</span>
          <span className="h-px w-10 bg-[linear-gradient(90deg,rgba(255,170,90,0.28),transparent)]" />
        </div>

        <div className="relative flex h-[500px] w-full max-w-[1100px] items-center justify-center md:h-[550px]">
          <div className="absolute left-1/2 top-[13.6%] z-20 h-16 w-20 -translate-x-1/2">
            <div className="absolute left-1/2 top-0 h-8 w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,rgba(255,160,72,0),rgba(255,160,72,0.2),rgba(255,160,72,0))]" />
            <div className="absolute left-[18%] top-5 h-px w-[22%] bg-[linear-gradient(90deg,rgba(255,160,72,0.14),transparent)]" />
            <div className="absolute right-[18%] top-5 h-px w-[22%] bg-[linear-gradient(90deg,transparent,rgba(255,160,72,0.14))]" />
          </div>

          <TriDots positionClass="top-[16%]" />

          <div className="absolute inset-0">
            <CoreEyeSvg />
          </div>

          <div className="absolute left-1/2 bottom-[13.6%] z-20 h-16 w-20 -translate-x-1/2">
            <div className="absolute bottom-0 left-1/2 h-8 w-px -translate-x-1/2 bg-[linear-gradient(to_top,rgba(255,160,72,0),rgba(255,160,72,0.2),rgba(255,160,72,0))]" />
            <div className="absolute left-[18%] bottom-5 h-px w-[22%] bg-[linear-gradient(90deg,rgba(255,160,72,0.14),transparent)]" />
            <div className="absolute right-[18%] bottom-5 h-px w-[22%] bg-[linear-gradient(90deg,transparent,rgba(255,160,72,0.14))]" />
          </div>

          <TriDots positionClass="bottom-[16%]" />
        </div>

        <div className="mt-0 flex flex-col items-center">
          <div className="mb-4 text-[10px] uppercase tracking-[0.38em] text-[rgba(181,129,83,0.58)]">
            {statusLabel}
          </div>

          <h2 className="max-w-[920px] text-center text-[18px] font-medium uppercase tracking-[0.46em] text-[rgba(230,184,126,0.92)] md:text-[24px]">
            {title}
          </h2>

          <p className="mt-5 max-w-[730px] text-balance text-center text-[12px] leading-7 text-[rgba(198,188,173,0.58)] md:text-[14px]">
            {body}
          </p>
        </div>
      </div>
    </section>
  );
}