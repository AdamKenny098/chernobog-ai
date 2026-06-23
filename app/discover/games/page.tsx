import type { Metadata } from "next";

import { AdultGameRadarGate } from "@/components/discovery/games/AdultGameRadarGate";

export const metadata: Metadata = {
  title: "Adult Game Radar | Chernobog",
  description: "Private local discovery and update monitoring for adult itch.io games.",
};

export const dynamic = "force-dynamic";

export default function GameRadarPage() {
  return <AdultGameRadarGate />;
}
