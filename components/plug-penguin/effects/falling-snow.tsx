'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface FallingSnowProps {
  count?: number
  radius?: number
  speed?: number
  texture?: string
}

export function FallingSnow({ 
  count = 500, 
  radius = 50, 
  speed = 0.2,
  texture = '/textures/winters_eve/snowflake.png'
}: FallingSnowProps) {
  const mesh = useRef<THREE.Points>(null)
  
  // Create snowflake particles
  const [positions, velocities] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      // Random position within a sphere
      const i3 = i * 3
      positions[i3] = (Math.random() - 0.5) * radius * 2
      positions[i3 + 1] = Math.random() * radius * 2
      positions[i3 + 2] = (Math.random() - 0.5) * radius * 2
      
      // Random velocity
      velocities[i3] = (Math.random() - 0.5) * 0.1
      velocities[i3 + 1] = -(Math.random() * 0.2 + 0.1) * speed
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.1
    }
    
    return [positions, velocities]
  }, [count, radius, speed])
  
  // Load snowflake texture
  const snowflakeTexture = useMemo(() => new THREE.TextureLoader().load(texture), [texture])
  
  // Update snowflake positions
  useFrame(() => {
    if (!mesh.current) return
    
    const positions = mesh.current.geometry.attributes.position.array as Float32Array
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      
      // Update position
      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]
      
      // Reset if snowflake falls below the ground
      if (positions[i3 + 1] < -radius) {
        positions[i3] = (Math.random() - 0.5) * radius * 2
        positions[i3 + 1] = radius
        positions[i3 + 2] = (Math.random() - 0.5) * radius * 2
      }
    }
    
    mesh.current.geometry.attributes.position.needsUpdate = true
  })
  
  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        map={snowflakeTexture}
        transparent
        depthWrite={false}
        color="#ffffff"
      />
    </points>
  )
} 