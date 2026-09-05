"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { CommandHierarchyNode } from "./commandHierarchy";
import {
  readChernobogCoreState,
  subscribeChernobogCoreState,
  type ChernobogCoreState,
} from "@/lib/chernobog/ui/coreStateBridge";

export type HierarchyTransition = {
  serial: number;
  mode: "initial" | "forward" | "back" | "jump";
  originIndex: number | null;
  depth: number;
};

const ringPositions = [
  { x: 50, y: 8 },
  { x: 78, y: 18 },
  { x: 91, y: 48 },
  { x: 78, y: 78 },
  { x: 50, y: 90 },
  { x: 22, y: 78 },
  { x: 9, y: 48 },
  { x: 22, y: 18 },
];

function getRingWorldPosition(
  viewport: { width: number; height: number },
  index: number,
) {
  const position = ringPositions[index] ?? ringPositions[0];

  return {
    x: ((position.x - 50) / 100) * viewport.width,
    y: ((48 - position.y) / 100) * viewport.height,
  };
}
function AmbientField() {
  const positions = useMemo(() => {
    const pointCount = 180;
    const data = new Float32Array(pointCount * 3);

    for (let index = 0; index < pointCount; index += 1) {
      const angle = index * 2.399963229728653;
      const radius = 3.4 + (index % 19) * 0.16;

      data[index * 3] = Math.cos(angle) * radius;
      data[index * 3 + 1] = Math.sin(angle * 1.17) * 2.55;
      data[index * 3 + 2] = -2.2 - (index % 13) * 0.24;
    }

    return data;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#9a5a2b"
        size={0.025}
        transparent
        opacity={0.28}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

function EyeContour() {
  const lineObject = useMemo(() => {
    const upper = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-2.85, 0, 0),
      new THREE.Vector3(0, 1.22, 0),
      new THREE.Vector3(2.85, 0, 0),
    );
    const lower = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(2.85, 0, 0),
      new THREE.Vector3(0, -1.22, 0),
      new THREE.Vector3(-2.85, 0, 0),
    );

    const geometry = new THREE.BufferGeometry().setFromPoints([
      ...upper.getPoints(72),
      ...lower.getPoints(72),
    ]);

    const material = new THREE.LineBasicMaterial({
      color: "#c97835",
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    return new THREE.Line(geometry, material);
  }, []);

  useEffect(() => {
    return () => {
      lineObject.geometry.dispose();

      if (Array.isArray(lineObject.material)) {
        lineObject.material.forEach((material) => material.dispose());
      } else {
        lineObject.material.dispose();
      }
    };
  }, [lineObject]);

  return <primitive object={lineObject} />;
}

function ProceduralCore({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const outerRing = useRef<THREE.Mesh>(null);
  const middleRing = useRef<THREE.Mesh>(null);
  const innerRing = useRef<THREE.Mesh>(null);
  const pupilMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const irisMaterial = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }, delta) => {
    if (root.current) {
      const targetScale = active ? 1 : 0.19;
      const nextScale = THREE.MathUtils.damp(
        root.current.scale.x,
        targetScale,
        reduceMotion ? 30 : 5.8,
        delta,
      );

      root.current.scale.setScalar(nextScale);
      root.current.position.z = THREE.MathUtils.damp(
        root.current.position.z,
        active ? 0 : -3.4,
        reduceMotion ? 30 : 5.2,
        delta,
      );
      root.current.rotation.y = THREE.MathUtils.damp(
        root.current.rotation.y,
        active ? 0 : -0.28,
        reduceMotion ? 30 : 4.5,
        delta,
      );
    }

    if (reduceMotion) {
      return;
    }

    if (outerRing.current) {
      outerRing.current.rotation.z += delta * 0.08;
      outerRing.current.rotation.x = Math.sin(clock.elapsedTime * 0.22) * 0.08;
    }

    if (middleRing.current) {
      middleRing.current.rotation.z -= delta * 0.11;
      middleRing.current.rotation.y =
        Math.sin(clock.elapsedTime * 0.18) * 0.12;
    }

    if (innerRing.current) {
      innerRing.current.rotation.z += delta * 0.16;
    }

    const pulse = 0.82 + Math.sin(clock.elapsedTime * 1.45) * 0.12;

    if (pupilMaterial.current) {
      pupilMaterial.current.opacity = pulse;
    }

    if (irisMaterial.current) {
      irisMaterial.current.opacity =
        0.16 + Math.sin(clock.elapsedTime * 1.05) * 0.035;
    }
  });

  return (
    <group ref={root}>
      <EyeContour />

      <mesh scale={[1.58, 0.62, 1]}>
        <torusGeometry args={[2.16, 0.012, 8, 180]} />
        <meshBasicMaterial
          color="#7d431d"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={outerRing} rotation={[0.22, 0.1, 0.16]}>
        <torusGeometry args={[1.55, 0.016, 10, 160]} />
        <meshBasicMaterial
          color="#9d5626"
          transparent
          opacity={0.34}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={middleRing} rotation={[0.1, -0.26, -0.1]}>
        <torusGeometry args={[1.28, 0.012, 10, 160]} />
        <meshBasicMaterial
          color="#c06a2c"
          transparent
          opacity={0.38}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={innerRing} rotation={[-0.18, 0.12, 0.2]}>
        <torusGeometry args={[0.98, 0.012, 10, 140]} />
        <meshBasicMaterial
          color="#e58a3c"
          transparent
          opacity={0.46}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0, -0.025]}>
        <circleGeometry args={[0.92, 96]} />
        <meshBasicMaterial
          ref={irisMaterial}
          color="#ff7f24"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0, 0.03]} scale={[0.26, 1.55, 1]}>
        <circleGeometry args={[0.58, 4]} />
        <meshBasicMaterial
          color="#ff9d36"
          transparent
          opacity={0.42}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0, 0.055]} scale={[0.095, 1.32, 1]}>
        <circleGeometry args={[0.58, 4]} />
        <meshBasicMaterial
          ref={pupilMaterial}
          color="#fff1cf"
          transparent
          opacity={0.88}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0, -0.06]}>
        <ringGeometry args={[0.57, 0.6, 96]} />
        <meshBasicMaterial
          color="#f0a154"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <pointLight
        position={[0, 0, 1.6]}
        color="#ff7a22"
        intensity={active ? 4.2 : 0.2}
        distance={7}
      />
    </group>
  );
}

