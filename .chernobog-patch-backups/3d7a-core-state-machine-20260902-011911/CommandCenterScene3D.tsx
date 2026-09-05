"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CommandHierarchyNode } from "./commandHierarchy";

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

const CHERNOBOG_CORE_MODEL_URL = "/models/chernobog/chernobog-core.glb";

function BespokeChernobogCore({ active }: { active: boolean }) {
  const reduceMotion = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(CHERNOBOG_CORE_MODEL_URL);

  const model = useMemo(() => {
    const clone = scene.clone(true);

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

  const { actions } = useAnimations(animations, root);

  useEffect(() => {
    const actionNames = Object.keys(actions);
    const idleName =
      actionNames.find((name) => name.toLowerCase() === "idle") ??
      actionNames.find((name) => name.toLowerCase().includes("idle")) ??
      actionNames[0];

    const idleAction = idleName ? actions[idleName] : undefined;

    if (!idleAction) {
      return;
    }

    idleAction.reset().fadeIn(0.3).play();

    return () => {
      idleAction.fadeOut(0.2);
    };
  }, [actions]);

  useFrame(({ clock }, delta) => {
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
      active
        ? reduceMotion
          ? 0
          : Math.sin(clock.elapsedTime * 0.22) * 0.055
        : -0.25,
      damping,
      delta,
    );
  });

  return (
    <group ref={root}>
      <primitive object={model} />
      <pointLight
        position={[0, 0, 1.5]}
        color="#ff6f19"
        intensity={active ? 3.4 : 0.18}
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

  useFrame((_, delta) => {
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
        <BespokeChernobogCore active={current.kind === "core"} />
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
