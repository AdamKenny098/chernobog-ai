"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "framer-motion";
import { useMemo, useRef } from "react";
import * as THREE from "three";

function AmbientField() {
  const positions = useMemo(() => {
    const pointCount = 140;
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
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
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

function OrbitalScaffold() {
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

        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.075, 0.085, 64]} />
          <meshBasicMaterial
            color="#ff9d2e"
            transparent
            opacity={0.72}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  );
}

export function CommandCenterScene3D() {
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
        <OrbitalScaffold />
      </Canvas>
    </div>
  );
}
