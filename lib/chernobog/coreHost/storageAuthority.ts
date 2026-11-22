/** OH-7B: legacy write fence, plus OH-7B13 guarded core storage authority.
 * Legacy behavior remains unchanged. "core" role denies state mutation until
 * a live owner-check callback is installed by a trusted operational host.
 * This is process-local defense in depth, NOT an OS-level writer exclusion.
 */
let coreWriteOwner: (() => void) | null = null;
let coreAuthorityRevoked = false;

/** Install only AFTER acquiring and verifying the OH-7B12 production lease.
 * The operational host must install this before importing any SQLite stores.
 */
export function installCoreWriteAuthority(
  assertStillOwned: () => void,
  env: NodeJS.ProcessEnv = process.env,
): () => void {
  if (env.CHERNOBOG_STORAGE_ROLE !== "core") {
    throw new Error("OH7B13: core write authority requires explicit core storage role");
  }
  if (coreWriteOwner !== null || coreAuthorityRevoked) {
    throw new Error("OH7B13: core write authority already installed or revoked");
  }
  // Fail closed if the lease is invalid even at installation time.
  assertStillOwned();
  coreWriteOwner = assertStillOwned;
  return () => {
    if (coreWriteOwner === assertStillOwned) {
      coreWriteOwner = null;
      coreAuthorityRevoked = true;
    }
  };
}

/** Call at every guarded write boundary, not merely when a store opens. */
export function assertStorageWritable(
  what: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (env.CHERNOBOG_STORAGE_ROLE === "core") {
    if (coreAuthorityRevoked || !coreWriteOwner) {
      throw new Error(`OH7B13_CORE_WRITER_DENIED: ${what}; owner check not active`);
    }
    try {
      coreWriteOwner();
    } catch (error) {
      coreWriteOwner = null;
      coreAuthorityRevoked = true;
      throw new Error(`OH7B13_CORE_OWNER_LOST: ${what}`, { cause: error });
    }
    return;
  }
  if (env.CHERNOBOG_STORAGE_ROLE && env.CHERNOBOG_STORAGE_ROLE !== "legacy") {
    throw new Error(`OH7B13_UNKNOWN_STORAGE_ROLE: ${what}`);
  }
  if (env.CHERNOBOG_CORE_ROUTE_MODE === "proxy") {
    throw new Error(`OH7B_LEGACY_WRITER_FENCED: ${what}; production core cutover is not yet enabled`);
  }
}

/** Compatibility name retained for accepted legacy persistence imports. */
export function assertLegacyStorageWritable(
  what: string,
  env: NodeJS.ProcessEnv = process.env,
): void {
  assertStorageWritable(what, env);
}
