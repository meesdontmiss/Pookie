'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'

interface FrozenLakeProps {
  position?: [number, number, number]
  size?: [number, number]
  depth?: number
  roughness?: number
  metalness?: number
  color?: string
  resolution?: number
  mirror?: number
  distortion?: number
  cracks?: boolean
}

export function FrozenLake({
  position = [0, 0, 0],
  size = [100, 100],
  depth = 2,
  roughness = 0.1,
  metalness = 0.9,
  color = '#a5d8ff',
  resolution = 1024,
  mirror = 0.75,
  distortion = 0.2,
  cracks = true
}: FrozenLakeProps) {
  const lakeRef = useRef<THREE.Group>(null)
  const iceRef = useRef<THREE.Mesh>(null)
  const [crackTexture, setCrackTexture] = useState<THREE.Texture | null>(null)
  
  // Load crack texture if cracks enabled
  useEffect(() => {
    if (cracks) {
      const textureLoader = new THREE.TextureLoader()
      textureLoader.load('/textures/snow/snow.jpg', (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(5, 5)
        setCrackTexture(texture)
      })
    }
  }, [cracks])
  
  // Create lake geometry
  const lakeGeometry = useMemo(() => {
    const [width, length] = size
    const geometry = new THREE.PlaneGeometry(width, length, 32, 32)
    
    // Add some subtle height variations to the surface
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      
      // Don't modify edge vertices
      const edgeX = Math.abs(vertex.x) > (width / 2) - 2
      const edgeZ = Math.abs(vertex.y) > (length / 2) - 2
      
      if (!edgeX && !edgeZ) {
        // Add subtle noise to create uneven ice
        const noiseX = Math.sin(vertex.x * 0.1) * Math.cos(vertex.y * 0.1) * 0.15
        const noiseY = Math.sin(vertex.x * 0.2) * Math.cos(vertex.y * 0.2) * 0.1
        const noise = noiseX + noiseY
        
        // Make more variation towards the center
        const distToCenter = 1 - Math.min(1, 
          Math.sqrt(
            Math.pow(vertex.x / (width / 2), 2) + 
            Math.pow(vertex.y / (length / 2), 2)
          )
        )
        
        // Lower the middle slightly for a natural look
        vertex.z = noise - (distToCenter * 0.2)
      }
      
      positionAttribute.setXYZ(i, vertex.x, vertex.z, -vertex.y)
    }
    
    geometry.computeVertexNormals()
    return geometry
  }, [size])
  
  // Create animated wave effect on the ice
  useFrame(({ clock }) => {
    if (!iceRef.current) return
    
    // Apply a subtle wave effect to the ice material
    const material = iceRef.current.material as any
    if (material && material.roughnessMap) {
      const time = clock.getElapsedTime() * 0.1
      
      // Animate distortion
      if (material.distortionMap) {
        material.distortionScale = 0.2 + Math.sin(time) * 0.05
      }
    }
  })
  
  return (
    <group 
      ref={lakeRef} 
      position={new THREE.Vector3(...position)}
    >
      {/* Ice surface */}
      <mesh 
        ref={iceRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        geometry={lakeGeometry}
        receiveShadow
      >
        <MeshReflectorMaterial
          resolution={resolution}
          mirror={mirror}
          mixBlur={10}
          mixStrength={1.5}
          blur={[400, 100]}
          minDepthThreshold={0.8}
          maxDepthThreshold={1.2}
          depthScale={1}
          depthToBlurRatioBias={0.4}
          distortion={distortion}
          color={color}
          metalness={metalness}
          roughness={roughness}
          normalMap={crackTexture}
          normalScale={new THREE.Vector2(0.5, 0.5)}
        />
      </mesh>
      
      {/* Under-ice water (slightly visible depth) */}
      <mesh 
        position={[0, -depth / 2, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <boxGeometry args={[size[0] * 0.9, size[1] * 0.9, depth]} />
        <meshStandardMaterial 
          color={color} 
          transparent={true} 
          opacity={0.3} 
          roughness={0} 
          metalness={0.5}
        />
      </mesh>
      
      {/* Lake edge */}
      <mesh 
        position={[0, -depth / 2, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[
          Math.min(size[0], size[1]) * 0.45, 
          Math.min(size[0], size[1]) * 0.5, 
          64
        ]} />
        <meshStandardMaterial color="#e8f5ff" roughness={0.7} />
      </mesh>
    </group>
  )
} 