import { randomUUID } from "node:crypto";

import {
  ComfyUiConceptProvider,
  type CharacterConceptProviderStatus,
  type GeneratedCharacterConceptImage,
} from "../concepts/comfyUiConceptProvider";
import { CharacterConceptGenerationError } from "../errors";
import type { CharacterReferenceViewAngle } from "../types";

export type CharacterReferenceImageRequest = {
  projectId: string;
  angle: CharacterReferenceViewAngle;
  positivePrompt: string;
  negativePrompt: string;
  seed: number;
  width: number;
  height: number;
};

export interface CharacterReferenceImageProviderClient {
  readonly id: "comfyui";
  getStatus(): Promise<CharacterConceptProviderStatus>;
  generateView(
    request: CharacterReferenceImageRequest
  ): Promise<GeneratedCharacterConceptImage>;
}

type WorkflowNode = {
  class_type: string;
  inputs: Record<string, unknown>;
};

type HistoryImage = {
  filename: string;
  subfolder?: string;
  type?: string;
};

type HistoryEntry = {
  outputs?: Record<string, { images?: HistoryImage[] }>;
  status?: { status_str?: string };
};

function endpointFromEnvironment(): string {
  return (
    process.env.CHERNOBOG_COMFYUI_URL?.trim() || "http://127.0.0.1:8188"
  ).replace(/\/+$/, "");
}

function integerEnvironment(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed = Number.parseInt(process.env[name]?.trim() ?? "", 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    throw new CharacterConceptGenerationError(
      error instanceof Error
        ? `ComfyUI reference request failed: ${error.message}`
        : "ComfyUI reference request failed."
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function responseDetail(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text.length > 500 ? `${text.slice(0, 497)}...` : text;
  } catch {
    return "";
  }
}

function mimeTypeFor(
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

  return /\.jpe?g$/i.test(filename)
    ? "image/jpeg"
    : /\.webp$/i.test(filename)
      ? "image/webp"
      : "image/png";
}

function buildReferenceWorkflow({
  checkpoint,
  request,
}: {
  checkpoint: string;
  request: CharacterReferenceImageRequest;
}): Record<string, WorkflowNode> {
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        cfg: 7,
        denoise: 1,
        latent_image: ["5", 0],
        model: ["4", 0],
        negative: ["7", 0],
        positive: ["6", 0],
        sampler_name: "euler",
        scheduler: "normal",
        seed: request.seed,
        steps: 32,
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: {
        batch_size: 1,
        height: request.height,
        width: request.width,
      },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: request.positivePrompt },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["4", 1], text: request.negativePrompt },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] },
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: `CharacterForge_${request.projectId}_Reference_${request.angle}`,
        images: ["8", 0],
      },
    },
  };
}

export class ComfyUiReferenceProvider
  implements CharacterReferenceImageProviderClient
{
  readonly id = "comfyui" as const;
  private readonly endpoint = endpointFromEnvironment();
  private readonly timeoutMs = integerEnvironment(
    "CHERNOBOG_COMFYUI_TIMEOUT_MS",
    600_000,
    30_000,
    1_800_000
  );
  private readonly statusProvider = new ComfyUiConceptProvider();

  getStatus(): Promise<CharacterConceptProviderStatus> {
    return this.statusProvider.getStatus();
  }

  async generateView(
    request: CharacterReferenceImageRequest
  ): Promise<GeneratedCharacterConceptImage> {
    const status = await this.getStatus();

    if (!status.ready || !status.checkpoint) {
      throw new CharacterConceptGenerationError(
        status.error ?? "ComfyUI has no checkpoint available for reference generation."
      );
    }

    const queueResponse = await fetchWithTimeout(
      `${this.endpoint}/prompt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: randomUUID(),
          prompt: buildReferenceWorkflow({
            checkpoint: status.checkpoint,
            request,
          }),
        }),
      },
      30_000
    );

    if (!queueResponse.ok) {
      const detail = await responseDetail(queueResponse);
      throw new CharacterConceptGenerationError(
        `ComfyUI rejected the reference workflow with status ${queueResponse.status}${detail ? `: ${detail}` : "."}`
      );
    }

    const queued = (await queueResponse.json()) as { prompt_id?: unknown };

    if (typeof queued.prompt_id !== "string" || !queued.prompt_id) {
      throw new CharacterConceptGenerationError(
        "ComfyUI returned no prompt ID for the reference workflow."
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
        `ComfyUI generated a reference view but retrieval failed with status ${imageResponse.status}.`
      );
    }

    const bytes = new Uint8Array(await imageResponse.arrayBuffer());

    if (bytes.length === 0) {
      throw new CharacterConceptGenerationError(
        "ComfyUI returned an empty reference image."
      );
    }

    return {
      bytes,
      mimeType: mimeTypeFor(
        imageResponse.headers.get("Content-Type"),
        image.filename
      ),
      provider: "comfyui",
      model: status.checkpoint,
      width: request.width,
      height: request.height,
    };
  }

  private async waitForImage(promptId: string): Promise<HistoryImage> {
    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() < deadline) {
      const response = await fetchWithTimeout(
        `${this.endpoint}/history/${encodeURIComponent(promptId)}`,
        { method: "GET" },
        15_000
      );

      if (!response.ok) {
        throw new CharacterConceptGenerationError(
          `ComfyUI reference history failed with status ${response.status}.`
        );
      }

      const history = (await response.json()) as Record<string, HistoryEntry>;
      const entry = history[promptId];

      if (entry) {
        for (const output of Object.values(entry.outputs ?? {})) {
          const image = output.images?.[0];

          if (image?.filename) {
            return image;
          }
        }

        if (entry.status?.status_str === "error") {
          throw new CharacterConceptGenerationError(
            "ComfyUI reported an error while generating a reference view."
          );
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }

    throw new CharacterConceptGenerationError(
      `ComfyUI did not finish the reference view within ${Math.round(this.timeoutMs / 1000)} seconds.`
    );
  }
}

export function createCharacterReferenceImageProvider(): CharacterReferenceImageProviderClient {
  return new ComfyUiReferenceProvider();
}
