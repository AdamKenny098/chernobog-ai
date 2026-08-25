export function normalizeOllamaModelName(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}

export function findInstalledOllamaModelMatch(
  configuredModel: string,
  installedModels: readonly string[],
): string | undefined {
  const configured =
    normalizeOllamaModelName(
      configuredModel,
    );

  if (!configured) {
    return undefined;
  }

  /*
   * Explicit Ollama tags must match exactly.
   *
   * Example:
   * deepseek-coder-v2:16b
   */
  if (configured.includes(":")) {
    return installedModels.find(
      (installedModel) =>
        normalizeOllamaModelName(
          installedModel,
        ) === configured,
    );
  }

  /*
   * Untagged Ollama names are equivalent to :latest.
   *
   * gemma3 therefore matches:
   * - gemma3
   * - gemma3:latest
   */
  return installedModels.find(
    (installedModel) => {
      const installed =
        normalizeOllamaModelName(
          installedModel,
        );

      return (
        installed === configured ||
        installed ===
          `${configured}:latest`
      );
    },
  );
}