const CHERNOBOG_CORE_MODEL_URL = "/models/chernobog/chernobog-core-3d7d-restpose.glb";

type ChernobogPerformancePhase = "Enter" | "Loop" | "Exit";

const CHERNOBOG_PERFORMANCE_STATE_NAMES: Record<
  ChernobogCoreState,
  string
> = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  routing: "Routing",
  speaking: "Speaking",
  waiting: "Waiting",
  success: "Success",
  failure: "Failure",
};

function getPerformanceClipName(
  state: ChernobogCoreState,
  phase: ChernobogPerformancePhase,
) {
  return `${CHERNOBOG_PERFORMANCE_STATE_NAMES[state]}_${phase}`;
}

function getActionDurationMs(
  action: THREE.AnimationAction | undefined,
) {
  if (!action) {
    return 0;
  }

  return Math.max(1, action.getClip().duration * 1000);
}
function BespokeChernobogCore({
  active,
  transition,
}: {
  active: boolean;
  transition: HierarchyTransition;
}) {
  const reduceMotion = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const coreLight = useRef<THREE.PointLight>(null);
  const [requestedState, setRequestedState] =
    useState<ChernobogCoreState>(() => readChernobogCoreState());
  const [transitionRouting, setTransitionRouting] = useState(false);
  const performanceStateRef = useRef<ChernobogCoreState>("idle");
  const performanceTokenRef = useRef(0);
  const performanceTimersRef = useRef<number[]>([]);
  const idleLifeRef = useRef({
    elapsed: 0,
    nextSaccadeAt: 1.4,
    saccadeStartedAt: -1,
    saccadeDuration: 0.28,
    saccadeX: 0,
    saccadeY: 0,
    nextFocusAt: 4.6,
    focusStartedAt: -1,
    focusDuration: 1.0,
    focusStrength: 0,
    nextOrbitCorrectionAt: 7.5,
    orbitCorrectionStartedAt: -1,
    orbitCorrectionDuration: 2.2,
    orbitCorrectionAmount: 0,
    breathPhase: Math.random() * Math.PI * 2,
  });

  const idlePerformanceNodesRef = useRef<{
    pupil: THREE.Object3D | null;
    iris: THREE.Object3D | null;
    orbit: THREE.Object3D | null;
    energy: THREE.Object3D | null;
  }>({
    pupil: null,
    iris: null,
    orbit: null,
    energy: null,
  });
  const { scene, animations } = useGLTF(CHERNOBOG_CORE_MODEL_URL);

  const model = useMemo(() => {
    const clone = scene.clone(true);

    /*
     * Do not manually rotate the Blender GLB here.
     * glTF export already converts Blender coordinates for Three.js.
     * The previous Math.PI / 2 X rotation turned the authored XY eye
     * plane into XZ, visually collapsing the layered armor into two
     * large slabs and hiding much of the performance motion in depth.
     */

    clone.rotation.x = Math.PI / 2;
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const longestAxis = Math.max(size.x, size.y, size.z, 0.001);
    const normalizationScale = 5.8 / longestAxis;

    clone.scale.setScalar(normalizationScale);
    clone.position.set(
      -center.x * normalizationScale,
      -center.y * normalizationScale,
      -center.z * normalizationScale,
    );

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = true;
      }
    });

    return clone;
  }, [scene]);

  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const performanceActionsRef = useRef<
    Record<string, THREE.AnimationAction>
  >({});
  useEffect(() => {
    idlePerformanceNodesRef.current = {
      pupil: model.getObjectByName("PIVOT_Pupil"),
      iris: model.getObjectByName("PIVOT_Iris"),
      orbit: model.getObjectByName("PIVOT_OrbitSystem"),
      energy: model.getObjectByName("EnergyCore"),
    };

    return () => {
      idlePerformanceNodesRef.current = {
        pupil: null,
        iris: null,
        orbit: null,
        energy: null,
      };
    };
  }, [model]);

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(model);
    const nextActions: Record<string, THREE.AnimationAction> = {};

    for (const clip of animations) {
      nextActions[clip.name] = mixer.clipAction(clip);
    }

    mixer.stopAllAction();
    mixerRef.current = mixer;
    performanceActionsRef.current = nextActions;

    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);

      if (mixerRef.current === mixer) {
        mixerRef.current = null;
        performanceActionsRef.current = {};
      }
    };
  }, [animations, model]);
  const visualState: ChernobogCoreState = transitionRouting
    ? "routing"
    : requestedState;
  useEffect(() => {
    if (visualState !== "idle") {
      return;
    }

    const life = idleLifeRef.current;

    life.elapsed = 0;
    life.nextSaccadeAt = 1.2 + Math.random() * 2.4;
    life.saccadeStartedAt = -1;
    life.saccadeDuration = 0.24 + Math.random() * 0.18;
    life.saccadeX = 0;
    life.saccadeY = 0;
    life.nextFocusAt = 4.0 + Math.random() * 4.0;
    life.focusStartedAt = -1;
    life.focusDuration = 0.8 + Math.random() * 0.7;
    life.focusStrength = 0;
    life.nextOrbitCorrectionAt = 6.0 + Math.random() * 7.0;
    life.orbitCorrectionStartedAt = -1;
    life.orbitCorrectionDuration = 1.6 + Math.random() * 1.6;
    life.orbitCorrectionAmount = 0;
    life.breathPhase = Math.random() * Math.PI * 2;
  }, [visualState]);

  useEffect(() => {
    return subscribeChernobogCoreState(setRequestedState);
  }, []);

  useEffect(() => {
    if (transition.serial === 0) {
      return;
    }

    const startTimeout = window.setTimeout(() => {
      setTransitionRouting(true);
    }, 0);

    const stopTimeout = window.setTimeout(
      () => setTransitionRouting(false),
      reduceMotion ? 100 : 850,
    );

    return () => {
      window.clearTimeout(startTimeout);
      window.clearTimeout(stopTimeout);
    };
  }, [reduceMotion, transition.serial]);

  const stopPerformanceTimers = useCallback(() => {
    for (const timer of performanceTimersRef.current) {
      window.clearTimeout(timer);
    }

    performanceTimersRef.current = [];
  }, []);

  const stopAllPerformanceActions = useCallback(() => {
    const mixer = mixerRef.current;

    if (!mixer) {
      return;
    }

    mixer.stopAllAction();

    for (const action of Object.values(
      performanceActionsRef.current,
    )) {
      action.stop();
      action.reset();
      action.setEffectiveWeight(1);
      action.setEffectiveTimeScale(1);
    }
  }, []);

  useEffect(() => {
    return () => {
      performanceTokenRef.current += 1;
      stopPerformanceTimers();
      stopAllPerformanceActions();
    };
  }, [
    stopAllPerformanceActions,
    stopPerformanceTimers,
  ]);

  const playPerformanceAction = useCallback(
    (
      clipName: string,
      mode: "once" | "loop",
    ) => {
      const mixer = mixerRef.current;
      const action =
        performanceActionsRef.current[clipName];

      if (!mixer || !action) {
        console.warn(
          `[Chernobog Core] Missing performance clip: ${clipName}`,
        );
        return undefined;
      }

      /*
       * Enter/Loop/Exit are authored transitions.
       * Do not blend multiple performances together: doing so can
       * mix incompatible transforms across the mechanical body.
       */
      stopAllPerformanceActions();

      action.enabled = true;
      action.reset();
      action.setEffectiveWeight(1);

      const authoredSpeed =
        clipName === "Idle_Loop" ? 0.62 : 1;

      action.setEffectiveTimeScale(
        reduceMotion ? 0.001 : authoredSpeed,
      );
      action.clampWhenFinished = mode === "once";

      if (mode === "once") {
        action.setLoop(THREE.LoopOnce, 1);
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
      }

      action.play();
      return action;
    },
    [reduceMotion, stopAllPerformanceActions],
  );

  useEffect(() => {
    stopPerformanceTimers();

    const token = ++performanceTokenRef.current;
    const previousState = performanceStateRef.current;
    performanceStateRef.current = visualState;

    const nextLoopName = getPerformanceClipName(
      visualState,
      "Loop",
    );

    if (reduceMotion) {
      playPerformanceAction(nextLoopName, "loop");

      return () => {
        stopPerformanceTimers();
      };
    }

    const enterNextState = () => {
      if (token !== performanceTokenRef.current) {
        return;
      }

      const enterName = getPerformanceClipName(
        visualState,
        "Enter",
      );
      const enterAction = playPerformanceAction(
        enterName,
        "once",
      );
      const enterDuration = getActionDurationMs(enterAction);

      const loopTimer = window.setTimeout(
        () => {
          if (token !== performanceTokenRef.current) {
            return;
          }

          playPerformanceAction(
            nextLoopName,
            "loop",
          );
        },
        Math.max(40, enterDuration - 45),
      );

      performanceTimersRef.current.push(loopTimer);
    };

    if (previousState === visualState) {
      enterNextState();

      return () => {
        stopPerformanceTimers();
      };
    }

    const exitName = getPerformanceClipName(
      previousState,
      "Exit",
    );
    const exitAction = playPerformanceAction(
      exitName,
      "once",
    );
    const exitDuration = getActionDurationMs(exitAction);

    const enterTimer = window.setTimeout(
      enterNextState,
      Math.max(40, exitDuration - 35),
    );

    performanceTimersRef.current.push(enterTimer);

    return () => {
      stopPerformanceTimers();
    };
  }, [
    playPerformanceAction,
    reduceMotion,
    stopPerformanceTimers,
    visualState,
  ]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);
    if (
      active &&
      visualState === "idle" &&
      !reduceMotion
    ) {
      const life = idleLifeRef.current;
      const {
        pupil,
        iris,
        orbit,
        energy,
      } = idlePerformanceNodesRef.current;

      life.elapsed += delta;
      const now = life.elapsed;

      /*
       * Pupil saccades are short and irregular: attention catches,
       * not decorative oscillation.
       */
      if (
        life.saccadeStartedAt < 0 &&
        now >= life.nextSaccadeAt
      ) {
        life.saccadeStartedAt = now;
        life.saccadeDuration =
          0.20 + Math.random() * 0.22;

        const direction =
          Math.random() < 0.5 ? -1 : 1;

        life.saccadeX =
          direction *
          (0.018 + Math.random() * 0.040);
        life.saccadeY =
          (Math.random() - 0.5) * 0.024;
      }

      if (life.saccadeStartedAt >= 0) {
        const progress = THREE.MathUtils.clamp(
          (now - life.saccadeStartedAt) /
            life.saccadeDuration,
          0,
          1,
        );
        const envelope =
          Math.sin(progress * Math.PI);

        if (pupil) {
          pupil.position.x +=
            life.saccadeX * envelope;
          pupil.position.y +=
            life.saccadeY * envelope;
        }

        if (progress >= 1) {
          life.saccadeStartedAt = -1;
          life.nextSaccadeAt =
            now + 1.8 + Math.random() * 4.2;
        }
      }

      /*
       * Rare cognitive focus: restrained contraction.
       */
      if (
        life.focusStartedAt < 0 &&
        now >= life.nextFocusAt
      ) {
        life.focusStartedAt = now;
        life.focusDuration =
          0.75 + Math.random() * 0.9;
        life.focusStrength =
          0.035 + Math.random() * 0.045;
      }

      if (life.focusStartedAt >= 0) {
        const progress = THREE.MathUtils.clamp(
          (now - life.focusStartedAt) /
            life.focusDuration,
          0,
          1,
        );
        const envelope =
          Math.sin(progress * Math.PI);

        if (pupil) {
          pupil.scale.x *=
            1 - life.focusStrength * envelope;
          pupil.scale.y *=
            1 +
            life.focusStrength *
              0.35 *
              envelope;
        }

        if (iris) {
          iris.rotation.z +=
            life.focusStrength *
            0.55 *
            envelope;
        }

        if (progress >= 1) {
          life.focusStartedAt = -1;
          life.nextFocusAt =
            now + 4.0 + Math.random() * 7.0;
        }
      }

      /*
       * Rare large-machine correction.
       */
      if (
        life.orbitCorrectionStartedAt < 0 &&
        now >= life.nextOrbitCorrectionAt
      ) {
        life.orbitCorrectionStartedAt = now;
        life.orbitCorrectionDuration =
          1.5 + Math.random() * 1.8;
        life.orbitCorrectionAmount =
          (Math.random() - 0.5) * 0.085;
      }

      if (
        life.orbitCorrectionStartedAt >= 0
      ) {
        const progress = THREE.MathUtils.clamp(
          (now -
            life.orbitCorrectionStartedAt) /
            life.orbitCorrectionDuration,
          0,
          1,
        );
        const envelope =
          Math.sin(progress * Math.PI);

        if (orbit) {
          orbit.rotation.z +=
            life.orbitCorrectionAmount *
            envelope;
        }

        if (progress >= 1) {
          life.orbitCorrectionStartedAt = -1;
          life.nextOrbitCorrectionAt =
            now + 6.0 + Math.random() * 10.0;
        }
      }

      /*
       * Two unrelated slow frequencies avoid an obvious heartbeat.
       */
      if (energy) {
        const breath =
          Math.sin(
            now * 0.43 +
              life.breathPhase,
          ) *
            0.014 +
          Math.sin(
            now * 0.137 +
              life.breathPhase * 0.37,
          ) *
            0.007;

        energy.scale.multiplyScalar(1 + breath);
      }
    }

    if (!root.current) {
      return;
    }

    const targetScale = active ? 1 : 0.17;
    const damping = reduceMotion ? 30 : 5.5;
    const nextScale = THREE.MathUtils.damp(
      root.current.scale.x,
      targetScale,
      damping,
      delta,
    );

    root.current.scale.setScalar(nextScale);
    root.current.position.z = THREE.MathUtils.damp(
      root.current.position.z,
      active ? 0.15 : -3.8,
      damping,
      delta,
    );
    root.current.rotation.y = THREE.MathUtils.damp(
      root.current.rotation.y,
      active ? 0 : -0.25,
      damping,
      delta,
    );
    root.current.rotation.x = THREE.MathUtils.damp(
      root.current.rotation.x,
      0,
      damping,
      delta,
    );
    root.current.rotation.z = THREE.MathUtils.damp(
      root.current.rotation.z,
      0,
      damping,
      delta,
    );
    if (coreLight.current) {
      const lightByState: Record<ChernobogCoreState, number> = {
        idle: 3.2,
        listening: 4.1,
        thinking: 3.7,
        routing: 4.8,
        speaking: 5.0,
        waiting: 2.5,
        success: 5.7,
        failure: 1.8,
      };

      coreLight.current.intensity = THREE.MathUtils.damp(
        coreLight.current.intensity,
        active ? lightByState[visualState] : 0.18,
        damping,
        delta,
      );
    }
  });

  return (
    <group ref={root}>
      <primitive object={model} />
      <pointLight
        ref={coreLight}
        position={[0, 0, 1.5]}
        color="#ff6f19"
        intensity={3.4}
        distance={7}
      />
    </group>
  );
}

