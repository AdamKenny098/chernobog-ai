import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  readCharacterModelGlb,
  writeCharacterModelGlb,
} from "../lib/modules/character-generator/model/characterModelAssetStore";
import {
  approveCharacterModel,
  generateCharacterModel,
  rejectCharacterModel,
  resetInterruptedCharacterModelGeneration,
} from "../lib/modules/character-generator/model/characterModelService";
import {
  StableFast3dProvider,
  type CharacterModelGenerationRequest,
  type CharacterModelProviderClient,
} from "../lib/modules/character-generator/model/stableFast3dProvider";
import {
  readCharacterProject,
  writeCharacterProject,
} from "../lib/modules/character-generator/projects/characterProjectStore";
import { writeCharacterCanonicalPoseImage } from "../lib/modules/character-generator/source/characterCanonicalPoseAssetStore";
import type {
  CharacterBrief,
  CharacterCanonicalPose,
  CharacterIdentityAnchor,
  CharacterProject,
} from "../lib/modules/character-generator/types";

function health(overrides: Record<string, unknown> = {}) {
  return {
    service: "chernobog-sf3d",
    apiVersion: 1,
    ready: true,
    backend: "stable-fast-3d",
    backendVersion: "test-commit",
    modelLoaded: true,
    model: "stabilityai/stable-fast-3d",
    device: "cuda",
    gpu: { name: "NVIDIA GeForce RTX 3080", vramTotalMb: 10240 },
    capabilities: {
      imageTo3d: true,
      glbExport: true,
      textureBaking: true,
      remeshModes: ["none", "triangle", "quad"],
    },
    error: null,
    ...overrides,
  };
}

function fetchJson(value: unknown): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(value), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch;
}

function generationResponse(
  bytes: Uint8Array,
  request: CharacterModelGenerationRequest,
): Response {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "model/gltf-binary",
      "X-Chernobog-Source-Sha256": request.sourceSha256,
      "X-Chernobog-Backend-Version": "test-commit",
      "X-Chernobog-Texture-Resolution": String(request.textureResolution),
      "X-Chernobog-Remesh-Mode": request.remeshMode,
      "X-Chernobog-Target-Vertex-Count": String(
        request.targetVertexCount,
      ),
      "X-Chernobog-Foreground-Ratio": String(request.foregroundRatio),
      "X-Chernobog-Generation-Seconds": "12.5",
      "X-Chernobog-Vertices": "15000",
      "X-Chernobog-Triangles": "29996",
      "X-Chernobog-Materials": "1",
    },
  });
}

function minimalGlb(): Uint8Array {
  const bytes = new Uint8Array(24);
  const view = new DataView(bytes.buffer);
  bytes.set([0x67, 0x6c, 0x54, 0x46], 0);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.byteLength, true);
  view.setUint32(12, 4, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.set([0x7b, 0x7d, 0x20, 0x20], 20);
  return bytes;
}

