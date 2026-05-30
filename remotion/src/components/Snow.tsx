import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { staticFile } from 'remotion';

/**
 * Snow — Port of the game's FallingSnow component for Remotion.
 *
 * Renders falling snowflake particles using the same snowflake texture
 * and parameters as the real game.
 */

interface SnowProps {
  count?: number;
  radius?: number;
  speed?: number;
}

export const Snow: React.FC<SnowProps> = ({
  count = 500,
  radius = 50,
  speed = 0.25,
}) => {
  const meshRef = useRef<THREE.Points>(null);

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * radius * 2;
      pos[i3 + 1] = Math.random() * radius * 2;
      pos[i3 + 2] = (Math.random() - 0.5) * radius * 2;

      vel[i3] = (Math.random() - 0.5) * 0.1;
      vel[i3 + 1] = -(Math.random() * 0.2 + 0.1) * speed;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.1;
    }

    return [pos, vel];
  }, [count, radius, speed]);

  const snowflakeTexture = useLoader(
    THREE.TextureLoader,
    staticFile('textures/winters_eve/snowflake.png'),
  );

  useFrame(() => {
    if (!meshRef.current) return;

    const posArray = meshRef.current.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      posArray[i3] += velocities[i3];
      posArray[i3 + 1] += velocities[i3 + 1];
      posArray[i3 + 2] += velocities[i3 + 2];

      if (posArray[i3 + 1] < -radius) {
        posArray[i3] = (Math.random() - 0.5) * radius * 2;
        posArray[i3 + 1] = radius;
        posArray[i3 + 2] = (Math.random() - 0.5) * radius * 2;
      }
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        map={snowflakeTexture}
        transparent
        depthWrite={false}
        color="#ffffff"
      />
    </points>
  );
};