useGLTF.preload(CHERNOBOG_CORE_MODEL_URL);
function CenterAuthority3D({
  node,
  transition,
}: {
  node: CommandHierarchyNode;
  transition: HierarchyTransition;
}) {
  const reduceMotion = useReducedMotion();
  const viewport = useThree((state) => state.viewport);
  const group = useRef<THREE.Group>(null);
  const outer = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const initialized = useRef(false);

  useFrame(({ clock }, delta) => {
    if (!group.current) {
      return;
    }

    if (!initialized.current) {
      if (
        transition.mode === "forward" &&
        transition.originIndex !== null &&
        !reduceMotion
      ) {
        const origin = getRingWorldPosition(
          viewport,
          transition.originIndex,
        );
        group.current.position.set(origin.x, origin.y, -0.6);
        group.current.scale.setScalar(0.7);
      } else if (
        (transition.mode === "back" || transition.mode === "jump") &&
        !reduceMotion
      ) {
        group.current.position.set(0, 0, -1.7);
        group.current.scale.setScalar(0.42);
      } else {
        group.current.position.set(0, 0, 0.45);
        group.current.scale.setScalar(1.55);
      }

      initialized.current = true;
    }

    const damping = reduceMotion ? 30 : 5.6;
    group.current.position.x = THREE.MathUtils.damp(
      group.current.position.x,
      0,
      damping,
      delta,
    );
    group.current.position.y = THREE.MathUtils.damp(
      group.current.position.y,
      0,
      damping,
      delta,
    );
    group.current.position.z = THREE.MathUtils.damp(
      group.current.position.z,
      0.45,
      damping,
      delta,
    );

    const nextScale = THREE.MathUtils.damp(
      group.current.scale.x,
      1.55,
      damping,
      delta,
    );
    group.current.scale.setScalar(nextScale);

    if (!reduceMotion) {
      group.current.rotation.y =
        Math.sin(clock.elapsedTime * 0.32) * 0.14;
      group.current.rotation.x =
        Math.cos(clock.elapsedTime * 0.25) * 0.05;

      if (outer.current) {
        outer.current.rotation.z += delta * 0.18;
      }

      if (inner.current) {
        inner.current.rotation.z -= delta * 0.27;
      }
    }
  });

  const isAgent = node.kind === "agent";

  return (
    <group ref={group}>
      <mesh ref={outer} rotation={[0.48, 0.18, 0.15]}>
        <torusGeometry args={[0.7, 0.025, 10, 92]} />
        <meshBasicMaterial
          color="#c16a2b"
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={inner} rotation={[-0.35, 0.28, -0.2]}>
        <torusGeometry args={[0.5, 0.018, 10, 76]} />
        <meshBasicMaterial
          color="#f09a49"
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[0.38, 0.38, Math.PI / 4]}>
        {isAgent ? (
          <dodecahedronGeometry args={[0.34, 0]} />
        ) : (
          <octahedronGeometry args={[0.38, 0]} />
        )}
        <meshStandardMaterial
          color="#7b3c18"
          emissive="#ff6e18"
          emissiveIntensity={1.2}
          metalness={0.88}
          roughness={0.26}
        />
      </mesh>

      <mesh position={[0, 0, 0.02]} scale={[0.16, 1, 1]}>
        <circleGeometry args={[0.38, 4]} />
        <meshBasicMaterial
          color="#ffc36e"
          transparent
          opacity={0.72}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <pointLight
        color="#ff7620"
        intensity={2.6}
        distance={3}
      />
    </group>
  );
}

