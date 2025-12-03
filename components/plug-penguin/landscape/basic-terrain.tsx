'use client'

import * as THREE from 'three'
import { useRef } from 'react'

interface BasicTerrainProps {
  size?: number
  color?: string
  position?: [number, number, number]
  receiveShadow?: boolean
}

export function BasicTerrain({
  size = 500,
  color = '#f0f0ff',
  position = [0, 0, 0],
  receiveShadow = true
}: BasicTerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  return (
    <mesh 
      ref={meshRef}
      position={new THREE.Vector3(...position)}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow={receiveShadow}
    >
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial 
        color={color}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
} 