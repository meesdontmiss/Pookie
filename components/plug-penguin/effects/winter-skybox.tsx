'use client'

import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

export function WinterSkybox() {
  const skyRef = useRef<THREE.Mesh>(null)
  
  // Slowly rotate the skybox
  useFrame((_, delta) => {
    if (skyRef.current) {
      skyRef.current.rotation.y += delta * 0.05
    }
  })
  
  return (
    <mesh ref={skyRef}>
      <sphereGeometry args={[500, 32, 32]} />
      <meshBasicMaterial color="#87CEEB" side={THREE.BackSide} />
    </mesh>
  )
}

export default WinterSkybox