function HierarchyNode3D({
  node,
  index,
  hovered,
  transition,
}: {
  node: CommandHierarchyNode;
  index: number;
  hovered: boolean;
  transition: HierarchyTransition;
}) {
  const reduceMotion = useReducedMotion();
  const viewport = useThree((state) => state.viewport);
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const initialized = useRef(false);
  const target = getRingWorldPosition(viewport, index);

  useFrame(({ clock }, delta) => {
    if (!group.current) {
      return;
    }

    if (!initialized.current) {
      if (transition.mode !== "initial" && !reduceMotion) {
        group.current.position.set(0, 0, -0.45);
        group.current.scale.setScalar(0.3);
      } else {
        group.current.position.set(target.x, target.y, 0);
        group.current.scale.setScalar(1);
      }

      initialized.current = true;
    }

    const floatOffset = reduceMotion
      ? 0
      : Math.sin(clock.elapsedTime * 0.7 + index * 0.8) * 0.035;
    const damping = reduceMotion ? 30 : 6.3;

    group.current.position.x = THREE.MathUtils.damp(
      group.current.position.x,
      target.x,
      damping,
      delta,
    );
    group.current.position.y = THREE.MathUtils.damp(
      group.current.position.y,
      target.y + floatOffset,
      damping,
      delta,
    );
    group.current.position.z = THREE.MathUtils.damp(
      group.current.position.z,
      0,
      damping,
      delta,
    );

    const targetScale = hovered ? 1.22 : 1;
    const nextScale = THREE.MathUtils.damp(
      group.current.scale.x,
      targetScale,
      damping,
      delta,
    );
    group.current.scale.setScalar(nextScale);

    if (spin.current && !reduceMotion) {
      spin.current.rotation.z += delta * (0.18 + index * 0.012);
      spin.current.rotation.x += delta * 0.035;
    }
  });

  const statusColor =
    node.status === "attention"
      ? "#ff4937"
      : node.status === "standby"
        ? "#b2692f"
        : "#7ee8a2";

  return (
    <group ref={group}>
      <mesh ref={spin} rotation={[0.55, 0.2, index * 0.18]}>
        <torusGeometry args={[0.31, 0.018, 8, 64]} />
        <meshBasicMaterial
          color={hovered ? "#ffb05a" : "#9c5527"}
          transparent
          opacity={hovered ? 0.86 : 0.52}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[0.38, 0.38, Math.PI / 4]}>
        {node.kind === "agent" ? (
          <dodecahedronGeometry args={[0.18, 0]} />
        ) : (
          <octahedronGeometry args={[0.19, 0]} />
        )}
        <meshStandardMaterial
          color={hovered ? "#f0a35a" : "#633417"}
          emissive={hovered ? "#ff7c22" : "#5c2b10"}
          emissiveIntensity={hovered ? 1.35 : 0.48}
          metalness={0.82}
          roughness={0.32}
        />
      </mesh>

      <mesh position={[0.23, 0.23, 0.13]}>
        <sphereGeometry args={[0.035, 18, 18]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      <pointLight
        color="#ff7620"
        intensity={hovered ? 1.9 : 0.48}
        distance={2.1}
      />
    </group>
  );
}

