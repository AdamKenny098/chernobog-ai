import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildOllamaRequestPlan,
} from "../lib/chernobog/llm/ollamaClient";

async function main(): Promise<void> {
  console.log(
    "Chernobog Ollama Residency & Timeout Hotfix v3",
  );
  console.log(
    "===============================================",
  );

  const router = await readFile(
    "lib/chernobog/router.ts",
    "utf8",
  );

  const intent = await readFile(
    "lib/chernobog/tools/intent.ts",
    "utf8",
  );

  const client = await readFile(
    "lib/chernobog/llm/ollamaClient.ts",
    "utf8",
  );

  assert.equal(
    /timeoutMs:\s*30_000/.test(router),
    false,
  );

  assert.equal(
    /timeoutMs:\s*30_000/.test(intent),
    false,
  );

  console.log(
    "PASS router and tool-intent no longer impose 30-second Ollama deadlines",
  );

  assert.equal(
    /timeoutMs\s*=\s*300_000/.test(client),
    true,
  );

  console.log(
    "PASS shared 11A client retains its 300-second reliability backstop",
  );

  assert.equal(
    (
      client.match(
        /keep_alive:\s*options\.keepAlive\?\.trim\(\)\s*\|\|\s*process\.env\.CHERNOBOG_OLLAMA_KEEP_ALIVE\?\.trim\(\)\s*\|\|\s*"30m"/g,
      ) ?? []
    ).length,
    2,
  );

  console.log(
    "PASS keep-alive policy is present in both Ollama request bodies",
  );

  const previous =
    process.env.CHERNOBOG_OLLAMA_KEEP_ALIVE;

  try {
    delete process.env.CHERNOBOG_OLLAMA_KEEP_ALIVE;

    const generate =
      buildOllamaRequestPlan(
        {
          prompt: "test",
        },
        "gemma3:latest",
      );

    const chat =
      buildOllamaRequestPlan(
        {
          messages: [
            {
              role: "user",
              content: "test",
            },
          ],
        },
        "gemma3:latest",
      );

    assert.equal(
      generate.body.keep_alive,
      "30m",
    );

    assert.equal(
      chat.body.keep_alive,
      "30m",
    );

    console.log(
      "PASS generate and chat default to 30-minute model residency",
    );

    process.env.CHERNOBOG_OLLAMA_KEEP_ALIVE =
      "12m";

    const envOverride =
      buildOllamaRequestPlan(
        {
          prompt: "test",
        },
        "gemma3:latest",
      );

    assert.equal(
      envOverride.body.keep_alive,
      "12m",
    );

    const requestOverride =
      buildOllamaRequestPlan(
        {
          prompt: "test",
          keepAlive: "5m",
        },
        "gemma3:latest",
      );

    assert.equal(
      requestOverride.body.keep_alive,
      "5m",
    );

    console.log(
      "PASS environment and per-request keep-alive overrides work",
    );
  } finally {
    if (previous === undefined) {
      delete process.env.CHERNOBOG_OLLAMA_KEEP_ALIVE;
    } else {
      process.env.CHERNOBOG_OLLAMA_KEEP_ALIVE =
        previous;
    }
  }

  console.log(
    "===============================================",
  );

  console.log(
    "PASS Chernobog Ollama Residency & Timeout Hotfix v3",
  );
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});