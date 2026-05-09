'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ring } from '@react-three/drei';

interface PushEffectProps {
  id: string;
  position: THREE.Vector3;
  onComplete: (id: string) => void;
  duration?: number;
  initialRadius?: number;
  maxRadius?: number;
  color?: string;
}

const PushEffect: React.FC<PushEffectProps> = ({
  id,
  position,
  onComplete,
  duration = 600,
  initialRadius = 0.3,
  maxRadius = 4,
  color = '#00ffaa',
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!);
  const startTime = useRef(performance.now());

  useFrame(() => {
    const elapsedTime = performance.now() - startTime.current;
    const progress = Math.min(elapsedTime / duration, 1);

    if (meshRef.current && materialRef.current) {
      const currentRadius = initialRadius + (maxRadius - initialRadius) * progress;
      meshRef.current.scale.set(currentRadius, currentRadius, currentRadius);
      materialRef.current.opacity = (1 - progress) * 0.8;
    }

    if (progress >= 1) {
      onComplete(id);
    }
  });

  // Project ring onto the floor at platformHeight/2 (top of platform)
  const floorY = 2 + 0.05; // platformHeight/2 + tiny offset to avoid z-fighting

  return (
    <group position={[position.x, floorY, position.z]}>
      <Ring ref={meshRef} args={[0.85, 1, 24, 1, 0, Math.PI * 2]} rotation={[-Math.PI / 2, 0, 0]}> 
        <meshBasicMaterial 
            ref={materialRef} 
            color={color} 
            side={THREE.DoubleSide} 
            transparent 
            opacity={0.8} 
            depthWrite={false}
            blending={THREE.AdditiveBlending}
        />
      </Ring>
    </group>
  );
};

export default PushEffect; 