// lib/modules/minecraft-schematic/block-registry/blockVersionFinalizer9F.selftest.ts
// Optional local self-test helper for Milestone 9F.

import { runMilestone9FRegistryHardeningSelfTest } from "./blockVersionFinalizer9F";

for (const line of runMilestone9FRegistryHardeningSelfTest()) {
  console.log(line);
}