async function run(): Promise<void> {
  const readyStatus = await new StableFast3dProvider({
    endpoint: "http://127.0.0.1:8190/",
    fetchImpl: fetchJson(health()),
  }).getStatus();

  assert.equal(readyStatus.ready, true);
  assert.equal(readyStatus.dependencies.length, 6);
  assert.deepEqual(readyStatus.missing, []);
  assert.equal(readyStatus.endpoint, "http://127.0.0.1:8190");

  const lowMemoryStatus = await new StableFast3dProvider({
    fetchImpl: fetchJson(
      health({
        ready: false,
        gpu: { name: "Test GPU", vramTotalMb: 4096 },
        error: "Insufficient GPU memory.",
      }),
    ),
  }).getStatus();

  assert.equal(lowMemoryStatus.ready, false);
  assert.deepEqual(lowMemoryStatus.missing, ["GPU memory"]);
  assert.equal(lowMemoryStatus.error, "Insufficient GPU memory.");

  const incompatibleStatus = await new StableFast3dProvider({
    fetchImpl: fetchJson({ service: "unknown" }),
  }).getStatus();

  assert.equal(incompatibleStatus.ready, false);
  assert.equal(
    incompatibleStatus.dependencies.every((entry) => !entry.ready),
    true,
  );
  assert.match(incompatibleStatus.error ?? "", /incompatible health contract/);

  const generationRequest: CharacterModelGenerationRequest = {
    imageBytes: new Uint8Array([1, 2, 3, 4]),
    imageMimeType: "image/png",
    sourceSha256: "a".repeat(64),
    textureResolution: 1024,
    remeshMode: "triangle",
    targetVertexCount: 12000,
    foregroundRatio: 0.85,
  };
  const generationProvider = new StableFast3dProvider({
    fetchImpl: (async (_input, init) => {
      assert.equal(init?.method, "POST");
      assert.equal(
        (init?.headers as Record<string, string>)[
          "X-Chernobog-Source-Sha256"
        ],
        generationRequest.sourceSha256,
      );
      return generationResponse(minimalGlb(), generationRequest);
    }) as typeof fetch,
  });
  const generated = await generationProvider.generate(generationRequest);

  assert.deepEqual(generated.bytes, minimalGlb());
  assert.equal(generated.sourceSha256, generationRequest.sourceSha256);
  assert.equal(generated.providerVersion, "test-commit");
  assert.deepEqual(generated.topology, {
    vertices: 15000,
    triangles: 29996,
    materials: 1,
  });

  const forgeRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cf1h-assets-"));
  process.env.CHERNOBOG_CHARACTER_FORGE_PATH = forgeRoot;
  const projectId = "character-cf1h-test";

  try {
    const filePath = await writeCharacterModelGlb({
      projectId,
      bytes: minimalGlb(),
    });
    const stored = await readCharacterModelGlb({ projectId, filePath });

    assert.equal(filePath, "model/generated-character.glb");
    assert.deepEqual(stored, Buffer.from(minimalGlb()));

    await assert.rejects(
      writeCharacterModelGlb({
        projectId,
        bytes: new Uint8Array([1, 2, 3]),
      }),
      /too small to be a valid GLB/,
    );
    await assert.rejects(
      readCharacterModelGlb({ projectId, filePath: "../project.json" }),
      /model path is invalid/,
    );

    const canonicalBytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3, 4]);
    const canonicalPath = await writeCharacterCanonicalPoseImage({
      projectId,
      bytes: canonicalBytes,
      mimeType: "image/png",
    });
    const canonicalSha256 = createHash("sha256")
      .update(canonicalBytes)
      .digest("hex");
    const timestamp = new Date().toISOString();
    const identityAnchor = {
      approvedAt: timestamp,
      sha256: "b".repeat(64),
    } as CharacterIdentityAnchor;
    const canonicalPose = {
      approvedAt: timestamp,
      imagePath: canonicalPath,
      imageMimeType: "image/png",
      sha256: canonicalSha256,
      sourceIdentityAnchorSha256: identityAnchor.sha256,
    } as CharacterCanonicalPose;
    const brief = {
      technical: {
        triangleBudget: 30_000,
        textureResolution: 4096,
      },
    } as CharacterBrief;
    const project: CharacterProject = {
      schemaVersion: 1,
      id: projectId,
      name: "CF1H Test",
      originalPrompt: "Test local model generation.",
      status: "canonical_pose_ready",
      brief,
      concepts: [],
      selectedConceptId: null,
      identityAnchor,
      canonicalPose,
      modelAsset: null,
      referenceSheet: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await writeCharacterProject(project);

    const serviceProvider: CharacterModelProviderClient = {
      async getStatus() {
        return readyStatus;
      },
      async generate(request) {
        return {
          bytes: minimalGlb(),
          provider: "stable-fast-3d",
          providerVersion: "test-commit",
          model: "stabilityai/stable-fast-3d",
          sourceSha256: request.sourceSha256,
          textureResolution: request.textureResolution,
          remeshMode: request.remeshMode,
          targetVertexCount: request.targetVertexCount,
          foregroundRatio: request.foregroundRatio,
          generationSeconds: 12.5,
          topology: {
            vertices: 15000,
            triangles: 29996,
            materials: 1,
          },
        };
      },
    };
    const generatedProject = await generateCharacterModel(
      projectId,
      serviceProvider,
    );

    assert.equal(generatedProject?.status, "model_ready");
    assert.equal(generatedProject?.modelAsset?.textureResolution, 1024);
    assert.equal(generatedProject?.modelAsset?.targetTriangleBudget, 30_000);
    assert.equal(generatedProject?.modelAsset?.targetVertexCount, 15_000);
    assert.equal(
      generatedProject?.modelAsset?.sourceCanonicalPoseSha256,
      canonicalSha256,
    );

    const approvedProject = await approveCharacterModel(projectId);
    assert.ok(approvedProject?.modelAsset?.approvedAt);

    const rejectedProject = await rejectCharacterModel(projectId);
    assert.equal(rejectedProject?.status, "canonical_pose_ready");
    assert.equal(rejectedProject?.modelAsset, null);
    assert.equal(
      await readCharacterModelGlb({
        projectId,
        filePath: "model/generated-character.glb",
      }),
      null,
    );

    const interruptedProject = await readCharacterProject(projectId);
    assert.ok(interruptedProject);
    await writeCharacterProject({
      ...interruptedProject!,
      status: "model_generating",
    });
    const resetProject = await resetInterruptedCharacterModelGeneration(
      projectId,
    );
    assert.equal(resetProject?.status, "canonical_pose_ready");
  } finally {
    await fs.rm(forgeRoot, { recursive: true, force: true });
    delete process.env.CHERNOBOG_CHARACTER_FORGE_PATH;
  }

  console.log("CF1H contract tests passed.");
}

void run();
