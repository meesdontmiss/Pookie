import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { staticFile } from 'remotion';
import { PLATFORM_RADIUS, PLATFORM_HEIGHT } from './Arena';

/**
 * Blimp — Exact port of SumoArenaScene's Blimp component.
 *
 * Orbits the arena using pookie_blimp.glb at scale 4.5.
 */

export const Blimp: React.FC = () => {
  const blimpRef = useRef<THREE.Group>(null!);
  const { scene: blimpModel } = useGLTF(staticFile('models/pookie_blimp.glb'));

  const blimpPathRadius = PLATFORM_RADIUS + 18;
  const blimpAltitude = PLATFORM_HEIGHT + 5;
  const blimpSpeed = 0.15;

  const clonedBlimpModel = useMemo(() => {
    const clone = blimpModel.clone();
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }
    });
    return clone;
  }, [blimpModel]);

  useFrame(({ clock }) => {
    if (!blimpRef.current) return;
    const angle = -clock.elapsedTime * blimpSpeed;
    blimpRef.current.position.x = Math.cos(angle) * blimpPathRadius;
    blimpRef.current.position.z = Math.sin(angle) * blimpPathRadius;
    blimpRef.current.position.y = blimpAltitude;
    blimpRef.current.rotation.y = -angle + Math.PI / 2;
  });

  return (
    <group ref={blimpRef} scale={4.5}>
      <primitive object={clonedBlimpModel} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
};
