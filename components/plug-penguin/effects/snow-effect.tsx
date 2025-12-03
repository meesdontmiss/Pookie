import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SnowEffectProps {
  count?: number
  size?: number
  area?: number
}

export function SnowEffect({ count = 1000, size = 0.1, area = 50 }: SnowEffectProps) {
  const mesh = useRef<THREE.Points>(null)
  
  // Create snow particles
  const [positions, velocities] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      // Random position within the area
      positions[i * 3] = Math.random() * area - area / 2
      positions[i * 3 + 1] = Math.random() * area
      positions[i * 3 + 2] = Math.random() * area - area / 2
      
      // Random velocity for each particle
      velocities[i * 3] = Math.random() * 0.2 - 0.1
      velocities[i * 3 + 1] = -Math.random() * 0.5 - 0.3
      velocities[i * 3 + 2] = Math.random() * 0.2 - 0.1
    }
    
    return [positions, velocities]
  }, [count, area])
  
  // Update snow particles position on each frame
  useFrame((state, delta) => {
    if (!mesh.current) return
    
    const positionArray = mesh.current.geometry.attributes.position.array as Float32Array
    
    for (let i = 0; i < count; i++) {
      // Update position based on velocity
      positionArray[i * 3] += velocities[i * 3] * delta * 5
      positionArray[i * 3 + 1] += velocities[i * 3 + 1] * delta * 5
      positionArray[i * 3 + 2] += velocities[i * 3 + 2] * delta * 5
      
      // Reset particle if it falls below the ground
      if (positionArray[i * 3 + 1] < -10) {
        positionArray[i * 3] = Math.random() * area - area / 2
        positionArray[i * 3 + 1] = area
        positionArray[i * 3 + 2] = Math.random() * area - area / 2
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
        size={size}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
} 