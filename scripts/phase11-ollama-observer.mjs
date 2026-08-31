import fs from "node:fs";
import path from "node:path";

const FLAG = Symbol.for("chernobog.phase11.ollamaObserver");

if (!globalThis[FLAG] && typeof globalThis.fetch === "function") {
  globalThis[FLAG] = true;

  const originalFetch = globalThis.fetch.bind(globalThis);

  const logDir = path.join(
    process.cwd(),
    ".chernobog",
    "diagnostics"
  );

  const logPath = path.join(
    logDir,
    "phase11-ollama-400-observer.jsonl"
  );

  fs.mkdirSync(logDir, { recursive: true });

  function writeLog(entry) {
    const line =
      JSON.stringify({
        observedAt: new Date().toISOString(),
        pid: process.pid,
        ...entry,
      }) + "\n";

    fs.appendFileSync(logPath, line, "utf8");

    console.error(
      "[PHASE11_OLLAMA_OBSERVER]",
      JSON.stringify(entry, null, 2)
    );
  }

  globalThis.fetch = async function phase11ObservedFetch(
    input,
    init
  ) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input && typeof input === "object" && "url" in input
            ? String(input.url)
            : String(input);

    const isOllama =
      /:\/\/(?:127\.0\.0\.1|localhost):11434\/api\/(?:chat|generate)(?:$|\?)/i.test(
        url
      );

    if (!isOllama) {
      return originalFetch(input, init);
    }

    let requestMetadata = {
      url,
      method:
        init?.method ??
        (input &&
        typeof input === "object" &&
        "method" in input
          ? String(input.method)
          : "GET"),
    };

    try {
      if (typeof init?.body === "string") {
        const bodyText = init.body;
        const body = JSON.parse(bodyText);

        const messages = Array.isArray(body.messages)
          ? body.messages
          : [];

        requestMetadata = {
          ...requestMetadata,

          requestChars: bodyText.length,
          requestBytes: Buffer.byteLength(
            bodyText,
            "utf8"
          ),

          bodyKeys:
            body &&
            typeof body === "object"
              ? Object.keys(body).sort()
              : [],

          model:
            typeof body.model === "string"
              ? body.model
              : null,

          stream: body.stream ?? null,
          keepAlive: body.keep_alive ?? null,
          format: body.format ?? null,

          options:
            body.options &&
            typeof body.options === "object"
              ? body.options
              : null,

          hasPrompt:
            typeof body.prompt === "string",

          promptChars:
            typeof body.prompt === "string"
              ? body.prompt.length
              : 0,

          messageCount: messages.length,

          messages: messages.map(
            (message, index) => ({
              index,

              role:
                message &&
                typeof message === "object" &&
                typeof message.role === "string"
                  ? message.role
                  : null,

              contentChars:
                message &&
                typeof message === "object" &&
                typeof message.content === "string"
                  ? message.content.length
                  : 0,

              contentBytes:
                message &&
                typeof message === "object" &&
                typeof message.content === "string"
                  ? Buffer.byteLength(
                      message.content,
                      "utf8"
                    )
                  : 0,

              keys:
                message &&
                typeof message === "object"
                  ? Object.keys(message).sort()
                  : [],
            })
          ),

          toolCount: Array.isArray(body.tools)
            ? body.tools.length
            : 0,
        };
      }
    } catch (error) {
      requestMetadata = {
        ...requestMetadata,
        metadataParseError:
          error instanceof Error
            ? error.message
            : String(error),
      };
    }

    writeLog({
      event: "ollama-request",
      ...requestMetadata,
    });

    const response = await originalFetch(
      input,
      init
    );

    if (!response.ok) {
      let responseBody = "";

      try {
        responseBody =
          await response.clone().text();
      } catch (error) {
        responseBody =
          `[unable to read body: ${
            error instanceof Error
              ? error.message
              : String(error)
          }]`;
      }

      writeLog({
        event: "ollama-non-ok-response",
        url,
        status: response.status,
        statusText: response.statusText,
        responseBody:
          responseBody.slice(0, 12000),
        request: requestMetadata,
      });
    } else {
      writeLog({
        event: "ollama-ok-response",
        url,
        status: response.status,
        model:
          "model" in requestMetadata
            ? requestMetadata.model
            : null,
        messageCount:
          "messageCount" in requestMetadata
            ? requestMetadata.messageCount
            : null,
        requestBytes:
          "requestBytes" in requestMetadata
            ? requestMetadata.requestBytes
            : null,
      });
    }

    return response;
  };

  writeLog({
    event: "observer-installed",
  });
}
