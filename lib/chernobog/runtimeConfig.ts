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

function rewriteKnownOllamaEndpoint(
  explicitUrl: string,
  endpoint: "generate" | "chat" | "tags",
): string | undefined {
  try {
    const parsed = new URL(explicitUrl);
    const normalizedPath = parsed.pathname.replace(/\/+$/, "");

    if (
      normalizedPath.endsWith("/api/generate") ||
      normalizedPath.endsWith("/api/chat") ||
      normalizedPath.endsWith("/api/tags")
    ) {
      parsed.pathname = parsed.pathname.replace(
        /\/api\/(?:generate|chat|tags)\/?$/,
        `/api/${endpoint}`,
      );
      parsed.search = "";
      parsed.hash = "";

      return parsed.toString();
    }

    return undefined;
  } catch {
    return undefined;
  }
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


/** OH-5 preserves its historical development location unless storage is configured. */
export function getOH5DatabasePath(): string {
  const hasConfiguredStorage =
    readEnvironmentValue("CHERNOBOG_RUNTIME_DIR") !== undefined ||
    readEnvironmentValue("CHERNOBOG_DATA_DIR") !== undefined;

  const runtimeRoot = hasConfiguredStorage
    ? getChernobogRuntimeDirectory()
    : path.join(process.cwd(), ".chernobog", "runtime");

  return path.join(runtimeRoot, "oh5", "memory.sqlite");
}

export function getOllamaGenerateUrl(): string {
  const explicitUrl = readEnvironmentValue("OLLAMA_URL");

  if (explicitUrl) {
    return (
      rewriteKnownOllamaEndpoint(explicitUrl, "generate") ??
      explicitUrl
    );
  }

  const baseUrl = readEnvironmentValue("OLLAMA_BASE_URL");

  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}/api/generate`;
  }

  return "http://127.0.0.1:11434/api/generate";
}

export function getOllamaChatUrl(): string {
  const explicitUrl = readEnvironmentValue("OLLAMA_URL");

  if (explicitUrl) {
    const rewritten = rewriteKnownOllamaEndpoint(explicitUrl, "chat");

    if (rewritten) {
      return rewritten;
    }

    try {
      const parsed = new URL(explicitUrl);
      return new URL("/api/chat", parsed.origin).toString();
    } catch {
      /*
       * Fall through to the configured base URL or localhost.
       */
    }
  }

  const baseUrl = readEnvironmentValue("OLLAMA_BASE_URL");

  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, "")}/api/chat`;
  }

  return "http://127.0.0.1:11434/api/chat";
}

export function getOllamaTagsUrl(): string {
  const baseUrl =
    readEnvironmentValue(
      "OLLAMA_BASE_URL"
    );

  if (baseUrl) {
    return `${
      baseUrl.replace(
        /\/+$/,
        ""
      )
    }/api/tags`;
  }

  const explicitUrl =
    readEnvironmentValue(
      "OLLAMA_URL"
    );

  if (explicitUrl) {
    const rewritten =
      rewriteKnownOllamaEndpoint(
        explicitUrl,
        "tags",
      );

    if (rewritten) {
      return rewritten;
    }

    try {
      const parsed =
        new URL(explicitUrl);

      return new URL(
        "/api/tags",
        parsed.origin
      ).toString();
    } catch {
      /*
       * Preserve the historical localhost
       * fallback if OLLAMA_URL is malformed.
       */
    }
  }

  return "http://127.0.0.1:11434/api/tags";
}
