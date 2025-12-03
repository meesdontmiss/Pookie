'use client'

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface PookieInBallEffectProps {
  position: [number, number, number];
  scale?: number;
  isHovered?: boolean; // Made optional as it might not be needed if extracted
  color?: string; // Optional accent color for the ball half
}

export const PookieInBallEffect = ({ 
  position, 
  scale = 1, 
  isHovered = false, // Default to false
  color = '#ff0000'
}: PookieInBallEffectProps) => {
  const ballRef = useRef<THREE.Group>(null);
  const pookieModelRef = useRef<THREE.Group>(null);
  const ballMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const colorSideMaterialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  const { scene: pookieModel } = useGLTF('/models/POOKIE.glb');

  useEffect(() => {
    if (pookieModel && pookieModelRef.current) {
      while (pookieModelRef.current.children.length > 0) {
        pookieModelRef.current.remove(pookieModelRef.current.children[0]);
      }
      const clone = pookieModel.clone();
      pookieModelRef.current.add(clone);
      clone.scale.set(0.336, 0.336, 0.336);
      clone.position.set(0, -0.6, 0);
      clone.rotation.set(0, Math.PI + Math.PI / 2, 0); // Rotated 90 degrees clockwise (added PI/2)
      clone.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.side = THREE.FrontSide;
            child.material.transparent = false;
          }
        }
      });
    }
  }, [pookieModel]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ballRef.current) {
      ballRef.current.rotation.y += 0.006;
    }
    if (pookieModelRef.current) {
      pookieModelRef.current.rotation.x = Math.sin(t * 1.5) * 0.03;
    }
    if (ballMaterialRef.current) {
      const pulseIntensity = isHovered ? 0.2 : 0.1;
      ballMaterialRef.current.emissiveIntensity = (Math.sin(t * 1.5) * 0.1 + 0.5) * pulseIntensity;
    }
    if (colorSideMaterialRef.current) {
      const colorIntensity = isHovered ? 0.3 : 0.2;
      colorSideMaterialRef.current.emissiveIntensity = (Math.sin(t * 1.2) * 0.1 + 0.5) * colorIntensity;
    }
  });

  return (
    <group position={position} scale={scale}>
      <group ref={ballRef}>
        <mesh castShadow receiveShadow position={[0, 0, 0]} rotation={[0, 0, Math.PI/2]}>
          <sphereGeometry args={[1, 32, 32, 0, Math.PI*2, 0, Math.PI/2]} />
          <meshPhysicalMaterial
            ref={ballMaterialRef}
            color="#e0f0ff"
            roughness={0.15}
            metalness={0.05}
            transparent={true}
            opacity={0.25}
            clearcoat={0.95}
            clearcoatRoughness={0.05}
            transmission={0.9}
            thickness={0.3}
            ior={1.8}
            envMapIntensity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0, 0]} rotation={[0, 0, -Math.PI/2]}>
          <sphereGeometry args={[1, 32, 32, 0, Math.PI*2, 0, Math.PI/2]} />
          <meshPhysicalMaterial
            ref={colorSideMaterialRef}
            color={color}
            roughness={0.1}
            metalness={0.3}
            transparent={true}
            opacity={0.6}
            clearcoat={0.8}
            clearcoatRoughness={0.1}
            emissive={color}
            emissiveIntensity={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
        <group ref={pookieModelRef} />
      </group>
      <pointLight 
        position={[0, 0, 0]} 
        intensity={isHovered ? 1.0 : 0.8} 
        distance={2} 
        decay={2}
        color="#ffffff" 
      />
    </group>
  );
}; 