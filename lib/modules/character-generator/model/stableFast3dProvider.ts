export type CharacterModelDependencyId =
  | "service"
  | "backend"
  | "model"
  | "cuda"
  | "vram"
  | "glb-export";

export type CharacterModelDependencyStatus = {
  id: CharacterModelDependencyId;
  label: string;
  ready: boolean;
  selected: string | null;
  detail: string;
  installLocation: string | null;
};

export type CharacterModelProviderStatus = {
  provider: "stable-fast-3d";
  ready: boolean;
  endpoint: string;
  checkedAt: string;
  dependencies: CharacterModelDependencyStatus[];
  missing: string[];
  error?: string;
};

export type StableFast3dProviderOptions = {
  endpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  generationTimeoutMs?: number;
};

export type CharacterModelGenerationRequest = {
  imageBytes: Uint8Array;
  imageMimeType: "image/png" | "image/jpeg" | "image/webp";
  sourceSha256: string;
  textureResolution: 1024 | 2048;
  remeshMode: "triangle";
  targetVertexCount: number;
  foregroundRatio: 0.85;
};

export type GeneratedCharacterModel = {
  bytes: Uint8Array;
  provider: "stable-fast-3d";
  providerVersion: string | null;
  model: "stabilityai/stable-fast-3d";
  sourceSha256: string;
  textureResolution: 1024 | 2048;
  remeshMode: "triangle";
  targetVertexCount: number;
  foregroundRatio: 0.85;
  generationSeconds: number | null;
  topology: {
    vertices: number | null;
    triangles: number | null;
    materials: number | null;
  };
};

export interface CharacterModelProviderClient {
  getStatus(): Promise<CharacterModelProviderStatus>;
  generate(
    request: CharacterModelGenerationRequest,
  ): Promise<GeneratedCharacterModel>;
}

type StableFast3dHealth = {
  service: "chernobog-sf3d";
  apiVersion: 1;
  ready: boolean;
  backend: "stable-fast-3d";
  backendVersion: string | null;
  modelLoaded: boolean;
  model: string | null;
  device: "cuda" | "cpu";
  gpu: {
    name: string;
    vramTotalMb: number;
  } | null;
  capabilities: {
    imageTo3d: boolean;
    glbExport: boolean;
    textureBaking: boolean;
    remeshModes: string[];
  };
  error: string | null;
};

const DEFAULT_ENDPOINT = "http://127.0.0.1:8190";
const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_GENERATION_TIMEOUT_MS = 12 * 60 * 1_000;
const MINIMUM_VRAM_MB = 6_144;
const BACKEND_MODEL = "stabilityai/stable-fast-3d";

function endpointFromEnvironment(): string {
  return (process.env.CHERNOBOG_3D_URL?.trim() || DEFAULT_ENDPOINT).replace(
    /\/+$/,
    "",
  );
}

