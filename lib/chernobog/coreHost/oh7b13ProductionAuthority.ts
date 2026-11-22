/**
 * OH-7B13: binds an already-quiescent production writer boundary to the
 * process-local storage fence. No systemd state change or HTTP activation.
 *
 * This is an integration component, not authorization for live cutover.
 */
import { acquireOH7B12Ownership, readLegacySystemdState } from "../../../scripts/oh7b12-production-ownership.mjs";
import { installCoreWriteAuthority } from "./storageAuthority";
import { OH7B13OwnershipGuard } from "./oh7b13OwnershipGuard";

export interface OH7B13ProductionAuthorityOptions {
  root: string;
  env: NodeJS.ProcessEnv;
  explicitOptIn: boolean;
  getLegacyState?: typeof readLegacySystemdState;
}

export function acquireOH7B13ProductionAuthority(options: OH7B13ProductionAuthorityOptions) {
  if (options.env.CHERNOBOG_STORAGE_ROLE !== "core") {
    throw new Error("OH7B13 requires core storage role before production ownership");
  }
  const lease = acquireOH7B12Ownership({
    root: options.root,
    env: options.env,
    explicitOptIn: options.explicitOptIn,
    getLegacyState: options.getLegacyState ?? readLegacySystemdState,
  });
  let revoke: (() => void) | undefined;
  try {
    revoke = installCoreWriteAuthority(lease.assertStillOwned, options.env);
    const guard = new OH7B13OwnershipGuard(lease);
    if (!guard.hasOwnership()) {
      throw new Error("OH7B13 ownership lost during activation");
    }
    return Object.freeze({
      paths: lease.paths,
      guard,
      assertStillOwned: lease.assertStillOwned,
      release() {
        // Never leave a live process-local writer grant after lease release.
        revoke?.();
        lease.release();
      },
    });
  } catch (error) {
    revoke?.();
    lease.release();
    throw error;
  }
}
