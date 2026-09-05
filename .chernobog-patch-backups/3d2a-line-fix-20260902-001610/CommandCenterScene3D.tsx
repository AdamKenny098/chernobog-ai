"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type HierarchyFocusDetail = {
  id: string;
  kind: string;
};

function AmbientField() {
  const positions = useMemo(() => {
    const pointCount = 160;
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
  const geometry = useMemo(() => {
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

    return new THREE.BufferGeometry().setFromPoints([
      ...upper.getPoints(72),
      ...lower.getPoints(72),
    ]);
  }, []);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color="#c97835"
        transparent
        opacity={0.52}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </line>
  );
}

function ProceduralCore({ isRootCore }: { isRootCore: boolean }) {
  const reduceMotion = useReducedMotion();
  const root = useRef<THREE.Group>(null);
  const outerRing = useRef<THREE.Mesh>(null);
  const middleRing = useRef<THREE.Mesh>(null);
  const innerRing = useRef<THREE.Mesh>(null);
  const pupilMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const irisMaterial = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }, delta) => {
    const targetScale = isRootCore ? 1 : 0.42;

    if (root.current) {
      const currentScale = root.current.scale.x;
      const nextScale = THREE.MathUtils.damp(
        currentScale,
        targetScale,
        5.5,
        delta,
      );
      root.current.scale.setScalar(nextScale);
      root.current.position.z = THREE.MathUtils.damp(
        root.current.position.z,
        isRootCore ? 0 : -1.8,
        5.5,
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
        intensity={isRootCore ? 4.2 : 1.1}
        distance={7}
      />
    </group>
  );
}

function OrbitalScaffold({ isRootCore }: { isRootCore: boolean }) {
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

      <ProceduralCore isRootCore={isRootCore} />
    </>
  );
}

export function CommandCenterScene3D() {
  const [isRootCore, setIsRootCore] = useState(true);

  useEffect(() => {
    function handleHierarchyFocus(event: Event) {
      const detail = (event as CustomEvent<HierarchyFocusDetail>).detail;
      setIsRootCore(detail?.kind === "core");
    }

    window.addEventListener("chernobog:hierarchy-focus", handleHierarchyFocus);

    return () => {
      window.removeEventListener(
        "chernobog:hierarchy-focus",
        handleHierarchyFocus,
      );
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
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
        <OrbitalScaffold isRootCore={isRootCore} />
      </Canvas>
    </div>
  );
}
