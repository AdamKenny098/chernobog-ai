import { CREATE_REQUIRED_BLOCK_IDS } from "./createBlockIds";
import type { CreateSupportProfile } from "./types";

export const CREATE_1_21_1_NEOFORGE_PROFILE_ID = "create_1_21_1_neoforge";
export const VANILLA_1_21_PROFILE_ID = "minecraft_vanilla_1_21";

export const CREATE_SUPPORT_PROFILE: CreateSupportProfile = {
  id: CREATE_1_21_1_NEOFORGE_PROFILE_ID,
  label: "Create 1.21.1 NeoForge",
  supportsCreate: true,
  createVersionHint: "1.21.1-compatible Create build",
  minecraftVersionHint: "1.21.1",
  modLoaderHint: "neoforge",
  allowedBlockIds: [...CREATE_REQUIRED_BLOCK_IDS],
  notes: [
    "Profile-gated Create support for SirioCraft-style build packs.",
    "Exact block-state behavior should remain centralized here and in the block registry profile.",
    "Generators should request Create roles; compilers decide final block states.",
  ],
};

export const VANILLA_SUPPORT_PROFILE: CreateSupportProfile = {
  id: VANILLA_1_21_PROFILE_ID,
  label: "Minecraft Vanilla 1.21",
  supportsCreate: false,
  minecraftVersionHint: "1.21.x",
  modLoaderHint: "unknown",
  allowedBlockIds: [],
  notes: ["Vanilla profile. Create machinery must not be emitted."],
};

const BUILTIN_PROFILES: Record<string, CreateSupportProfile> = {
  [CREATE_SUPPORT_PROFILE.id]: CREATE_SUPPORT_PROFILE,
  [VANILLA_SUPPORT_PROFILE.id]: VANILLA_SUPPORT_PROFILE,
};

export function getCreateSupportProfile(profileId?: string): CreateSupportProfile {
  if (!profileId) {
    return CREATE_SUPPORT_PROFILE;
  }

  return BUILTIN_PROFILES[profileId] ?? {
    id: profileId,
    label: profileId,
    supportsCreate: profileId.toLowerCase().includes("create"),
    modLoaderHint: "unknown",
    allowedBlockIds: profileId.toLowerCase().includes("create") ? [...CREATE_REQUIRED_BLOCK_IDS] : [],
    notes: ["Derived fallback profile. Replace with explicit block registry profile when available."],
  };
}

export function assertCreateSupported(profileId?: string): void {
  const profile = getCreateSupportProfile(profileId);

  if (!profile.supportsCreate) {
    throw new Error(
      `Create block requested but active registry profile does not support Create. ` +
        `Profile: ${profile.id}. Required: ${CREATE_1_21_1_NEOFORGE_PROFILE_ID}.`,
    );
  }
}

export function isCreateBlockAllowed(profileId: string | undefined, blockId: string): boolean {
  const profile = getCreateSupportProfile(profileId);
  return profile.supportsCreate && profile.allowedBlockIds.includes(blockId);
}
