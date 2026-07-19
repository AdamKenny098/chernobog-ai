import { createHash, randomUUID } from "node:crypto";

import { CharacterCanonicalPoseGenerationError } from "../errors";
import { createCanonicalAPoseGuide } from "./canonicalPoseGuide";

export type CharacterCanonicalPoseDependencyId =
  | "comfyui"
  | "core-nodes"
  | "checkpoint"
  | "ipadapter-nodes"
  | "ipadapter-model"
  | "clip-vision-model"
  | "controlnet-nodes"
  | "openpose-model";

export type CharacterCanonicalPoseDependencyStatus = {
  id: CharacterCanonicalPoseDependencyId;
  label: string;
  ready: boolean;
  selected: string | null;
  availableCount: number;
  detail: string;
  installLocation: string | null;
};

export type CharacterCanonicalPoseProviderStatus = {
  provider: "comfyui";
  ready: boolean;
  endpoint: string;
  checkedAt: string;
  dependencies: CharacterCanonicalPoseDependencyStatus[];
  missing: string[];
  error?: string;
};

export interface CharacterCanonicalPoseProviderClient {
  readonly id: "comfyui";
  getStatus(): Promise<CharacterCanonicalPoseProviderStatus>;
  generate(
    request: CharacterCanonicalPoseGenerationRequest,
  ): Promise<GeneratedCharacterCanonicalPose>;
}

export type CharacterCanonicalPoseGenerationRequest = {
  projectId: string;
  identityImage: Uint8Array;
  identityMimeType: "image/png" | "image/jpeg" | "image/webp";
  identityWidth: number;
  identityHeight: number;
  positivePrompt: string;
  negativePrompt: string;
  seed: number;
};

export type GeneratedCharacterCanonicalPose = {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  provider: "comfyui";
  width: number;
  height: number;
  checkpoint: string;
  ipAdapterModel: string;
  clipVisionModel: string;
  controlNetModel: string;
  poseGuideSha256: string;
  ipAdapterWeight: number;
  controlNetStrength: number;
  steps: number;
  cfg: number;
  sampler: string;
  scheduler: string;
};

export type ComfyUiCanonicalPoseProviderOptions = {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  checkpoint?: string;
  ipAdapterModel?: string;
  clipVisionModel?: string;
  openPoseModel?: string;
  width?: number;
  height?: number;
  timeoutMs?: number;
};

type ObjectInfo = Record<string, unknown>;

type ComfyWorkflowNode = {
  class_type: string;
  inputs: Record<string, unknown>;
};

