'use client'

import * as THREE from 'three'
import { WORLD_CONSTANTS } from '../utils/constants'

export function Ground() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[WORLD_CONSTANTS.GROUND_SIZE, WORLD_CONSTANTS.GROUND_SIZE, 32, 32]} />
      <meshStandardMaterial
        color="#f0f5ff"
        metalness={0.1}
        roughness={0.9}
      />
    </mesh>
  )
} 