import React from 'react';
import * as THREE from 'three';

interface CircularSpawnPlatformProps {
  position: [number, number, number];
  radius?: number;
  thickness?: number;
  color?: string;
  segments?: number;
}

export const CircularSpawnPlatform: React.FC<CircularSpawnPlatformProps> = ({
  position,
  radius = 10, // Default radius
  thickness = 0.5, // Default thickness
  color = '#888888', // Default color (grey)
  segments = 32,
}) => {
  return (
    <mesh position={position} receiveShadow castShadow>
      <cylinderGeometry args={[radius, radius, thickness, segments]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
    </mesh>
  );
}; 