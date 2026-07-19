import type { SVGProps } from "react";

export type RadarIconName =
  | "bell"
  | "bookmark"
  | "check"
  | "chevron"
  | "close"
  | "eye"
  | "filter"
  | "gamepad"
  | "globe"
  | "hide"
  | "play"
  | "refresh"
  | "search"
  | "settings"
  | "signal"
  | "watch";

export function RadarIcon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: RadarIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      {name === "bell" && (
        <>
          <path {...common} d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path {...common} d="M10 21h4" />
        </>
      )}
      {name === "bookmark" && <path {...common} d="M6 3h12v18l-6-4-6 4z" />}
      {name === "check" && <path {...common} d="m5 12 4 4L19 6" />}
      {name === "chevron" && <path {...common} d="m9 18 6-6-6-6" />}
      {name === "close" && <path {...common} d="M6 6l12 12M18 6 6 18" />}
      {name === "eye" && (
        <>
          <path {...common} d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12" />
          <circle {...common} cx="12" cy="12" r="2.5" />
        </>
      )}
      {name === "filter" && <path {...common} d="M4 5h16M7 12h10M10 19h4" />}
      {name === "gamepad" && (
        <>
          <path {...common} d="M8 7h8a5 5 0 0 1 4.8 6.4l-1 3.4a2 2 0 0 1-3.3.9L14.7 16H9.3l-1.8 1.7a2 2 0 0 1-3.3-.9l-1-3.4A5 5 0 0 1 8 7Z" />
          <path {...common} d="M7 11v4M5 13h4" />
          <path {...common} d="M16.5 11.5h.01M18.5 13.5h.01" />
        </>
      )}
      {name === "globe" && (
        <>
          <circle {...common} cx="12" cy="12" r="9" />
          <path {...common} d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </>
      )}
      {name === "hide" && (
        <>
          <path {...common} d="M3 3l18 18" />
          <path {...common} d="M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.3A11.8 11.8 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.1 3.2M6.2 6.2C3.6 8.2 2 12 2 12s3.5 8 10 8a10.5 10.5 0 0 0 4.1-.8" />
        </>
      )}
      {name === "play" && <path {...common} d="m8 5 11 7-11 7z" />}
      {name === "refresh" && (
        <>
          <path {...common} d="M20 7v5h-5" />
          <path {...common} d="M4 17v-5h5" />
          <path {...common} d="M6.1 8A7 7 0 0 1 18 6l2 6M18 16a7 7 0 0 1-12 2l-2-6" />
        </>
      )}
      {name === "search" && (
        <>
          <circle {...common} cx="11" cy="11" r="7" />
          <path {...common} d="m20 20-4-4" />
        </>
      )}
      {name === "settings" && (
        <>
          <circle {...common} cx="12" cy="12" r="3" />
          <path {...common} d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.1v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </>
      )}
      {name === "signal" && (
        <>
          <path {...common} d="M5 16a10 10 0 0 1 14 0M8 13a6 6 0 0 1 8 0M11 10a2 2 0 0 1 2 0" />
          <circle cx="12" cy="18" r="1" fill="currentColor" />
        </>
      )}
      {name === "watch" && (
        <>
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="M12 7v5l3 2M9 2h6" />
        </>
      )}
    </svg>
  );
}
