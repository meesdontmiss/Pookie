import { useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { Mesh, Vector3 } from 'three'

interface GroundProps {
  position?: [number, number, number]
  size?: [number, number]
  color?: string
}

export function Ground({ 
  position = [0, 0, 0], 
  size = [100, 100],
  color = '#ffffff'
}: GroundProps) {
  const meshRef = useRef<Mesh>(null)
  
  // Load snow texture - fallback to a white material if texture is not found
  const texture = useTexture('/textures/winters_eve/snow_ground.jpg', 
    // Fallback if texture fails to load
    () => console.warn('Snow texture not found, using default material')
  )
  
  return (
    <mesh 
      ref={meshRef} 
      position={new Vector3(...position)}
      rotation={[-Math.PI / 2, 0, 0]} 
      receiveShadow
    >
      <planeGeometry args={[...size]} />
      <meshStandardMaterial 
        map={texture} 
        color={color}
        roughness={0.8}
        metalness={0.1}
      />
    </mesh>
  )
} 