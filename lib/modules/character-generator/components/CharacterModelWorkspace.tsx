"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { CharacterModelProviderStatus } from "../model/stableFast3dProvider";
import type {
  CharacterCanonicalPose,
  CharacterModelAction,
  CharacterModelAsset,
  CharacterProject,
  CharacterProjectStatus,
} from "../types";
import styles from "./characterForge.module.css";

type ModelResponse = {
  ok: boolean;
  error?: string;
  project?: CharacterProject;
  provider?: CharacterModelProviderStatus;
};

const MODEL_STATUSES = new Set<CharacterProjectStatus>([
  "canonical_pose_ready",
  "model_generating",
  "model_ready",
  "rigged",
  "validated",
  "exported",
]);

async function readModelResponse(response: Response): Promise<ModelResponse> {
  const result = (await response.json()) as ModelResponse;

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Local 3D request failed.");
  }

  return result;
}

function displayCount(value: number | null): string {
  return value === null ? "Not reported" : value.toLocaleString("en-IE");
}

function disposeModel(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) {
          value.dispose();
        }
      }

      material.dispose();
    }
  });
}

function CharacterModelViewer({
  source,
  projectName,
}: {
  source: string;
  projectName: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    let mounted = true;
    let animationFrame = 0;
    let modelRoot: THREE.Object3D | null = null;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.className = styles.modelViewerCanvas;
    viewport.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.7;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xffe3ba, 0x18110d, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xd77a43, 2.1);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    const resize = () => {
      const width = Math.max(viewport.clientWidth, 1);
      const height = Math.max(viewport.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    resize();

    new GLTFLoader().load(
      source,
      (gltf) => {
        if (!mounted) {
          disposeModel(gltf.scene);
          return;
        }

        modelRoot = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(modelRoot);
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        modelRoot.position.sub(center);
        scene.add(modelRoot);

        const radius = Math.max(size.length() * 0.5, 0.25);
        camera.near = Math.max(radius / 100, 0.01);
        camera.far = Math.max(radius * 100, 100);
        camera.position.set(radius * 1.45, radius * 0.65, radius * 2.3);
        camera.updateProjectionMatrix();
        controls.minDistance = radius * 0.35;
        controls.maxDistance = radius * 8;
        controls.update();
        setReady(true);
      },
      undefined,
      () => {
        if (mounted) {
          setLoadError(
            "The local viewer could not load this GLB. Use Download GLB and send the service output if the file also fails in Blender.",
          );
        }
      },
    );

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      mounted = false;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      controls.dispose();
      if (modelRoot) {
        scene.remove(modelRoot);
        disposeModel(modelRoot);
      }
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [source]);

  return (
    <div className={styles.modelViewerShell}>
      {loadError ? (
        <div className={styles.warningMessage}>{loadError}</div>
      ) : null}
      <div
        ref={viewportRef}
        className={styles.modelViewerViewport}
        role="img"
        aria-label={`Interactive textured model preview for ${projectName}`}
      >
        {!ready && !loadError ? (
          <div className={styles.modelViewerPlaceholder}>
            Loading local GLB viewer…
          </div>
        ) : null}
      </div>
      <div className={styles.modelViewerHint}>
        Drag to orbit · scroll to zoom · right-drag to pan
      </div>
    </div>
  );
}

export function CharacterModelWorkspace({
  projectId,
  projectName,
  initialStatus,
  initialCanonicalPose,
  initialModelAsset,
}: {
  projectId: string;
  projectName: string;
  initialStatus: CharacterProjectStatus;
  initialCanonicalPose: CharacterCanonicalPose | null;
  initialModelAsset: CharacterModelAsset | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [modelAsset, setModelAsset] = useState(initialModelAsset);
  const [provider, setProvider] = useState<CharacterModelProviderStatus | null>(
    null,
  );
  const [checking, setChecking] = useState(
    initialStatus === "canonical_pose_ready",
  );
  const [workingAction, setWorkingAction] = useState<
    "generate" | CharacterModelAction | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const endpoint = `/api/character-generator/projects/${encodeURIComponent(projectId)}/model`;
  const fileEndpoint = `${endpoint}/file${modelAsset ? `?v=${modelAsset.sha256}` : ""}`;

  const applyProject = useCallback((project: CharacterProject) => {
    setStatus(project.status);
    setModelAsset(project.modelAsset);
  }, []);

  const checkProvider = useCallback(
    async (showSuccess: boolean) => {
      setChecking(true);
      setError(null);
      setSuccess(null);

      try {
        const result = await readModelResponse(
          await fetch(endpoint, { method: "GET" }),
        );

        if (result.project) {
          applyProject(result.project);
        }

        if (result.provider) {
          setProvider(result.provider);

          if (showSuccess) {
            setSuccess(
              result.provider.ready
                ? "The local image-to-3D stack is ready to generate."
                : "Readiness refreshed. Install only the components reported below.",
            );
          }
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Local 3D readiness check failed.",
        );
      } finally {
        setChecking(false);
      }
    },
    [applyProject, endpoint],
  );

  useEffect(() => {
    if (initialStatus !== "canonical_pose_ready") {
      return;
    }

    const controller = new AbortController();

    void fetch(endpoint, {
      method: "GET",
      signal: controller.signal,
    })
      .then(readModelResponse)
      .then((result) => {
        if (result.provider) {
          setProvider(result.provider);
        }
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Local 3D readiness check failed.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setChecking(false);
        }
      });

    return () => controller.abort();
  }, [endpoint, initialStatus]);

  async function generateModel() {
    setWorkingAction("generate");
    setStatus("model_generating");
    setError(null);
    setSuccess(null);

    try {
      const result = await readModelResponse(
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate" }),
        }),
      );

      if (result.project) {
        applyProject(result.project);
      }

      setSuccess(
        "The textured GLB was generated, validated, and stored. Review it from every angle before approval.",
      );
      router.refresh();
    } catch (requestError) {
      setStatus("canonical_pose_ready");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Character model generation failed.",
      );
    } finally {
      setWorkingAction(null);
    }
  }

  async function runAction(action: CharacterModelAction) {
    setWorkingAction(action);
    setError(null);
    setSuccess(null);

    try {
      const result = await readModelResponse(
        await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }),
      );

      if (result.project) {
        applyProject(result.project);
      }

      setSuccess(
        action === "approve"
          ? "Model approved and locked as the rigging source."
          : action === "reject"
            ? "Model rejected. The approved canonical A-pose remains ready for another generation."
            : "Interrupted generation reset. The approved canonical A-pose remains locked.",
      );
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Character model action failed.",
      );
    } finally {
      setWorkingAction(null);
    }
  }

  if (!MODEL_STATUSES.has(status)) {
    return null;
  }

  if (modelAsset) {
    return (
      <section className={styles.conceptPanel} id="character-model">
        <div className={styles.briefHeader}>
          <div>
            <p className={styles.eyebrow}>CF1H-B / Local reconstruction</p>
            <h2 className={styles.briefTitle}>Review Generated Character Model</h2>
            <p className={styles.mutedText}>
              Inspect silhouette, face, hands, costume layers, back geometry,
              and baked texture alignment. Approval locks this exact GLB and
              source hash for rigging.
            </p>
          </div>
          <span className={styles.statusBadge}>
            {modelAsset.approvedAt ? "approved" : "review required"}
          </span>
        </div>

        <div className={styles.approvalBanner}>
          GLB locked / SHA-256 {modelAsset.sha256.slice(0, 16)}… /{" "}
          {(modelAsset.byteLength / 1_048_576).toFixed(1)} MB / source{" "}
          {modelAsset.sourceCanonicalPoseSha256.slice(0, 16)}…
        </div>

        {error ? <div className={styles.errorMessage}>{error}</div> : null}
        {success ? <div className={styles.successMessage}>{success}</div> : null}

        <CharacterModelViewer source={fileEndpoint} projectName={projectName} />

        <div className={styles.modelMetricGrid}>
          <div>
            <span>Vertices</span>
            <strong>{displayCount(modelAsset.topology.vertices)}</strong>
          </div>
          <div>
            <span>Triangles</span>
            <strong>{displayCount(modelAsset.topology.triangles)}</strong>
          </div>
          <div>
            <span>Materials</span>
            <strong>{displayCount(modelAsset.topology.materials)}</strong>
          </div>
          <div>
            <span>Texture</span>
            <strong>{modelAsset.textureResolution}px</strong>
          </div>
          <div>
            <span>Remesh</span>
            <strong>{modelAsset.remeshMode}</strong>
          </div>
          <div>
            <span>Generation</span>
            <strong>
              {modelAsset.generationSeconds === null
                ? "Not reported"
                : `${modelAsset.generationSeconds.toFixed(1)}s`}
            </strong>
          </div>
        </div>

        {modelAsset.approvedAt ? (
          <div className={styles.successMessage}>
            Model source approved / automatic rigging is next
          </div>
        ) : (
          <div className={styles.warningMessage}>
            Review every side before approval. Rejecting removes only this GLB;
            the approved A-pose remains intact.
          </div>
        )}

        <div className={styles.conceptActionBar}>
          <a
            href={fileEndpoint}
            download={`${projectId}.glb`}
            className={styles.secondaryButton}
          >
            Download GLB
          </a>
          <div className={styles.briefButtons}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void runAction("reject")}
              disabled={workingAction !== null}
            >
              {workingAction === "reject" ? "Rejecting…" : "Reject Model"}
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => void runAction("approve")}
              disabled={workingAction !== null || Boolean(modelAsset.approvedAt)}
            >
              {modelAsset.approvedAt
                ? "Model Approved"
                : workingAction === "approve"
                  ? "Approving…"
                  : "Approve for Rigging"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (status === "model_generating") {
    return (
      <section className={styles.conceptPanel} id="character-model">
        <div className={styles.briefHeader}>
          <div>
            <p className={styles.eyebrow}>CF1H-B / Local reconstruction</p>
            <h2 className={styles.briefTitle}>Generating Textured GLB</h2>
            <p className={styles.mutedText}>
              Stable Fast 3D is removing the background, reconstructing the
              mesh, triangle-remeshing it, unwrapping UVs, and baking the
              texture locally on the RTX 3080.
            </p>
          </div>
          <span className={styles.statusBadge}>generating</span>
        </div>

        {error ? <div className={styles.errorMessage}>{error}</div> : null}
        <div className={styles.warningMessage}>
          Keep Chernobog and the SF3D service window open. The first generation
          can take several minutes.
        </div>

        <div className={styles.conceptActionBar}>
          <span className={styles.gateMarker}>
            {workingAction === "generate"
              ? "Local CUDA generation in progress"
              : "Interrupted generation detected"}
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void runAction("reset-generation")}
            disabled={workingAction !== null}
          >
            Reset Interrupted Generation
          </button>
        </div>
      </section>
    );
  }

  if (status !== "canonical_pose_ready") {
    return (
      <section className={styles.conceptPanel} id="character-model">
        <div className={styles.errorMessage}>
          The project expects a committed model artifact, but none was found.
        </div>
      </section>
    );
  }

  return (
    <section className={styles.conceptPanel} id="character-model">
      <div className={styles.briefHeader}>
        <div>
          <p className={styles.eyebrow}>CF1H-B / Local image-to-3D</p>
          <h2 className={styles.briefTitle}>Generate Textured Character Model</h2>
          <p className={styles.mutedText}>
            Chernobog will send only the approved canonical A-pose to the
            localhost SF3D worker. The response must pass source-provenance and
            GLB 2.0 validation before it can enter project storage.
          </p>
        </div>
        <span className={styles.statusBadge}>
          {checking
            ? "checking"
            : provider?.ready
              ? "ready to generate"
              : "setup required"}
        </span>
      </div>

      {initialCanonicalPose?.approvedAt ? (
        <div className={styles.approvalBanner}>
          Canonical source locked / SHA-256{" "}
          {initialCanonicalPose.sha256.slice(0, 16)}…
        </div>
      ) : (
        <div className={styles.errorMessage}>
          The canonical A-pose is not approved. Model production is blocked.
        </div>
      )}

      {error ? <div className={styles.errorMessage}>{error}</div> : null}
      {success ? <div className={styles.successMessage}>{success}</div> : null}
      {provider?.error ? (
        <div className={styles.errorMessage}>{provider.error}</div>
      ) : null}

      <div className={styles.dependencyGrid}>
        {provider?.dependencies.map((entry) => (
          <article
            key={entry.id}
            className={styles.dependencyCard}
            data-ready={entry.ready}
          >
            <div className={styles.dependencyHeading}>
              <span>{entry.label}</span>
              <strong>{entry.ready ? "Ready" : "Missing"}</strong>
            </div>
            <p>{entry.selected ?? entry.detail}</p>
            {entry.selected ? <small>{entry.detail}</small> : null}
            {entry.installLocation && !entry.ready ? (
              <code>{entry.installLocation}</code>
            ) : null}
          </article>
        )) ?? (
          <div className={styles.dependencyPlaceholder}>
            {checking
              ? "Inspecting the isolated local 3D stack…"
              : "Run the readiness check to inspect local dependencies."}
          </div>
        )}
      </div>

      {provider && !provider.ready ? (
        <div className={styles.warningMessage}>
          Missing: {provider.missing.join(", ")}. Restart the supplied local
          SF3D service after installing this patch, then recheck.
        </div>
      ) : null}

      {provider?.ready ? (
        <div className={styles.successMessage}>
          Generation will use a {initialCanonicalPose ? "locked" : "missing"}
          {" "}source, 0.85 foreground framing, triangle remeshing, and a
          locally baked texture.
        </div>
      ) : null}

      <div className={styles.conceptActionBar}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => void checkProvider(true)}
          disabled={checking || workingAction !== null}
        >
          {checking ? "Checking local 3D stack…" : "Recheck Local 3D Stack"}
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={() => void generateModel()}
          disabled={
            checking ||
            workingAction !== null ||
            !provider?.ready ||
            !initialCanonicalPose?.approvedAt
          }
        >
          {workingAction === "generate"
            ? "Generating Locally…"
            : "Generate Textured GLB"}
        </button>
      </div>
    </section>
  );
}
