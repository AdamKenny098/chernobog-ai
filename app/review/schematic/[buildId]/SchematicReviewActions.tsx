"use client";

import { useMemo, useState } from "react";

type FileAction = {
  kind: "schem" | "metadata" | "debug" | "vault-note";
  label: string;
  exists: boolean;
  relativePath: string;
  sizeBytes: number;
};

type Props = {
  buildId: string;
  reviewRoute: string;
  outputFolderPath: string;
  files: FileAction[];
};

const buttonStyle = {
  appearance: "none",
  border: "1px solid #334155",
  borderRadius: 10,
  background: "#111827",
  color: "#d8dee9",
  padding: "9px 12px",
  cursor: "pointer",
  textDecoration: "none",
  fontSize: 14,
} as const;

const mutedStyle = {
  color: "#94a3b8",
} as const;

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function SchematicReviewActions({ buildId, reviewRoute, outputFolderPath, files }: Props) {
  const [message, setMessage] = useState<string>("");
  const absoluteReviewUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return reviewRoute;
    }

    return `${window.location.origin}${reviewRoute}`;
  }, [reviewRoute]);

  async function handleCopy(label: string, value: string) {
    const ok = await copyText(value);
    setMessage(ok ? `Copied ${label}.` : `Could not copy ${label}. Copy it manually from the page.`);
  }

  async function handleOpenFolder() {
    setMessage("Opening output folder...");

    try {
      const response = await fetch(`/api/minecraft-schematic/open-folder/${encodeURIComponent(buildId)}`, {
        method: "POST",
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string; folder?: string };
      setMessage(payload.message ?? (payload.ok ? "Open folder requested." : "Could not open folder."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not open output folder.");
    }
  }

  return (
    <section style={{ border: "1px solid #2b3340", borderRadius: 14, padding: 18, background: "#0f151d" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 20 }}>Review Actions</h2>
          <p style={{ ...mutedStyle, marginTop: 0 }}>Download generated files, copy identifiers, or open the export folder.</p>
        </div>
        <button type="button" onClick={handleOpenFolder} style={buttonStyle}>
          Open output folder
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <button type="button" onClick={() => handleCopy("build id", buildId)} style={buttonStyle}>
          Copy build ID
        </button>
        <button type="button" onClick={() => handleCopy("review route", reviewRoute)} style={buttonStyle}>
          Copy review route
        </button>
        <button type="button" onClick={() => handleCopy("review URL", absoluteReviewUrl)} style={buttonStyle}>
          Copy review URL
        </button>
        <button type="button" onClick={() => handleCopy("output folder path", outputFolderPath)} style={buttonStyle}>
          Copy folder path
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
        {files.map((file) => {
          const href = `/api/minecraft-schematic/file/${encodeURIComponent(buildId)}/${encodeURIComponent(file.kind)}`;

          return (
            <div key={file.kind} style={{ border: "1px solid #253044", borderRadius: 10, padding: 12, background: "#0b1118" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <strong>{file.label}</strong>
                <span style={{ color: file.exists ? "#8ee0b6" : "#fca5a5", fontSize: 12 }}>{file.exists ? "FOUND" : "MISSING"}</span>
              </div>
              <code style={{ display: "block", marginTop: 8, overflowWrap: "anywhere", color: "#cbd5e1" }}>{file.relativePath}</code>
              <div style={{ ...mutedStyle, marginTop: 6 }}>{formatBytes(file.sizeBytes)}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <a href={href} style={{ ...buttonStyle, pointerEvents: file.exists ? "auto" : "none", opacity: file.exists ? 1 : 0.45 }}>
                  Download
                </a>
                <button type="button" onClick={() => handleCopy(`${file.label} path`, file.relativePath)} style={buttonStyle}>
                  Copy path
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {message ? <p style={{ ...mutedStyle, marginBottom: 0 }}>{message}</p> : null}
    </section>
  );
}
