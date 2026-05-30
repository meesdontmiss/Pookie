import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { staticFile } from 'remotion';

/**
 * PookieBall — Exact replica of the in-game Player/OtherPlayer visual.
 *
 * Two-tone sphere (translucent ice-white top half + colored emissive bottom half)
 * with the POOKIE.glb model sitting inside, matching SumoArenaScene.tsx.
 */

interface PookieBallProps {
  position: [number, number, number];
  rotation?: [number, number, number, number]; // quaternion
  ballColor: string;
  scale?: number;
  showModel?: boolean;
}

const PLAYER_RADIUS = 0.7;
const POOKIE_MODEL_SCALE = 0.25;

export const PookieBall: React.FC<PookieBallProps> = ({
  position,
  rotation,
  ballColor,
  scale = 1,
  showModel = true,
}) => {
  const { scene: pookieScene } = useGLTF(staticFile('models/POOKIE.glb'));

  const clonedScene = useMemo(() => {
    const clone = pookieScene.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
      }
    });
    return clone;
  }, [pookieScene]);

  const emissiveColor = useMemo(
    () => new THREE.Color(ballColor).multiplyScalar(0.5),
    [ballColor],
  );

  const pookieOffset: [number, number, number] = [0, -PLAYER_RADIUS * 0.65, 0];

  return (
    <group
      position={position}
      quaternion={rotation ? new THREE.Quaternion(...rotation) : undefined}
      scale={scale}
    >
      {/* Top half — translucent ice-white shell */}
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <sphereGeometry args={[PLAYER_RADIUS, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#e0f0ff"
          roughness={0.15}
          metalness={0.05}
          transparent
          opacity={0.25}
          envMapIntensity={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Bottom half — colored emissive shell */}
      <mesh castShadow receiveShadow rotation={[0, 0, -Math.PI / 2]}>
        <sphereGeometry args={[PLAYER_RADIUS, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={ballColor}
          roughness={0.2}
          metalness={0.3}
          transparent
          opacity={0.75}
          emissive={emissiveColor}
          emissiveIntensity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* POOKIE.glb model inside the ball */}
      {showModel && (
        <primitive
          object={clonedScene}
          scale={POOKIE_MODEL_SCALE}
          position={pookieOffset}
          rotation={[0, Math.PI / 2, 0]}
        />
      )}
    </group>
  );
};

export { PLAYER_RADIUS };
