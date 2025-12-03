'use client'

import { useRef } from 'react'
import { Text } from '@react-three/drei'
import * as THREE from 'three'

interface ConsumablesSignProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export function ConsumablesSign({
  position = [0, 0, 0],
  rotation = [0, 0, 0]
}: ConsumablesSignProps) {
  const signRef = useRef<THREE.Group>(null)
  
  return (
    <group ref={signRef} position={position} rotation={rotation}>
      {/* Sign post */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.1, 1.5, 0.1]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Sign board */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[1.2, 0.8, 0.05]} />
        <meshStandardMaterial color="#A0522D" />
      </mesh>
      
      {/* Sign text */}
      <Text
        position={[0, 1.5, 0.03]}
        fontSize={0.15}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        maxWidth={1}
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        CONSUMABLES
      </Text>
      
      {/* Subtitle */}
      <Text
        position={[0, 1.3, 0.03]}
        fontSize={0.08}
        color="#FFFF00"
        anchorX="center"
        anchorY="middle"
        maxWidth={1}
        outlineWidth={0.005}
        outlineColor="#000000"
      >
        Press E to collect
      </Text>
      
      {/* Arrow pointing down */}
      <mesh position={[0, 1.1, 0.03]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.1, 0.2, 3]} />
        <meshStandardMaterial color="#FFFF00" />
      </mesh>
    </group>
  )
} 