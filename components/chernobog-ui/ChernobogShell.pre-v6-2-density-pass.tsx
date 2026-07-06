import type { ReactNode } from "react";
import { ChernobogContextPanel } from "./ChernobogContextPanel";
import { ChernobogSidebar } from "./ChernobogSidebar";
import { ChernobogTopBar } from "./ChernobogTopBar";

export function ChernobogShell({
  children,
  currentArea,
}: {
  children: ReactNode;
  currentArea?: string;
}) {
  return (
    <div className="min-h-screen bg-[#020202] text-[#f3d9ae]">
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)_260px]">
        <div className="hidden xl:block">
          <ChernobogSidebar />
        </div>
        <div className="min-w-0 border-x border-[#2d1a0c]/80 bg-[#050403]">
          <ChernobogTopBar currentArea={currentArea} />
          <div className="p-4">{children}</div>
        </div>
        <ChernobogContextPanel />
      </div>
    </div>
  );
}
