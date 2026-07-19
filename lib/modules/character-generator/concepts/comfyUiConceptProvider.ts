import { randomUUID } from "node:crypto";

import { CharacterConceptGenerationError } from "../errors";

export type CharacterConceptImageRequest = {
  projectId: string;
  conceptId: string;
  positivePrompt: string;
  negativePrompt: string;
  seed: number;
};

export type GeneratedCharacterConceptImage = {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  provider: "comfyui";
  model: string;
  width: number;
  height: number;
};

export type CharacterConceptProviderStatus = {
  provider: "comfyui";
  ready: boolean;
  endpoint: string;
  checkpoint: string | null;
  availableCheckpointCount: number;
  error?: string;
};

export interface CharacterConceptImageProviderClient {
  readonly id: "comfyui";
  getStatus(): Promise<CharacterConceptProviderStatus>;
  generate(
    request: CharacterConceptImageRequest
  ): Promise<GeneratedCharacterConceptImage>;
}

type ComfyWorkflowNode = {
  class_type: string;
  inputs: Record<string, unknown>;
};

type ComfyHistoryImage = {
  filename: string;
  subfolder?: string;
  type?: string;
};

type ComfyHistoryEntry = {
  outputs?: Record<string, { images?: ComfyHistoryImage[] }>;
  status?: {
    status_str?: string;
    messages?: unknown[];
  };
};

function readIntegerEnvironment(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const raw = process.env[name]?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    return fallback;
  }

  return parsed;
}

function getComfyUiEndpoint(): string {
  return (
    process.env.CHERNOBOG_COMFYUI_URL?.trim() ||
    "http://127.0.0.1:8188"
  ).replace(/\/+$/, "");
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new CharacterConceptGenerationError(
        `ComfyUI request timed out after ${timeoutMs}ms.`
      );
    }

    throw new CharacterConceptGenerationError(
      error instanceof Error
        ? `ComfyUI request failed: ${error.message}`
        : "ComfyUI request failed."
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function readErrorResponse(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text.length > 500 ? `${text.slice(0, 497)}...` : text;
  } catch {
    return "";
  }
}

function parseCheckpointList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0
  );
}

function parseCheckpointsFromObjectInfo(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const node = (value as Record<string, unknown>).CheckpointLoaderSimple;

  if (!node || typeof node !== "object") {
    return [];
  }

  const input = (node as Record<string, unknown>).input;
  const required =
    input && typeof input === "object"
      ? (input as Record<string, unknown>).required
      : null;
  const checkpointInput =
    required && typeof required === "object"
      ? (required as Record<string, unknown>).ckpt_name
      : null;

  if (!Array.isArray(checkpointInput) || !Array.isArray(checkpointInput[0])) {
    return [];
  }

  return parseCheckpointList(checkpointInput[0]);
}

function selectMimeType(
  contentType: string | null,
  filename: string
): GeneratedCharacterConceptImage["mimeType"] {
  const normalized = contentType?.split(";", 1)[0]?.trim().toLowerCase();

  if (
    normalized === "image/png" ||
    normalized === "image/jpeg" ||
    normalized === "image/webp"
  ) {
    return normalized;
  }

  if (/\.jpe?g$/i.test(filename)) {
    return "image/jpeg";
  }

  if (/\.webp$/i.test(filename)) {
    return "image/webp";
  }

  return "image/png";
}

function findHistoryImage(entry: ComfyHistoryEntry): ComfyHistoryImage | null {
  for (const output of Object.values(entry.outputs ?? {})) {
    const image = output.images?.[0];

    if (image?.filename) {
      return image;
    }
  }

  return null;
}

