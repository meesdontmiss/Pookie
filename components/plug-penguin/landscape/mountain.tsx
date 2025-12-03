'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import SimplexNoise from 'simplex-noise'

interface MountainProps {
  position?: [number, number, number]
  scale?: [number, number, number]
  seed?: number
  detail?: number
  snowLine?: number
  peakHeight?: number
}

export function Mountain({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  seed = 1,
  detail = 64,
  snowLine = 0.7, // Height percentage where snow begins (0-1)
  peakHeight = 50
}: MountainProps) {
  const mountainRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Generate mountain geometry with noise-based displacement
  const mountainGeometry = useMemo(() => {
    // Initialize simplex noise with seed
    const simplex = new SimplexNoise(seed.toString())
    
    // Create cone as base shape
    const geometry = new THREE.ConeGeometry(
      30, // Radius
      peakHeight, // Height
      detail, // Radial segments
      detail / 2, // Height segments
      true // Open-ended
    )
    
    // Displace vertices with noise
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute
    const vertex = new THREE.Vector3()
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      
      // Don't modify bottom vertices
      if (vertex.y <= 0) continue
      
      // Normalize height (0-1)
      const normalizedHeight = vertex.y / peakHeight
      
      // Calculate noise based on position
      const frequency = 0.2
      const noiseValue = (
        simplex.noise3D(
          vertex.x * frequency,
          vertex.y * frequency * 0.5,
          vertex.z * frequency
        ) * 0.5 + 0.5
      )
      
      // More displacement at lower altitudes, smoother at peaks
      const displacementFactor = Math.max(0, 1 - normalizedHeight * 1.5) * 5
      
      // Displace vertex
      const angle = Math.atan2(vertex.z, vertex.x)
      const displacement = noiseValue * displacementFactor
      const radius = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z)
      
      vertex.x = Math.cos(angle) * (radius + displacement)
      vertex.z = Math.sin(angle) * (radius + displacement)
      
      // Add small peak variations
      if (normalizedHeight > 0.8) {
        const smallScale = 2.0
        const smallNoise = simplex.noise3D(
          vertex.x * smallScale,
          vertex.y * smallScale,
          vertex.z * smallScale
        )
        vertex.y += smallNoise * (normalizedHeight - 0.8) * 5
      }
      
      // Update position
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z)
    }
    
    // Update normals
    geometry.computeVertexNormals()
    
    // Generate UVs for proper texture mapping
    const uvAttribute = geometry.getAttribute('uv') as THREE.BufferAttribute
    
    for (let i = 0; i < uvAttribute.count; i++) {
      const u = uvAttribute.getX(i)
      const v = uvAttribute.getY(i)
      
      // Map U based on angle around cone
      // Keep V as height
      uvAttribute.setXY(i, u, v)
    }
    
    geometry.setAttribute('uv', uvAttribute)
    
    return geometry
  }, [detail, peakHeight, seed])
  
  // Create snow line vertices
  const snowLineMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
    })
  }, [])
  
  // Custom shader material for snow transitions
  const mountainMaterial = useMemo(() => {
    // Apply vertex colors for snow transition
    const geometry = mountainGeometry
    const colors = []
    const positionAttribute = geometry.getAttribute('position') as THREE.BufferAttribute
    const vertex = new THREE.Vector3()
    
    // Rock color
    const rockColor = new THREE.Color('#555555')
    // Snow color
    const snowColor = new THREE.Color('#ffffff')
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      
      // Normalize height (0-1)
      const normalizedHeight = vertex.y / peakHeight
      
      // Blend colors based on height
      if (normalizedHeight > snowLine) {
        // Snow with some rock showing through based on steepness
        const snowAmount = Math.min(1, (normalizedHeight - snowLine) / 0.1)
        const color = rockColor.clone().lerp(snowColor, snowAmount)
        colors.push(color.r, color.g, color.b)
      } else {
        // Rock with slight variation
        const variation = (Math.random() * 0.1) - 0.05
        const color = rockColor.clone().addScalar(variation)
        colors.push(color.r, color.g, color.b)
      }
    }
    
    // Add colors to geometry
    geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    )
    
    return snowLineMaterial
  }, [mountainGeometry, peakHeight, snowLine, snowLineMaterial])
  
  // Snow particles effect
  const snowParticles = useMemo(() => {
    // Create snow particles around the peak
    const particleCount = 100
    const positions = []
    
    for (let i = 0; i < particleCount; i++) {
      // Random position around peak
      const radius = 20 + Math.random() * 20
      const angle = Math.random() * Math.PI * 2
      const height = peakHeight * (0.8 + Math.random() * 0.2)
      
      positions.push(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      )
    }
    
    const snowGeometry = new THREE.BufferGeometry()
    snowGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    )
    
    return snowGeometry
  }, [peakHeight])
  
  // Animate snow particles
  useFrame(({ clock }) => {
    if (!mountainRef.current) return
    
    // Gentle rotation for the entire mountain
    const time = clock.getElapsedTime() * 0.05
    
    // Animate snow particles if added
    const snowParticleMesh = mountainRef.current.children.find(
      child => child.name === 'snowParticles'
    ) as THREE.Points | undefined
    
    if (snowParticleMesh) {
      const positions = snowParticleMesh.geometry.getAttribute('position')
      const vertex = new THREE.Vector3()
      
      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i)
        
        // Simple wind effect
        vertex.x += Math.sin(time + i) * 0.1
        vertex.z += Math.cos(time + i * 0.5) * 0.1
        
        // Make particles fall and reset when low
        vertex.y -= 0.1
        if (vertex.y < 0) {
          vertex.y = peakHeight * (0.8 + Math.random() * 0.2)
          // Randomize position when resetting
          const radius = 20 + Math.random() * 20
          const angle = Math.random() * Math.PI * 2
          vertex.x = Math.cos(angle) * radius
          vertex.z = Math.sin(angle) * radius
        }
        
        positions.setXYZ(i, vertex.x, vertex.y, vertex.z)
      }
      
      positions.needsUpdate = true
    }
  })
  
  return (
    <group 
      ref={mountainRef} 
      position={new THREE.Vector3(...position)}
      scale={new THREE.Vector3(...scale)}
    >
      {/* Main mountain mesh */}
      <mesh 
        ref={meshRef}
        geometry={mountainGeometry}
        material={mountainMaterial}
        castShadow
        receiveShadow
      />
      
      {/* Snow particles */}
      <points name="snowParticles" geometry={snowParticles}>
        <pointsMaterial 
          color="white" 
          size={0.5} 
          transparent 
          opacity={0.7}
          sizeAttenuation
        />
      </points>
    </group>
  )
} 