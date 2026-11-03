import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  createPersonalAssistanceReadAuthority,
} from "../packages/personal-assistance/src/readAuthority";
import type {
  PersonalAttentionSnapshot,
} from "../packages/personal-assistance/src/types";
import type {
  PersonalAssistanceProfile,
} from "../packages/personal-assistance/src/profileTypes";
import type {
  Responsibility,
  ResponsibilityListFilter,
} from "../packages/personal-assistance/src/responsibilities/types";
import type {
  WorkScheduleStatus,
} from "../packages/personal-assistance/src/workSchedule/types";

const root = process.cwd();
function source(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8");
}
function check(condition: unknown, description: string): void {
  assert.ok(condition, description);
  console.log(`PASS ${description}`);
}

async function main() {
  const attention = {
    state: "do-not-disturb",
    revision: 8,
  } as PersonalAttentionSnapshot;
  const profile = {
    profileId: "primary",
    interruptionPreference: "critical-only",
  } as PersonalAssistanceProfile;
  const responsibilities = [{
    id: "test-id",
    state: "waiting-user",
  }] as Responsibility[];
  const schedule = {
    source: "alkimii",
    isStale: false,
  } as WorkScheduleStatus;
  const calls: string[] = [];
  let forwardedFilter: ResponsibilityListFilter | undefined;
  const read = createPersonalAssistanceReadAuthority({
    getAttention: () => { calls.push("attention"); return attention; },
    getProfile: () => { calls.push("profile"); return profile; },
    listResponsibilities: async (filter) => {
      calls.push("responsibilities");
      forwardedFilter = filter;
      return responsibilities;
    },
    getWorkSchedule: async () => {
      calls.push("work-schedule");
      return schedule;
    },
  });

  check(Object.isFrozen(read), "read authority method surface is frozen");
  check(Object.keys(read).sort().join("|") ===
    "getAttention|getProfile|getWorkSchedule|listResponsibilities",
  "read authority exposes only four explicit read operations");
  check(read.getAttention() === attention, "attention delegates to injected owner");
  check(read.getProfile() === profile, "profile delegates to injected owner");
  const filter: ResponsibilityListFilter = {
    includeClosed: true,
    states: ["waiting-user"],
  };
  check((await read.listResponsibilities(filter)) === responsibilities &&
    forwardedFilter === filter,
  "responsibility filters forward unchanged to canonical ledger");
  check((await read.getWorkSchedule()) === schedule,
  "Alkimii work schedule delegates to existing owner");
  check(calls.join("|") === "attention|profile|responsibilities|work-schedule",
  "read authority makes no speculative or background calls");
  const failed = createPersonalAssistanceReadAuthority({
    getAttention: () => attention,
    getProfile: () => profile,
    listResponsibilities: async () => { throw new Error("owner unavailable"); },
    getWorkSchedule: async () => schedule,
  });
  await assert.rejects(() => failed.listResponsibilities(), /owner unavailable/);
  check(true, "read failures are propagated, not suppressed or treated as empty data");

  const pure = source("packages/personal-assistance/src/readAuthority.ts");
  const live = source("packages/personal-assistance/src/liveReadAuthority.ts");
  const entry = source("packages/personal-assistance/src/index.ts");
  const contract = source("packages/contracts/src/personal-assistance.ts");
  const cognition = source("app/api/cognition/route.ts");
  const core = source("lib/chernobog/cognition/runtimeSingleton.ts");
  check(!/\b(?:writeFile|appendFile|new Database|scheduleJob|grantPermission|executeTool)\b/u.test(pure + live),
    "read port introduces no persistence, scheduler or execution authority");
  for (const reference of [
    "./attentionStore", "./profileStore", "./responsibilities/store", "./workSchedule/service",
    "getPersonalAttentionSnapshot()", "getPersonalAssistanceProfile()",
    "getResponsibilityLedger().list(filter)", "getWorkScheduleStatus()",
  ]) {
    check(live.includes(reference), `live binding delegates to ${reference}`);
  }
  check(entry.includes('"./liveReadAuthority"') && entry.includes('"./readAuthority"'),
    "public Personal Assistance package exports read authority and contract");
  check(contract.includes("interface PersonalAttentionProvider") &&
    cognition.includes("personalAttentionProvider") &&
    core.includes('"@chernobog/contracts/personal-assistance"'),
    "cognition uses contract-backed injected PA attention without Core implementation imports");
  check(!core.includes('"@chernobog/personal-assistance"'),
    "Core cognition does not directly load PA implementation");
  check(existsSync(path.join(root, "packages/runtime/src/schedulerRuntime.ts")) &&
    existsSync(path.join(root, "lib/chernobog/cognition/liveOh4CommandPipeline.ts")) &&
    existsSync(path.join(root, "packages/vault/src/oh5/context.ts")),
    "OH-3, OH-4 and OH-5 remain independently-owned downstream authorities");
  check(source("packages/personal-assistance/README.md").includes("OH-1L already established"),
    "package README reflects existing persistence ownership instead of obsolete roadmap text");
  check(existsSync(path.join(root, "docs/overhaul/OH-6B-PERSONAL-ASSISTANCE-AUTHORITY.md")),
    "OH-6B authority decisions documented");
  console.log("\nOH-6B Personal Assistance Authority verifier: PASS");
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