function buildWorkflow({
  checkpoint,
  request,
  width,
  height,
}: {
  checkpoint: string;
  request: CharacterConceptImageRequest;
  width: number;
  height: number;
}): Record<string, ComfyWorkflowNode> {
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: 7.5,
        denoise: 1,
        latent_image: ["5", 0],
        model: ["4", 0],
        negative: ["7", 0],
        positive: ["6", 0],
        sampler_name: "euler",
        scheduler: "normal",
        seed: request.seed,
        steps: 28,
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: checkpoint,
      },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: {
        batch_size: 1,
        height,
        width,
      },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: ["4", 1],
        text: request.positivePrompt,
      },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        clip: ["4", 1],
        text: request.negativePrompt,
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2],
      },
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: `CharacterForge_${request.conceptId}`,
        images: ["8", 0],
      },
    },
  };
}

export class ComfyUiConceptProvider
  implements CharacterConceptImageProviderClient
{
  readonly id = "comfyui" as const;
  private readonly endpoint = getComfyUiEndpoint();
  private readonly width = readIntegerEnvironment(
    "CHERNOBOG_CONCEPT_WIDTH",
    768,
    512,
    1536
  );
  private readonly height = readIntegerEnvironment(
    "CHERNOBOG_CONCEPT_HEIGHT",
    1024,
    512,
    1536
  );
  private readonly timeoutMs = readIntegerEnvironment(
    "CHERNOBOG_COMFYUI_TIMEOUT_MS",
    600_000,
    30_000,
    1_800_000
  );
  private checkpointsPromise: Promise<string[]> | null = null;

  private async loadCheckpoints(): Promise<string[]> {
    if (!this.checkpointsPromise) {
      this.checkpointsPromise = this.fetchCheckpoints();
    }

    return this.checkpointsPromise;
  }

  private async fetchCheckpoints(): Promise<string[]> {
    const healthResponse = await fetchWithTimeout(
      `${this.endpoint}/system_stats`,
      { method: "GET" },
      10_000
    );

    if (!healthResponse.ok) {
      throw new CharacterConceptGenerationError(
        `ComfyUI health check failed with status ${healthResponse.status}.`
      );
    }

    const configured = process.env.CHERNOBOG_COMFYUI_CHECKPOINT?.trim();
    let checkpoints: string[] = [];

    const modelsResponse = await fetchWithTimeout(
      `${this.endpoint}/models/checkpoints`,
      { method: "GET" },
      10_000
    );

    if (modelsResponse.ok) {
      checkpoints = parseCheckpointList(
        (await modelsResponse.json()) as unknown
      );
    }

    if (checkpoints.length === 0) {
      const objectInfoResponse = await fetchWithTimeout(
        `${this.endpoint}/object_info/CheckpointLoaderSimple`,
        { method: "GET" },
        10_000
      );

      if (!objectInfoResponse.ok) {
        const detail = await readErrorResponse(objectInfoResponse);
        throw new CharacterConceptGenerationError(
          `ComfyUI checkpoint discovery failed with status ${objectInfoResponse.status}${detail ? `: ${detail}` : "."}`
        );
      }

      checkpoints = parseCheckpointsFromObjectInfo(
        (await objectInfoResponse.json()) as unknown
      );
    }

    if (configured) {
      if (!checkpoints.includes(configured)) {
        const visibleCheckpoints = checkpoints.slice(0, 8);
        const available =
          visibleCheckpoints.length > 0
            ? ` Available checkpoints: ${visibleCheckpoints.join(", ")}${checkpoints.length > visibleCheckpoints.length ? ", ..." : ""}.`
            : " ComfyUI reported no installed checkpoints.";

        throw new CharacterConceptGenerationError(
          `Configured ComfyUI checkpoint "${configured}" is not installed.${available} Update or remove CHERNOBOG_COMFYUI_CHECKPOINT in .env.local, then restart Chernobog.`
        );
      }

      return [
        configured,
        ...checkpoints.filter((checkpoint) => checkpoint !== configured),
      ];
    }

    return checkpoints;
  }

  async getStatus(): Promise<CharacterConceptProviderStatus> {
    try {
      const checkpoints = await this.loadCheckpoints();

      if (checkpoints.length === 0) {
        return {
          provider: "comfyui",
          ready: false,
          endpoint: this.endpoint,
          checkpoint: null,
          availableCheckpointCount: 0,
          error:
            "ComfyUI is reachable but no checkpoint model is installed or configured.",
        };
      }

      return {
        provider: "comfyui",
        ready: true,
        endpoint: this.endpoint,
        checkpoint: checkpoints[0],
        availableCheckpointCount: checkpoints.length,
      };
    } catch (error) {
      return {
        provider: "comfyui",
        ready: false,
        endpoint: this.endpoint,
        checkpoint: null,
        availableCheckpointCount: 0,
        error:
          error instanceof Error
            ? error.message
            : "ComfyUI is unavailable.",
      };
    }
  }

  async generate(
    request: CharacterConceptImageRequest
  ): Promise<GeneratedCharacterConceptImage> {
    const checkpoints = await this.loadCheckpoints();
    const checkpoint = checkpoints[0];

    if (!checkpoint) {
      throw new CharacterConceptGenerationError(
        "ComfyUI has no checkpoint available. Install a checkpoint or set CHERNOBOG_COMFYUI_CHECKPOINT."
      );
    }

    const queueResponse = await fetchWithTimeout(
      `${this.endpoint}/prompt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: randomUUID(),
          prompt: buildWorkflow({
            checkpoint,
            request,
            width: this.width,
            height: this.height,
          }),
        }),
      },
      30_000
    );

    if (!queueResponse.ok) {
      const detail = await readErrorResponse(queueResponse);
      throw new CharacterConceptGenerationError(
        `ComfyUI rejected the concept workflow with status ${queueResponse.status}${detail ? `: ${detail}` : "."}`
      );
    }

    const queued = (await queueResponse.json()) as {
      prompt_id?: unknown;
      error?: unknown;
    };

    if (typeof queued.prompt_id !== "string" || !queued.prompt_id) {
      throw new CharacterConceptGenerationError(
        typeof queued.error === "string"
          ? `ComfyUI rejected the workflow: ${queued.error}`
          : "ComfyUI returned no prompt ID for the concept workflow."
      );
    }

    const image = await this.waitForImage(queued.prompt_id);
    const query = new URLSearchParams({
      filename: image.filename,
      subfolder: image.subfolder ?? "",
      type: image.type ?? "output",
    });
    const imageResponse = await fetchWithTimeout(
      `${this.endpoint}/view?${query.toString()}`,
      { method: "GET" },
      60_000
    );

    if (!imageResponse.ok) {
      throw new CharacterConceptGenerationError(
        `ComfyUI generated the concept but image retrieval failed with status ${imageResponse.status}.`
      );
    }

    const bytes = new Uint8Array(await imageResponse.arrayBuffer());

    if (bytes.length === 0) {
      throw new CharacterConceptGenerationError(
        "ComfyUI returned an empty concept image."
      );
    }

    return {
      bytes,
      mimeType: selectMimeType(
        imageResponse.headers.get("Content-Type"),
        image.filename
      ),
      provider: "comfyui",
      model: checkpoint,
      width: this.width,
      height: this.height,
    };
  }

  private async waitForImage(promptId: string): Promise<ComfyHistoryImage> {
    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() < deadline) {
      const historyResponse = await fetchWithTimeout(
        `${this.endpoint}/history/${encodeURIComponent(promptId)}`,
        { method: "GET" },
        15_000
      );

      if (!historyResponse.ok) {
        throw new CharacterConceptGenerationError(
          `ComfyUI history request failed with status ${historyResponse.status}.`
        );
      }

      const history = (await historyResponse.json()) as Record<
        string,
        ComfyHistoryEntry
      >;
      const entry = history[promptId];

      if (entry) {
        const image = findHistoryImage(entry);

        if (image) {
          return image;
        }

        if (entry.status?.status_str === "error") {
          throw new CharacterConceptGenerationError(
            "ComfyUI reported an error while generating a concept image."
          );
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }

    throw new CharacterConceptGenerationError(
      `ComfyUI did not finish the concept image within ${Math.round(this.timeoutMs / 1000)} seconds.`
    );
  }
}

export function createCharacterConceptImageProvider(): CharacterConceptImageProviderClient {
  return new ComfyUiConceptProvider();
}
