/** OH-7B: fail-closed barrier on legacy file and SQLite mutation entrypoints.
 * This is NOT a production cutover or ownership grant.
 * In legacy mode, the existing application behaves exactly as before.
 * Proxy mode refuses local store writes, even if a code path imports old services.
 */
export function assertLegacyStorageWritable(what: string, env: NodeJS.ProcessEnv = process.env): void {
  if (env.CHERNOBOG_CORE_ROUTE_MODE !== "proxy") return;
  throw new Error(`OH7B_LEGACY_WRITER_FENCED: ${what}; production core cutover is not yet enabled`);
}