function dependency(
  value: CharacterModelDependencyStatus,
): CharacterModelDependencyStatus {
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalIntegerHeader(response: Response, name: string): number | null {
  const value = response.headers.get(name);

  if (value === null || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function optionalNumberHeader(response: Response, name: string): number | null {
  const value = response.headers.get(name);

  if (value === null || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

async function responseErrorDetail(response: Response): Promise<string> {
  try {
    const value = (await response.json()) as unknown;
    return isRecord(value) && typeof value.error === "string"
      ? `: ${value.error}`
      : ".";
  } catch {
    return ".";
  }
}

function isStableFast3dHealth(value: unknown): value is StableFast3dHealth {
  if (!isRecord(value) || !isRecord(value.capabilities)) {
    return false;
  }

  const capabilities = value.capabilities;
  const gpu = value.gpu;

  return (
    value.service === "chernobog-sf3d" &&
    value.apiVersion === 1 &&
    typeof value.ready === "boolean" &&
    value.backend === "stable-fast-3d" &&
    (typeof value.backendVersion === "string" ||
      value.backendVersion === null) &&
    typeof value.modelLoaded === "boolean" &&
    (typeof value.model === "string" || value.model === null) &&
    (value.device === "cuda" || value.device === "cpu") &&
    (gpu === null ||
      (isRecord(gpu) &&
        typeof gpu.name === "string" &&
        typeof gpu.vramTotalMb === "number")) &&
    typeof capabilities.imageTo3d === "boolean" &&
    typeof capabilities.glbExport === "boolean" &&
    typeof capabilities.textureBaking === "boolean" &&
    Array.isArray(capabilities.remeshModes) &&
    capabilities.remeshModes.every((entry) => typeof entry === "string") &&
    (typeof value.error === "string" || value.error === null)
  );
}

function unavailableStatus(
  endpoint: string,
  checkedAt: string,
  message: string,
): CharacterModelProviderStatus {
  const dependencies: CharacterModelDependencyStatus[] = [
    dependency({
      id: "service",
      label: "Local 3D service",
      ready: false,
      selected: endpoint,
      detail:
        "The Chernobog Stable Fast 3D sidecar did not answer its health endpoint.",
      installLocation: "tools\\stable-fast-3d",
    }),
    dependency({
      id: "backend",
      label: "Stable Fast 3D backend",
      ready: false,
      selected: null,
      detail:
        "Backend identity cannot be verified until the local service is running.",
      installLocation: "tools\\stable-fast-3d\\stable-fast-3d",
    }),
    dependency({
      id: "model",
      label: "SF3D model weights",
      ready: false,
      selected: null,
      detail:
        "The service has not confirmed that the image-to-3D weights are loaded.",
      installLocation:
        "Hugging Face cache (downloaded by the local SF3D setup)",
    }),
    dependency({
      id: "cuda",
      label: "CUDA execution",
      ready: false,
      selected: null,
      detail: "GPU execution cannot be verified while the service is offline.",
      installLocation: null,
    }),
    dependency({
      id: "vram",
      label: "GPU memory",
      ready: false,
      selected: null,
      detail: `At least ${MINIMUM_VRAM_MB} MB is required for the shipped one-image profile.`,
      installLocation: null,
    }),
    dependency({
      id: "glb-export",
      label: "Textured GLB export",
      ready: false,
      selected: null,
      detail:
        "UV, texture-baking, and GLB export capabilities are not yet reported.",
      installLocation: null,
    }),
  ];

  return {
    provider: "stable-fast-3d",
    ready: false,
    endpoint,
    checkedAt,
    dependencies,
    missing: dependencies.map((entry) => entry.label),
    error: message,
  };
}

function statusFromHealth(
  endpoint: string,
  checkedAt: string,
  health: StableFast3dHealth,
): CharacterModelProviderStatus {
  const modelReady = health.modelLoaded && health.model === BACKEND_MODEL;
  const cudaReady = health.device === "cuda";
  const vramReady =
    health.gpu !== null && health.gpu.vramTotalMb >= MINIMUM_VRAM_MB;
  const exportReady =
    health.capabilities.imageTo3d &&
    health.capabilities.glbExport &&
    health.capabilities.textureBaking &&
    health.capabilities.remeshModes.includes("triangle");

  const dependencies: CharacterModelDependencyStatus[] = [
    dependency({
      id: "service",
      label: "Local 3D service",
      ready: true,
      selected: endpoint,
      detail: "The Chernobog Stable Fast 3D sidecar is reachable.",
      installLocation: null,
    }),
    dependency({
      id: "backend",
      label: "Stable Fast 3D backend",
      ready: true,
      selected: health.backendVersion
        ? `${health.backend} ${health.backendVersion}`
        : health.backend,
      detail: "The service implements Chernobog image-to-3D API version 1.",
      installLocation: null,
    }),
    dependency({
      id: "model",
      label: "SF3D model weights",
      ready: modelReady,
      selected: health.model,
      detail: modelReady
        ? "The required Stable Fast 3D weights are loaded."
        : `Expected the loaded model to be ${BACKEND_MODEL}.`,
      installLocation: modelReady
        ? null
        : "Hugging Face cache (downloaded by the local SF3D setup)",
    }),
    dependency({
      id: "cuda",
      label: "CUDA execution",
      ready: cudaReady,
      selected: health.device,
      detail: cudaReady
        ? `GPU execution is active${health.gpu ? ` on ${health.gpu.name}` : ""}.`
        : "The backend must use CUDA; CPU generation is not enabled for this stage.",
      installLocation: null,
    }),
    dependency({
      id: "vram",
      label: "GPU memory",
      ready: vramReady,
      selected: health.gpu ? `${health.gpu.vramTotalMb} MB` : null,
      detail: vramReady
        ? `The GPU meets the ${MINIMUM_VRAM_MB} MB local profile minimum.`
        : `At least ${MINIMUM_VRAM_MB} MB is required for the shipped one-image profile.`,
      installLocation: null,
    }),
    dependency({
      id: "glb-export",
      label: "Textured GLB export",
      ready: exportReady,
      selected: exportReady
        ? "UV + baked texture + GLB + triangle remesh"
        : null,
      detail: exportReady
        ? "The backend can return the rigging-stage GLB contract."
        : "Image-to-3D, texture baking, GLB export, and triangle remeshing are required.",
      installLocation: null,
    }),
  ];
  const missing = dependencies
    .filter((entry) => !entry.ready)
    .map((entry) => entry.label);

  return {
    provider: "stable-fast-3d",
    ready: health.ready && missing.length === 0,
    endpoint,
    checkedAt,
    dependencies,
    missing,
    ...(!health.ready
      ? {
          error:
            health.error ??
            (missing.length === 0
              ? "The local service is healthy but has not declared itself ready."
              : "The local service has not completed every readiness check."),
        }
      : {}),
  };
}

export class StableFast3dProvider implements CharacterModelProviderClient {
  readonly id = "stable-fast-3d" as const;

  private readonly endpoint: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly generationTimeoutMs: number;

  constructor(options: StableFast3dProviderOptions = {}) {
    this.endpoint = (options.endpoint ?? endpointFromEnvironment()).replace(
      /\/+$/,
      "",
    );
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.generationTimeoutMs =
      options.generationTimeoutMs ?? DEFAULT_GENERATION_TIMEOUT_MS;
  }

  async getStatus(): Promise<CharacterModelProviderStatus> {
    const checkedAt = new Date().toISOString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.endpoint}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        return unavailableStatus(
          this.endpoint,
          checkedAt,
          `Local 3D service returned HTTP ${response.status}.`,
        );
      }

      const health = (await response.json()) as unknown;

      if (!isStableFast3dHealth(health)) {
        return unavailableStatus(
          this.endpoint,
          checkedAt,
          "Local 3D service returned an incompatible health contract.",
        );
      }

      return statusFromHealth(this.endpoint, checkedAt, health);
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? `Local 3D service did not answer within ${this.timeoutMs} ms.`
          : `Local 3D service is not reachable at ${this.endpoint}.`;

      return unavailableStatus(this.endpoint, checkedAt, message);
    } finally {
      clearTimeout(timeout);
    }
  }

  async generate(
    request: CharacterModelGenerationRequest,
  ): Promise<GeneratedCharacterModel> {
    const controller = new AbortController();
    const requestBody = new ArrayBuffer(request.imageBytes.byteLength);
    new Uint8Array(requestBody).set(request.imageBytes);
    const timeout = setTimeout(
      () => controller.abort(),
      this.generationTimeoutMs,
    );

    try {
      const response = await this.fetchImpl(`${this.endpoint}/generate`, {
        method: "POST",
        headers: {
          Accept: "model/gltf-binary",
          "Content-Type": request.imageMimeType,
          "X-Chernobog-Source-Sha256": request.sourceSha256,
          "X-Chernobog-Texture-Resolution": String(request.textureResolution),
          "X-Chernobog-Remesh-Mode": request.remeshMode,
          "X-Chernobog-Target-Vertex-Count": String(
            request.targetVertexCount,
          ),
          "X-Chernobog-Foreground-Ratio": String(request.foregroundRatio),
        },
        body: requestBody,
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `Local 3D generation returned HTTP ${response.status}${await responseErrorDetail(response)}`,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().startsWith("model/gltf-binary")) {
        throw new Error(
          "Local 3D generation returned an unexpected artifact type.",
        );
      }

      const sourceSha256 =
        response.headers.get("x-chernobog-source-sha256") ?? "";
      const textureResolution = optionalIntegerHeader(
        response,
        "x-chernobog-texture-resolution",
      );
      const remeshMode = response.headers.get("x-chernobog-remesh-mode");
      const targetVertexCount = optionalIntegerHeader(
        response,
        "x-chernobog-target-vertex-count",
      );
      const foregroundRatio = optionalNumberHeader(
        response,
        "x-chernobog-foreground-ratio",
      );

      if (
        sourceSha256 !== request.sourceSha256 ||
        textureResolution !== request.textureResolution ||
        remeshMode !== request.remeshMode ||
        targetVertexCount !== request.targetVertexCount ||
        foregroundRatio !== request.foregroundRatio
      ) {
        throw new Error(
          "Local 3D generation returned provenance that does not match the submitted canonical source and settings.",
        );
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0) {
        throw new Error("Local 3D generation returned an empty GLB artifact.");
      }

      return {
        bytes,
        provider: "stable-fast-3d",
        providerVersion:
          response.headers.get("x-chernobog-backend-version") || null,
        model: BACKEND_MODEL,
        sourceSha256,
        textureResolution,
        remeshMode,
        targetVertexCount,
        foregroundRatio: 0.85,
        generationSeconds: optionalNumberHeader(
          response,
          "x-chernobog-generation-seconds",
        ),
        topology: {
          vertices: optionalIntegerHeader(response, "x-chernobog-vertices"),
          triangles: optionalIntegerHeader(response, "x-chernobog-triangles"),
          materials: optionalIntegerHeader(response, "x-chernobog-materials"),
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Local 3D generation did not finish within ${Math.round(this.generationTimeoutMs / 60_000)} minutes.`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function getCharacterModelProviderStatus(): Promise<CharacterModelProviderStatus> {
  return new StableFast3dProvider().getStatus();
}

export function createCharacterModelProvider(): CharacterModelProviderClient {
  return new StableFast3dProvider();
}
