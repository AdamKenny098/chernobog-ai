import path from "path";

export function projectRoot(): string {
  return process.cwd();
}

export function toProjectRelative(absolutePath: string): string {
  return path.relative(projectRoot(), absolutePath).replaceAll("\\", "/");
}

export function schematicExportRoot(): string {
  return path.join(projectRoot(), "exports", "schematics");
}

export function debugJsonRoot(): string {
  return path.join(schematicExportRoot(), "debug");
}

export function metadataRoot(): string {
  return path.join(schematicExportRoot(), "metadata");
}

export function vaultSchematicRoot(): string {
  return path.join(projectRoot(), "vault", "chernobog", "Minecraft", "Schematics");
}

export function latestRecordPath(): string {
  return path.join(schematicExportRoot(), "latest.json");
}

export function getGenerationAbsolutePaths(buildId: string) {
  return {
    debugJsonPath: path.join(debugJsonRoot(), `${buildId}.debug.json`),
    metadataJsonPath: path.join(metadataRoot(), `${buildId}.metadata.json`),
    schemPath: path.join(schematicExportRoot(), `${buildId}.schem`),
    vaultNotePath: path.join(vaultSchematicRoot(), `${buildId}.md`),
  };
}

export function getGenerationRelativePaths(buildId: string) {
  const absolute = getGenerationAbsolutePaths(buildId);

  return {
    debugJsonPath: toProjectRelative(absolute.debugJsonPath),
    metadataJsonPath: toProjectRelative(absolute.metadataJsonPath),
    schemPath: toProjectRelative(absolute.schemPath),
    vaultNotePath: toProjectRelative(absolute.vaultNotePath),
  };
}