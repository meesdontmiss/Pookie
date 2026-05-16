'use client'

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ASSET_PATHS } from '@/components/plug-penguin/utils/constants';

interface MiniPookieBallOptimizedProps {
  position: [number, number, number];
  scale?: number;
  color?: string;
}

export const MiniPookieBallOptimized = ({ 
  position, 
  scale = 1, 
  color = '#ff0000'
}: MiniPookieBallOptimizedProps) => {
  const ballRef = useRef<THREE.Group>(null);
  const pookieModelRef = useRef<THREE.Group>(null);

  const { scene: pookieModel } = useGLTF(ASSET_PATHS.MODELS.PENGUIN);

  useEffect(() => {
    if (pookieModel && pookieModelRef.current) {
      while (pookieModelRef.current.children.length > 0) {
        pookieModelRef.current.remove(pookieModelRef.current.children[0]);
      }
      const clone = pookieModel.clone();
      pookieModelRef.current.add(clone);
      clone.scale.set(0.336, 0.336, 0.336);
      clone.position.set(0, -0.6, 0);
      clone.rotation.set(0, Math.PI + Math.PI / 2, 0);
      
      // Optimize materials for small size
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = false; // Disable shadows for performance
          child.receiveShadow = false;
          if (child.material) {
            child.material.side = THREE.FrontSide;
            child.material.transparent = false;
          }
        }
      });
    }
  }, [pookieModel]);

  useFrame(() => {
    if (ballRef.current) {
      ballRef.current.rotation.y += 0.01; // Slightly faster rotation
    }
  });

  return (
    <group position={position} scale={scale}>
      <group ref={ballRef}>
        {/* Simplified glass half - lower poly count */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI/2]}>
          <sphereGeometry args={[1, 16, 16, 0, Math.PI*2, 0, Math.PI/2]} />
          <meshPhysicalMaterial
            color="#e0f0ff"
            roughness={0.2}
            metalness={0.05}
            transparent={true}
            opacity={0.3}
            clearcoat={0.8}
            clearcoatRoughness={0.1}
            transmission={0.85}
            thickness={0.3}
            ior={1.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Simplified colored half - lower poly count */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
          <sphereGeometry args={[1, 16, 16, 0, Math.PI*2, 0, Math.PI/2]} />
          <meshPhysicalMaterial
            color={color}
            roughness={0.15}
            metalness={0.3}
            transparent={true}
            opacity={0.7}
            clearcoat={0.7}
            clearcoatRoughness={0.15}
            emissive={color}
            emissiveIntensity={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
        <group ref={pookieModelRef} />
      </group>
    </group>
  );
};