type ComfyUpload = {
  name: string;
  subfolder?: string;
  type?: string;
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

const CORE_NODES = [
  "CheckpointLoaderSimple",
  "LoadImage",
  "ImagePadForOutpaint",
  "CLIPVisionLoader",
  "CLIPTextEncode",
  "EmptyLatentImage",
  "KSampler",
  "VAEDecode",
  "SaveImage",
] as const;

const IPADAPTER_NODES = ["IPAdapterModelLoader", "IPAdapterAdvanced"] as const;
const CONTROLNET_NODES = [
  "ControlNetLoader",
  "ControlNetApplyAdvanced",
] as const;

const DEFAULT_WIDTH = 768;
const DEFAULT_HEIGHT = 1024;
const DEFAULT_STEPS = 30;
const DEFAULT_CFG = 5.5;
const DEFAULT_IPADAPTER_WEIGHT = 0.88;
const DEFAULT_CONTROLNET_STRENGTH = 1;
const DEFAULT_SAMPLER = "dpmpp_2m_sde";
const DEFAULT_SCHEDULER = "karras";

function getComfyUiEndpoint(): string {
  return (
    process.env.CHERNOBOG_COMFYUI_URL?.trim() || "http://127.0.0.1:8188"
  ).replace(/\/+$/, "");
}

function nonEmptyEnvironment(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function integerEnvironment(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(process.env[name]?.trim() ?? "", 10);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function dimensionEnvironment(name: string, fallback: number): number {
  const value = integerEnvironment(name, fallback, 512, 1536);
  return value % 64 === 0 ? value : fallback;
}

function decimalEnvironment(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseFloat(process.env[name]?.trim() ?? "");
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function dependency(
  value: CharacterCanonicalPoseDependencyStatus,
): CharacterCanonicalPoseDependencyStatus {
  return value;
}

function readChoices(
  objectInfo: ObjectInfo,
  nodeName: string,
  inputName: string,
): string[] {
  const node = objectInfo[nodeName];

  if (!node || typeof node !== "object") {
    return [];
  }

  const input = (node as Record<string, unknown>).input;
  const required =
    input && typeof input === "object"
      ? (input as Record<string, unknown>).required
      : null;
  const inputDefinition =
    required && typeof required === "object"
      ? (required as Record<string, unknown>)[inputName]
      : null;

  if (!Array.isArray(inputDefinition) || !Array.isArray(inputDefinition[0])) {
    return [];
  }

  return inputDefinition[0].filter(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0,
  );
}

function missingNodes(
  objectInfo: ObjectInfo,
  requiredNodes: readonly string[],
): string[] {
  return requiredNodes.filter((nodeName) => !(nodeName in objectInfo));
}

function isSdxlCheckpoint(filename: string): boolean {
  return /sd[_. -]*xl|sdxl|juggernautxl|pony|illustrious|(^|[/\\])[^/\\]*xl(?:[_. -]|$)/i.test(
    filename,
  );
}

function isSdxlIpAdapter(filename: string): boolean {
  return (
    /ip[_. -]*adapter/i.test(filename) &&
    /sdxl|sd[_. -]*xl/i.test(filename) &&
    !/faceid|face[_. -]/i.test(filename)
  );
}

function isSdxlOpenPose(filename: string): boolean {
  return (
    /open[_. -]*pose|openpose/i.test(filename) &&
    /sdxl|sd[_. -]*xl|xl[_. -]/i.test(filename)
  );
}

function rankIpAdapter(filename: string): number {
  let score = 0;

  if (/plus/i.test(filename)) score += 20;
  if (/vit[_. -]*h/i.test(filename)) score += 10;
  if (/\.safetensors$/i.test(filename)) score += 5;

  return score;
}

function selectInstalled(
  available: string[],
  configured: string | undefined,
  predicate?: (filename: string) => boolean,
  rank?: (filename: string) => number,
): string | null {
  if (configured) {
    return available.includes(configured) ? configured : null;
  }

  const compatible = predicate ? available.filter(predicate) : available;
  const sorted = rank
    ? [...compatible].sort((left, right) => rank(right) - rank(left))
    : compatible;

  return sorted[0] ?? null;
}

function isCompatibleClipVision(
  filename: string,
  ipAdapterModel: string | null,
): boolean {
  if (ipAdapterModel && /vit[_. -]*h/i.test(ipAdapterModel)) {
    return /vit[_. -]*h|h[_. -]*14|laion2b[_. -]*s32b/i.test(filename);
  }

  if (ipAdapterModel) {
    return /bigg|vit[_. -]*g|g[_. -]*14|laion2b[_. -]*39b/i.test(filename);
  }

  return /vit[_. -]*(h|g)|(?:h|g)[_. -]*14|bigg/i.test(filename);
}

function selectedDependency(
  status: CharacterCanonicalPoseProviderStatus,
  id: CharacterCanonicalPoseDependencyId,
): string {
  const selected = status.dependencies.find(
    (entry) => entry.id === id,
  )?.selected;

  if (!selected) {
    throw new CharacterCanonicalPoseGenerationError(
      `Canonical-pose readiness did not select ${id}. Recheck the local stack.`,
    );
  }

  return selected;
}

function uploadedImageName(upload: ComfyUpload): string {
  const subfolder = upload.subfolder
    ?.replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  return subfolder ? `${subfolder}/${upload.name}` : upload.name;
}

function imageExtension(
  mimeType: CharacterCanonicalPoseGenerationRequest["identityMimeType"],
): string {
  return mimeType === "image/jpeg"
    ? "jpg"
    : mimeType === "image/webp"
      ? "webp"
      : "png";
}

function outputMimeType(
  contentType: string | null,
  filename: string,
): GeneratedCharacterCanonicalPose["mimeType"] {
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

function findHistoryImage(entry: ComfyHistoryEntry): ComfyHistoryImage | null {
  for (const output of Object.values(entry.outputs ?? {})) {
    const image = output.images?.[0];
    if (image?.filename) return image;
  }

  return null;
}

function historyError(entry: ComfyHistoryEntry): string {
  const messages = entry.status?.messages;
  if (!messages?.length) return "ComfyUI reported an unknown workflow error.";

  const detail = JSON.stringify(messages.at(-1));
  return detail.length > 1_000 ? `${detail.slice(0, 997)}...` : detail;
}

function buildCanonicalPoseWorkflow({
  checkpoint,
  ipAdapterModel,
  clipVisionModel,
  controlNetModel,
  identityImage,
  poseImage,
  request,
  width,
  height,
  steps,
  cfg,
  ipAdapterWeight,
  controlNetStrength,
  sampler,
  scheduler,
}: {
  checkpoint: string;
  ipAdapterModel: string;
  clipVisionModel: string;
  controlNetModel: string;
  identityImage: string;
  poseImage: string;
  request: CharacterCanonicalPoseGenerationRequest;
  width: number;
  height: number;
  steps: number;
  cfg: number;
  ipAdapterWeight: number;
  controlNetStrength: number;
  sampler: string;
  scheduler: string;
}): Record<string, ComfyWorkflowNode> {
  const squareSize = Math.max(request.identityWidth, request.identityHeight);
  const horizontalPadding = squareSize - request.identityWidth;
  const verticalPadding = squareSize - request.identityHeight;

  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint },
    },
    "2": {
      class_type: "LoadImage",
      inputs: { image: identityImage },
    },
    "3": {
      class_type: "ImagePadForOutpaint",
      inputs: {
        image: ["2", 0],
        left: Math.floor(horizontalPadding / 2),
        top: Math.floor(verticalPadding / 2),
        right: Math.ceil(horizontalPadding / 2),
        bottom: Math.ceil(verticalPadding / 2),
        feathering: 0,
      },
    },
    "4": {
      class_type: "CLIPVisionLoader",
      inputs: { clip_name: clipVisionModel },
    },
    "5": {
      class_type: "IPAdapterModelLoader",
      inputs: { ipadapter_file: ipAdapterModel },
    },
    "6": {
      class_type: "IPAdapterAdvanced",
      inputs: {
        model: ["1", 0],
        ipadapter: ["5", 0],
        image: ["3", 0],
        clip_vision: ["4", 0],
        weight: ipAdapterWeight,
        weight_type: "linear",
        combine_embeds: "average",
        start_at: 0,
        end_at: 0.9,
        embeds_scaling: "K+V w/ C penalty",
      },
    },
    "7": {
      class_type: "LoadImage",
      inputs: { image: poseImage },
    },
    "8": {
      class_type: "ControlNetLoader",
      inputs: { control_net_name: controlNetModel },
    },
    "9": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["1", 1], text: request.positivePrompt },
    },
    "10": {
      class_type: "CLIPTextEncode",
      inputs: { clip: ["1", 1], text: request.negativePrompt },
    },
    "11": {
      class_type: "ControlNetApplyAdvanced",
      inputs: {
        positive: ["9", 0],
        negative: ["10", 0],
        control_net: ["8", 0],
        image: ["7", 0],
        strength: controlNetStrength,
        start_percent: 0,
        end_percent: 0.9,
      },
    },
    "12": {
      class_type: "EmptyLatentImage",
      inputs: { batch_size: 1, width, height },
    },
    "13": {
      class_type: "KSampler",
      inputs: {
        model: ["6", 0],
        positive: ["11", 0],
        negative: ["11", 1],
        latent_image: ["12", 0],
        seed: request.seed,
        steps,
        cfg,
        sampler_name: sampler,
        scheduler,
        denoise: 1,
      },
    },
    "14": {
      class_type: "VAEDecode",
      inputs: { samples: ["13", 0], vae: ["1", 2] },
    },
    "15": {
      class_type: "SaveImage",
      inputs: {
        images: ["14", 0],
        filename_prefix: `CharacterForge_${request.projectId}_Canonical_APose`,
      },
    },
  };
}

