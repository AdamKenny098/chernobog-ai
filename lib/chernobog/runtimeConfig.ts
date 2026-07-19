import path from "node:path";

function readEnvironmentValue(name: string): string | undefined {
  const value = process.env[name];

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveConfiguredPath(
  environmentNames: string[],
  fallback: () => string,
): string {
  for (const environmentName of environmentNames) {
    const configuredValue = readEnvironmentValue(environmentName);

    if (configuredValue) {
      return path.resolve(configuredValue);
    }
  }

  return path.resolve(fallback());
}

export function getChernobogDataDirectory(): string {
  return resolveConfiguredPath(
    ["CHERNOBOG_DATA_DIR"],
    () => path.join(process.cwd(), "data"),
  );
}

export function getChernobogVaultDirectory(): string {
  return resolveConfiguredPath(
    [
      "CHERNOBOG_VAULT_PATH",
      "CHERNOBOG_VAULT_ROOT",
      "OBSIDIAN_VAULT_PATH",
    ],
    () => path.join(process.cwd(), "vault", "chernobog"),
  );
}

export function getChernobogImportDirectory(): string {
  return resolveConfiguredPath(
    ["CHERNOBOG_IMPORT_ROOT"],
    () => path.join(process.cwd(), "imports"),
  );
}

export function getChernobogExportDirectory(): string {
  return resolveConfiguredPath(
    ["CHERNOBOG_EXPORT_ROOT"],
    () => path.join(process.cwd(), "exports"),
  );
}

export function getChernobogRuntimeDirectory(): string {
  return resolveConfiguredPath(
    ["CHERNOBOG_RUNTIME_DIR"],
    () => path.join(getChernobogDataDirectory(), "runtime"),
  );
}

export function getOllamaGenerateUrl(): string {
  const explicitUrl = readEnvironmentValue("OLLAMA_URL");

  if (explicitUrl) {
    return explicitUrl;
  }

  const baseUrl = readEnvironmentValue("OLLAMA_BASE_URL");

  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}/api/generate`;
  }

  return "http://127.0.0.1:11434/api/generate";
}