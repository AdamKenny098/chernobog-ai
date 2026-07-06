import type { ReactNode } from "react";
import { ChernobogContextPanel } from "./ChernobogContextPanel";
import { ChernobogSidebar } from "./ChernobogSidebar";
import { ChernobogTopBar } from "./ChernobogTopBar";

export function ChernobogShell({ children, currentArea }: { children: ReactNode; currentArea: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #181824 0, #08080c 44%, #020203 100%)",
        color: "#f4f4f7",
        display: "grid",
        gridTemplateColumns: "260px minmax(0, 1fr) 320px",
      }}
    >
      <ChernobogSidebar />
      <div style={{ minWidth: 0 }}>
        <ChernobogTopBar currentArea={currentArea} />
        <main style={{ padding: "26px", maxWidth: "1180px" }}>{children}</main>
      </div>
      <ChernobogContextPanel />
    </div>
  );
}