async function fetchJson(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`ComfyUI returned status ${response.status} for ${url}.`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchForGeneration(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? `request timed out after ${Math.round(timeoutMs / 1000)} seconds`
        : error instanceof Error
          ? error.message
          : "request failed";
    throw new CharacterCanonicalPoseGenerationError(
      `ComfyUI canonical-pose ${message}.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function responseDetail(response: Response): Promise<string> {
  try {
    const text = (await response.text()).trim();
    return text.length > 1_500 ? `${text.slice(0, 1_497)}...` : text;
  } catch {
    return "";
  }
}

function unavailableDependencies(
  endpoint: string,
  error: unknown,
): CharacterCanonicalPoseProviderStatus {
  const message =
    error instanceof Error ? error.message : "ComfyUI is unavailable.";
  const dependencies: CharacterCanonicalPoseDependencyStatus[] = [
    dependency({
      id: "comfyui",
      label: "ComfyUI server",
      ready: false,
      selected: endpoint,
      availableCount: 0,
      detail: message,
      installLocation: null,
    }),
    dependency({
      id: "core-nodes",
      label: "Core workflow nodes",
      ready: false,
      selected: null,
      availableCount: 0,
      detail: "Cannot inspect nodes until ComfyUI is reachable.",
      installLocation: null,
    }),
    dependency({
      id: "checkpoint",
      label: "SDXL checkpoint",
      ready: false,
      selected: null,
      availableCount: 0,
      detail: "Cannot inspect checkpoint models.",
      installLocation: "ComfyUI/models/checkpoints",
    }),
    dependency({
      id: "ipadapter-nodes",
      label: "IP-Adapter Plus nodes",
      ready: false,
      selected: null,
      availableCount: 0,
      detail: "Cannot inspect custom nodes.",
      installLocation: "ComfyUI/custom_nodes/ComfyUI_IPAdapter_plus",
    }),
    dependency({
      id: "ipadapter-model",
      label: "SDXL IP-Adapter model",
      ready: false,
      selected: null,
      availableCount: 0,
      detail: "Cannot inspect IP-Adapter models.",
      installLocation: "ComfyUI/models/ipadapter",
    }),
    dependency({
      id: "clip-vision-model",
      label: "CLIP Vision model",
      ready: false,
      selected: null,
      availableCount: 0,
      detail: "Cannot inspect CLIP Vision models.",
      installLocation: "ComfyUI/models/clip_vision",
    }),
    dependency({
      id: "controlnet-nodes",
      label: "ControlNet nodes",
      ready: false,
      selected: null,
      availableCount: 0,
      detail: "Cannot inspect core ControlNet nodes.",
      installLocation: null,
    }),
    dependency({
      id: "openpose-model",
      label: "SDXL OpenPose ControlNet",
      ready: false,
      selected: null,
      availableCount: 0,
      detail: "Cannot inspect ControlNet models.",
      installLocation: "ComfyUI/models/controlnet",
    }),
  ];

  return {
    provider: "comfyui",
    ready: false,
    endpoint,
    checkedAt: new Date().toISOString(),
    dependencies,
    missing: dependencies.map((entry) => entry.label),
    error: message,
  };
}

export class ComfyUiCanonicalPoseProvider
  implements CharacterCanonicalPoseProviderClient
{
  readonly id = "comfyui" as const;
  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;
  private readonly configuredCheckpoint: string | undefined;
  private readonly configuredIpAdapter: string | undefined;
  private readonly configuredClipVision: string | undefined;
  private readonly configuredOpenPose: string | undefined;
  private readonly width: number;
  private readonly height: number;
  private readonly timeoutMs: number;
  private readonly steps: number;
  private readonly cfg: number;
  private readonly ipAdapterWeight: number;
  private readonly controlNetStrength: number;
  private readonly sampler: string;
  private readonly scheduler: string;

  constructor(options: ComfyUiCanonicalPoseProviderOptions = {}) {
    this.endpoint = (options.endpoint ?? getComfyUiEndpoint()).replace(
      /\/+$/,
      "",
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.configuredCheckpoint =
      options.checkpoint ?? nonEmptyEnvironment("CHERNOBOG_COMFYUI_CHECKPOINT");
    this.configuredIpAdapter =
      options.ipAdapterModel ??
      nonEmptyEnvironment("CHERNOBOG_CANONICAL_IPADAPTER_MODEL");
    this.configuredClipVision =
      options.clipVisionModel ??
      nonEmptyEnvironment("CHERNOBOG_CANONICAL_CLIP_VISION_MODEL");
    this.configuredOpenPose =
      options.openPoseModel ??
      nonEmptyEnvironment("CHERNOBOG_CANONICAL_OPENPOSE_MODEL");
    this.width =
      options.width ??
      dimensionEnvironment("CHERNOBOG_CANONICAL_WIDTH", DEFAULT_WIDTH);
    this.height =
      options.height ??
      dimensionEnvironment("CHERNOBOG_CANONICAL_HEIGHT", DEFAULT_HEIGHT);
    this.timeoutMs =
      options.timeoutMs ??
      integerEnvironment(
        "CHERNOBOG_COMFYUI_TIMEOUT_MS",
        600_000,
        30_000,
        1_800_000,
      );
    this.steps = integerEnvironment(
      "CHERNOBOG_CANONICAL_STEPS",
      DEFAULT_STEPS,
      16,
      60,
    );
    this.cfg = decimalEnvironment(
      "CHERNOBOG_CANONICAL_CFG",
      DEFAULT_CFG,
      1,
      15,
    );
    this.ipAdapterWeight = decimalEnvironment(
      "CHERNOBOG_CANONICAL_IPADAPTER_WEIGHT",
      DEFAULT_IPADAPTER_WEIGHT,
      0.1,
      1.5,
    );
    this.controlNetStrength = decimalEnvironment(
      "CHERNOBOG_CANONICAL_CONTROLNET_STRENGTH",
      DEFAULT_CONTROLNET_STRENGTH,
      0.1,
      2,
    );
    this.sampler =
      nonEmptyEnvironment("CHERNOBOG_CANONICAL_SAMPLER") ?? DEFAULT_SAMPLER;
    this.scheduler =
      nonEmptyEnvironment("CHERNOBOG_CANONICAL_SCHEDULER") ?? DEFAULT_SCHEDULER;
  }

  async getStatus(): Promise<CharacterCanonicalPoseProviderStatus> {
    try {
      await fetchJson(this.fetchImpl, `${this.endpoint}/system_stats`, 10_000);
      const objectInfoValue = await fetchJson(
        this.fetchImpl,
        `${this.endpoint}/object_info`,
        15_000,
      );
      const objectInfo =
        objectInfoValue && typeof objectInfoValue === "object"
          ? (objectInfoValue as ObjectInfo)
          : {};
      const coreMissing = missingNodes(objectInfo, CORE_NODES);
      const ipAdapterMissing = missingNodes(objectInfo, IPADAPTER_NODES);
      const controlNetMissing = missingNodes(objectInfo, CONTROLNET_NODES);
      const checkpoints = readChoices(
        objectInfo,
        "CheckpointLoaderSimple",
        "ckpt_name",
      );
      const ipAdapterModels = readChoices(
        objectInfo,
        "IPAdapterModelLoader",
        "ipadapter_file",
      );
      const clipVisionModels = readChoices(
        objectInfo,
        "CLIPVisionLoader",
        "clip_name",
      );
      const controlNetModels = readChoices(
        objectInfo,
        "ControlNetLoader",
        "control_net_name",
      );
      const checkpoint = selectInstalled(
        checkpoints,
        this.configuredCheckpoint,
        isSdxlCheckpoint,
      );
      const ipAdapterModel = selectInstalled(
        ipAdapterModels,
        this.configuredIpAdapter,
        isSdxlIpAdapter,
        rankIpAdapter,
      );
      const clipVisionModel = selectInstalled(
        clipVisionModels,
        this.configuredClipVision,
        (filename) => isCompatibleClipVision(filename, ipAdapterModel),
      );
      const openPoseModel = selectInstalled(
        controlNetModels,
        this.configuredOpenPose,
        isSdxlOpenPose,
      );
      const checkpointCompatible =
        checkpoint !== null &&
        (Boolean(this.configuredCheckpoint) || isSdxlCheckpoint(checkpoint));
      const ipAdapterCompatible =
        ipAdapterModel !== null && isSdxlIpAdapter(ipAdapterModel);
      const clipVisionCompatible =
        clipVisionModel !== null &&
        isCompatibleClipVision(clipVisionModel, ipAdapterModel);
      const openPoseCompatible =
        openPoseModel !== null && isSdxlOpenPose(openPoseModel);

      const dependencies: CharacterCanonicalPoseDependencyStatus[] = [
        dependency({
          id: "comfyui",
          label: "ComfyUI server",
          ready: true,
          selected: this.endpoint,
          availableCount: 1,
          detail: "The local ComfyUI API is reachable.",
          installLocation: null,
        }),
        dependency({
          id: "core-nodes",
          label: "Core workflow nodes",
          ready: coreMissing.length === 0,
          selected:
            coreMissing.length === 0 ? `${CORE_NODES.length} nodes` : null,
          availableCount: CORE_NODES.length - coreMissing.length,
          detail:
            coreMissing.length === 0
              ? "All standard image-generation nodes are available."
              : `Missing: ${coreMissing.join(", ")}.`,
          installLocation: null,
        }),
        dependency({
          id: "checkpoint",
          label: "SDXL checkpoint",
          ready: checkpointCompatible,
          selected: checkpoint,
          availableCount: checkpoints.length,
          detail: checkpointCompatible
            ? "An SDXL-compatible generation checkpoint is selected."
            : this.configuredCheckpoint && !checkpoint
              ? `Configured checkpoint not found: ${this.configuredCheckpoint}.`
              : "No detectable SDXL checkpoint is available.",
          installLocation: "ComfyUI/models/checkpoints",
        }),
        dependency({
          id: "ipadapter-nodes",
          label: "IP-Adapter Plus nodes",
          ready: ipAdapterMissing.length === 0,
          selected:
            ipAdapterMissing.length === 0
              ? `${IPADAPTER_NODES.length} nodes`
              : null,
          availableCount: IPADAPTER_NODES.length - ipAdapterMissing.length,
          detail:
            ipAdapterMissing.length === 0
              ? "IPAdapterModelLoader and IPAdapterAdvanced are available."
              : `Missing: ${ipAdapterMissing.join(", ")}.`,
          installLocation: "ComfyUI/custom_nodes/ComfyUI_IPAdapter_plus",
        }),
        dependency({
          id: "ipadapter-model",
          label: "SDXL IP-Adapter model",
          ready: ipAdapterCompatible,
          selected: ipAdapterModel,
          availableCount: ipAdapterModels.length,
          detail: ipAdapterCompatible
            ? "A non-FaceID SDXL identity model is selected."
            : this.configuredIpAdapter && !ipAdapterModel
              ? `Configured model not found: ${this.configuredIpAdapter}.`
              : "No full-body SDXL IP-Adapter model was detected.",
          installLocation: "ComfyUI/models/ipadapter",
        }),
        dependency({
          id: "clip-vision-model",
          label: "CLIP Vision model",
          ready: clipVisionCompatible,
          selected: clipVisionModel,
          availableCount: clipVisionModels.length,
          detail: clipVisionCompatible
            ? "The encoder matches the selected IP-Adapter family."
            : this.configuredClipVision && !clipVisionModel
              ? `Configured model not found: ${this.configuredClipVision}.`
              : "No matching CLIP Vision encoder was detected.",
          installLocation: "ComfyUI/models/clip_vision",
        }),
        dependency({
          id: "controlnet-nodes",
          label: "ControlNet nodes",
          ready: controlNetMissing.length === 0,
          selected:
            controlNetMissing.length === 0
              ? `${CONTROLNET_NODES.length} nodes`
              : null,
          availableCount: CONTROLNET_NODES.length - controlNetMissing.length,
          detail:
            controlNetMissing.length === 0
              ? "The standard ControlNet loader and advanced apply node are available."
              : `Missing: ${controlNetMissing.join(", ")}.`,
          installLocation: null,
        }),
        dependency({
          id: "openpose-model",
          label: "SDXL OpenPose ControlNet",
          ready: openPoseCompatible,
          selected: openPoseModel,
          availableCount: controlNetModels.length,
          detail: openPoseCompatible
            ? "An SDXL OpenPose-compatible control model is selected."
            : this.configuredOpenPose && !openPoseModel
              ? `Configured model not found: ${this.configuredOpenPose}.`
              : "No SDXL OpenPose ControlNet model was detected.",
          installLocation: "ComfyUI/models/controlnet",
        }),
      ];
      const missing = dependencies
        .filter((entry) => !entry.ready)
        .map((entry) => entry.label);

      return {
        provider: "comfyui",
        ready: missing.length === 0,
        endpoint: this.endpoint,
        checkedAt: new Date().toISOString(),
        dependencies,
        missing,
      };
    } catch (error) {
      return unavailableDependencies(this.endpoint, error);
    }
  }

  async generate(
    request: CharacterCanonicalPoseGenerationRequest,
  ): Promise<GeneratedCharacterCanonicalPose> {
    if (request.identityImage.length === 0) {
      throw new CharacterCanonicalPoseGenerationError(
        "The approved identity-anchor image is empty.",
      );
    }

    const status = await this.getStatus();

    if (!status.ready) {
      throw new CharacterCanonicalPoseGenerationError(
        status.error ??
          `Canonical-pose stack is not ready. Missing: ${status.missing.join(", ")}.`,
      );
    }

    const checkpoint = selectedDependency(status, "checkpoint");
    const ipAdapterModel = selectedDependency(status, "ipadapter-model");
    const clipVisionModel = selectedDependency(status, "clip-vision-model");
    const controlNetModel = selectedDependency(status, "openpose-model");
    const poseGuide = createCanonicalAPoseGuide(this.width, this.height);
    const poseGuideSha256 = createHash("sha256")
      .update(poseGuide)
      .digest("hex");
    const identityUpload = await this.uploadImage({
      bytes: request.identityImage,
      mimeType: request.identityMimeType,
      filename: `CharacterForge_${request.projectId}_Identity.${imageExtension(request.identityMimeType)}`,
    });
    const poseUpload = await this.uploadImage({
      bytes: poseGuide,
      mimeType: "image/png",
      filename: `CharacterForge_Canonical_APose_${this.width}x${this.height}.png`,
    });
    const workflow = buildCanonicalPoseWorkflow({
      checkpoint,
      ipAdapterModel,
      clipVisionModel,
      controlNetModel,
      identityImage: uploadedImageName(identityUpload),
      poseImage: uploadedImageName(poseUpload),
      request,
      width: this.width,
      height: this.height,
      steps: this.steps,
      cfg: this.cfg,
      ipAdapterWeight: this.ipAdapterWeight,
      controlNetStrength: this.controlNetStrength,
      sampler: this.sampler,
      scheduler: this.scheduler,
    });
    const queueResponse = await fetchForGeneration(
      this.fetchImpl,
      `${this.endpoint}/prompt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: randomUUID(), prompt: workflow }),
      },
      30_000,
    );

    if (!queueResponse.ok) {
      const detail = await responseDetail(queueResponse);
      throw new CharacterCanonicalPoseGenerationError(
        `ComfyUI rejected the canonical A-pose workflow with status ${queueResponse.status}${detail ? `: ${detail}` : "."}`,
      );
    }

    const queued = (await queueResponse.json()) as {
      prompt_id?: unknown;
      error?: unknown;
      node_errors?: unknown;
    };

    if (typeof queued.prompt_id !== "string" || !queued.prompt_id) {
      const detail = queued.error ?? queued.node_errors;
      throw new CharacterCanonicalPoseGenerationError(
        detail
          ? `ComfyUI returned no prompt ID: ${JSON.stringify(detail).slice(0, 1_000)}`
          : "ComfyUI returned no prompt ID for the canonical A-pose workflow.",
      );
    }

    const image = await this.waitForImage(queued.prompt_id);
    const query = new URLSearchParams({
      filename: image.filename,
      subfolder: image.subfolder ?? "",
      type: image.type ?? "output",
    });
    const imageResponse = await fetchForGeneration(
      this.fetchImpl,
      `${this.endpoint}/view?${query.toString()}`,
      { method: "GET" },
      60_000,
    );

    if (!imageResponse.ok) {
      throw new CharacterCanonicalPoseGenerationError(
        `ComfyUI generated the A-pose but image retrieval failed with status ${imageResponse.status}.`,
      );
    }

    const bytes = new Uint8Array(await imageResponse.arrayBuffer());

    if (bytes.length === 0) {
      throw new CharacterCanonicalPoseGenerationError(
        "ComfyUI returned an empty canonical A-pose image.",
      );
    }

    return {
      bytes,
      mimeType: outputMimeType(
        imageResponse.headers.get("Content-Type"),
        image.filename,
      ),
      provider: "comfyui",
      width: this.width,
      height: this.height,
      checkpoint,
      ipAdapterModel,
      clipVisionModel,
      controlNetModel,
      poseGuideSha256,
      ipAdapterWeight: this.ipAdapterWeight,
      controlNetStrength: this.controlNetStrength,
      steps: this.steps,
      cfg: this.cfg,
      sampler: this.sampler,
      scheduler: this.scheduler,
    };
  }

  private async uploadImage({
    bytes,
    mimeType,
    filename,
  }: {
    bytes: Uint8Array;
    mimeType: "image/png" | "image/jpeg" | "image/webp";
    filename: string;
  }): Promise<ComfyUpload> {
    const form = new FormData();
    const uploadBytes = new Uint8Array(bytes.length);
    uploadBytes.set(bytes);
    form.append(
      "image",
      new Blob([uploadBytes.buffer], { type: mimeType }),
      filename,
    );
    form.append("type", "input");
    form.append("overwrite", "true");
    const response = await fetchForGeneration(
      this.fetchImpl,
      `${this.endpoint}/upload/image`,
      { method: "POST", body: form },
      60_000,
    );

    if (!response.ok) {
      const detail = await responseDetail(response);
      throw new CharacterCanonicalPoseGenerationError(
        `ComfyUI image upload failed with status ${response.status}${detail ? `: ${detail}` : "."}`,
      );
    }

    const upload = (await response.json()) as Partial<ComfyUpload>;
    if (typeof upload.name !== "string" || !upload.name) {
      throw new CharacterCanonicalPoseGenerationError(
        "ComfyUI accepted an image upload but returned no filename.",
      );
    }

    return {
      name: upload.name,
      subfolder: upload.subfolder,
      type: upload.type,
    };
  }

  private async waitForImage(promptId: string): Promise<ComfyHistoryImage> {
    const deadline = Date.now() + this.timeoutMs;

    while (Date.now() < deadline) {
      const response = await fetchForGeneration(
        this.fetchImpl,
        `${this.endpoint}/history/${encodeURIComponent(promptId)}`,
        { method: "GET" },
        15_000,
      );

      if (!response.ok) {
        throw new CharacterCanonicalPoseGenerationError(
          `ComfyUI canonical-pose history failed with status ${response.status}.`,
        );
      }

      const history = (await response.json()) as Record<
        string,
        ComfyHistoryEntry
      >;
      const entry = history[promptId];

      if (entry) {
        const image = findHistoryImage(entry);
        if (image) return image;

        if (entry.status?.status_str === "error") {
          throw new CharacterCanonicalPoseGenerationError(
            `ComfyUI failed during canonical A-pose generation: ${historyError(entry)}`,
          );
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }

    throw new CharacterCanonicalPoseGenerationError(
      `ComfyUI did not finish the canonical A-pose within ${Math.round(this.timeoutMs / 1_000)} seconds.`,
    );
  }
}

export function createCharacterCanonicalPoseProvider(): CharacterCanonicalPoseProviderClient {
  return new ComfyUiCanonicalPoseProvider();
}
