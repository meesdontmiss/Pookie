import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { staticFile } from 'remotion';

/**
 * Arena — Exact replica of the in-game ArenaPlatform + PaddedEdges + GlowingTrim.
 *
 * Matches SumoArenaScene.tsx constants:
 *   platformRadius = 20
 *   platformHeight = 4
 */

const PLATFORM_RADIUS = 20;
const PLATFORM_HEIGHT = 4;

export const Arena: React.FC = () => {
  // Load granite tile textures — same as the real ArenaPlatform
  const [diffuseMap, aoMap] = useLoader(THREE.TextureLoader, [
    staticFile('textures/granite_tile/granite_tile_diff_1k.jpg'),
    staticFile('textures/granite_tile/granite_tile_ao_1k.jpg'),
  ]);

  useMemo(() => {
    [diffuseMap, aoMap].forEach((texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 4);
    });
  }, [diffuseMap, aoMap]);

  const pastelLavender = useMemo(() => new THREE.Color('#E6E6FA'), []);

  return (
    <group>
      {/* ── Main Platform Cylinder ── */}
      <mesh receiveShadow castShadow>
        <cylinderGeometry args={[PLATFORM_RADIUS, PLATFORM_RADIUS, PLATFORM_HEIGHT, 32]} />
        <meshStandardMaterial
          map={diffuseMap}
          aoMap={aoMap}
          aoMapIntensity={1}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* ── Padded Edges (Torus) ── */}
      <mesh
        castShadow
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, PLATFORM_HEIGHT / 2, 0]}
      >
        <torusGeometry args={[PLATFORM_RADIUS, 0.75, 8, 32]} />
        <meshStandardMaterial color="#e0e0e0" roughness={0.6} metalness={0.1} />
      </mesh>

      {/* ── Glowing Trim ── */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, PLATFORM_HEIGHT / 2 + 0.01, 0]}
      >
        <torusGeometry args={[PLATFORM_RADIUS, 0.15, 6, 32]} />
        <meshStandardMaterial
          color={pastelLavender}
          emissive={pastelLavender}
          emissiveIntensity={1.5}
          toneMapped={false}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>
    </group>
  );
};

/**
 * Clouds — Sphere-cluster clouds matching the game's Cloud component.
 */
export const CloudCluster: React.FC<{ position: [number, number, number]; scale?: number }> = ({
  position,
  scale = 1,
}) => {
  const mat = (
    <meshStandardMaterial color="#FFFFFF" transparent opacity={0.85} roughness={0.9} />
  );
  return (
    <group position={position} scale={scale}>
      <Sphere args={[1.5, 6, 5]} position={[0, 0, 0]}>{mat}</Sphere>
      <Sphere args={[1, 6, 5]} position={[1, -0.2, 0.5]}>{mat}</Sphere>
      <Sphere args={[0.8, 6, 5]} position={[-1, 0.1, -0.3]}>{mat}</Sphere>
      <Sphere args={[1.2, 6, 5]} position={[0.5, 0.3, -0.8]}>{mat}</Sphere>
    </group>
  );
};

export { PLATFORM_RADIUS, PLATFORM_HEIGHT };
