'use client';

import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ring } from '@react-three/drei';

interface PushEffectProps {
  id: string;
  position: THREE.Vector3;
  onComplete: (id: string) => void;
  duration?: number; // in milliseconds
  initialRadius?: number;
  maxRadius?: number;
  color?: string;
}

const PushEffect: React.FC<PushEffectProps> = ({
  id,
  position,
  onComplete,
  duration = 500, // 0.5 seconds
  initialRadius = 0.2,
  maxRadius = 3,
  color = '#87CEFA', // LightSkyBlue
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
      materialRef.current.opacity = 1 - progress; // Fade out
    }

    if (progress >= 1) {
      onComplete(id);
    }
  });

  return (
    <group position={position}>
      <Ring ref={meshRef} args={[0.9, 1, 32, 1, 0, Math.PI * 2]} rotation={[-Math.PI / 2, 0, 0]}> 
        {/* Using Ring from drei which creates a Torus with a thin tube radius by default if innerRadius and outerRadius are close */}
        {/* args: [innerRadius, outerRadius, thetaSegments, phiSegments, thetaStart, thetaLength] */}
        {/* We will scale the whole meshRef to control the ring's expansion */}
        <meshBasicMaterial 
            ref={materialRef} 
            color={color} 
            side={THREE.DoubleSide} 
            transparent 
            opacity={1} 
        />
      </Ring>
    </group>
  );
};

export default PushEffect; 