function CameraFocus({ depth }: { depth: number }) {
  const reduceMotion = useReducedMotion();

  useFrame(({ camera }, delta) => {
    const targetZ = 10.5 - Math.min(depth, 2) * 0.55;

    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      targetZ,
      reduceMotion ? 30 : 4.6,
      delta,
    );
  });

  return null;
}
function OrbitalScaffold({
  current,
  nodes,
  hoveredNodeId,
  transition,
}: {
  current: CommandHierarchyNode;
  nodes: CommandHierarchyNode[];
  hoveredNodeId: string | null;
  transition: HierarchyTransition;
}) {
  const reduceMotion = useReducedMotion();
  const outerGroup = useRef<THREE.Group>(null);
  const innerGroup = useRef<THREE.Group>(null);

  useFrame(({ clock }, delta) => {
    if (reduceMotion) {
      return;
    }

    if (outerGroup.current) {
      outerGroup.current.rotation.z += delta * 0.018;
      outerGroup.current.rotation.y += delta * 0.006;
    }

    if (innerGroup.current) {
      innerGroup.current.rotation.z -= delta * 0.026;
      innerGroup.current.rotation.x += delta * 0.004;
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <CameraFocus depth={transition.depth} />
      <AmbientField />

      <group ref={outerGroup}>
        <mesh rotation={[Math.PI / 2.8, 0, 0.08]} scale={[1.75, 1, 1]}>
          <torusGeometry args={[3.15, 0.008, 6, 160]} />
          <meshBasicMaterial
            color="#7b431c"
            transparent
            opacity={0.22}
            depthWrite={false}
          />
        </mesh>

        <mesh rotation={[Math.PI / 2.25, 0.28, -0.18]} scale={[1.4, 1, 1]}>
          <torusGeometry args={[2.65, 0.006, 6, 160]} />
          <meshBasicMaterial
            color="#a25b27"
            transparent
            opacity={0.13}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group ref={innerGroup}>
        <mesh rotation={[0.35, 0.18, Math.PI / 2.2]} scale={[1.2, 1, 1]}>
          <torusGeometry args={[1.9, 0.006, 6, 128]} />
          <meshBasicMaterial
            color="#c07331"
            transparent
            opacity={0.12}
            depthWrite={false}
          />
        </mesh>
      </group>

      <Suspense
        fallback={<ProceduralCore active={current.kind === "core"} />}
      >
        <BespokeChernobogCore
          active={current.kind === "core"}
          transition={transition}
        />
      </Suspense>

      {current.kind !== "core" ? (
        <CenterAuthority3D
          key={`center-${current.id}-${transition.serial}`}
          node={current}
          transition={transition}
        />
      ) : null}

      {nodes.slice(0, 8).map((node, index) => (
        <HierarchyNode3D
          key={`${current.id}-${node.id}-${transition.serial}`}
          node={node}
          index={index}
          hovered={hoveredNodeId === node.id}
          transition={transition}
        />
      ))}
    </>
  );
}

export function CommandCenterScene3D({
  current,
  nodes,
  hoveredNodeId,
  transition,
}: {
  current: CommandHierarchyNode;
  nodes: CommandHierarchyNode[];
  hoveredNodeId: string | null;
  transition: HierarchyTransition;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-0 z-0 h-[840px] w-full min-w-[920px] max-w-[1680px] -translate-x-1/2"
    >
      <Canvas
        camera={{
          position: [0, 0, 10.5],
          fov: 44,
          near: 0.1,
          far: 60,
        }}
        dpr={[1, 1.5]}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.setClearColor("#020201", 0);
        }}
      >
        <OrbitalScaffold
          current={current}
          nodes={nodes}
          hoveredNodeId={hoveredNodeId}
          transition={transition}
        />
      </Canvas>
    </div>
  );
}
