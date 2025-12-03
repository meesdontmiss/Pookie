'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface SnowPileProps {
  position?: [number, number, number]
  scale?: [number, number, number]
  variant?: 'small' | 'medium' | 'large' | 'drift'
  smoothness?: number
  sparkle?: boolean
  windDirection?: [number, number]
  windStrength?: number
}

export function SnowPile({
  position = [0, 0, 0],
  scale = [1, 1, 1],
  variant = 'medium',
  smoothness = 0.8,
  sparkle = true,
  windDirection = [1, 0],
  windStrength = 0.2
}: SnowPileProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const particlesRef = useRef<THREE.Points>(null)
  
  // Determine pile dimensions based on variant
  const dimensions = useMemo(() => {
    switch (variant) {
      case 'small':
        return { radius: 1.5, height: 0.7, segments: 8 }
      case 'medium':
        return { radius: 2.8, height: 1.2, segments: 12 }
      case 'large':
        return { radius: 4.5, height: 2.0, segments: 16 }
      case 'drift':
        return { radius: 6.0, height: 1.0, segments: 20 }
      default:
        return { radius: 2.8, height: 1.2, segments: 12 }
    }
  }, [variant])
  
  // Create snow pile geometry
  const geometry = useMemo(() => {
    const { radius, height, segments } = dimensions
    
    if (variant === 'drift') {
      // Create an elongated drift shape
      const shape = new THREE.Shape()
      const elongation = 1.5 + Math.random() * 0.5
      
      // Start with a base ellipse
      shape.ellipse(0, 0, radius, radius * elongation, 0, Math.PI * 2, false, 0)
      
      // Create extrusion settings with randomized thickness
      const extrudeSettings = {
        steps: 1,
        depth: height,
        bevelEnabled: true,
        bevelThickness: height * 0.4,
        bevelSize: radius * 0.15,
        bevelOffset: 0,
        bevelSegments: 3
      }
      
      // Create extruded geometry and rotate to lie flat
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings)
      geometry.rotateX(Math.PI / 2)
      
      // Add some noise to the surface
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
      const vertex = new THREE.Vector3()
      
      for (let i = 0; i < posAttr.count; i++) {
        vertex.fromBufferAttribute(posAttr, i)
        
        const distance = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z)
        const normalizedDist = Math.min(distance / radius, 1)
        
        // More noise at the edges, smoother in center
        const noiseScale = 0.08 * (1 - smoothness) * (0.5 + normalizedDist * 0.5)
        
        // Apply wind direction influence to the pile shape
        const windFactor = Math.max(0, 
          (vertex.x * windDirection[0] + vertex.z * windDirection[1]) / radius
        ) * windStrength
        
        // Add noise based on position
        vertex.y += (Math.sin(vertex.x * 2 + vertex.z * 3) * Math.cos(vertex.z * 2)) * noiseScale
        
        // Apply wind deformation
        if (vertex.y > 0) {
          vertex.x += windDirection[0] * windFactor * vertex.y
          vertex.z += windDirection[1] * windFactor * vertex.y
        }
        
        posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z)
      }
      
      geometry.computeVertexNormals()
      return geometry
    } else {
      // Create a hemisphere for regular piles
      const geometry = new THREE.SphereGeometry(
        radius, 
        segments, 
        Math.ceil(segments / 2), 
        0, Math.PI * 2, 
        0, Math.PI / 2
      )
      
      // Flatten slightly
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
      const vertex = new THREE.Vector3()
      
      for (let i = 0; i < posAttr.count; i++) {
        vertex.fromBufferAttribute(posAttr, i)
        
        // Scale height
        vertex.y *= height / radius
        
        // Add some noise for natural look
        const distance = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z)
        const normalizedDist = Math.min(distance / radius, 1)
        const noiseScale = 0.1 * (1 - smoothness)
        
        // More noise at the edges, smoother in center
        const edgeNoise = noiseScale * normalizedDist
        
        vertex.y += (
          Math.sin(vertex.x * 3) * 
          Math.cos(vertex.z * 2) * 
          edgeNoise
        )
        
        posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z)
      }
      
      geometry.computeVertexNormals()
      return geometry
    }
  }, [dimensions, variant, smoothness, windDirection, windStrength])
  
  // Create sparkle particles
  const particles = useMemo(() => {
    if (!sparkle) return null
    
    const { radius, height } = dimensions
    const particleCount = Math.floor(radius * 15)
    const positions = new Float32Array(particleCount * 3)
    const sizes = new Float32Array(particleCount)
    
    for (let i = 0; i < particleCount; i++) {
      // Position particles on the surface of the snow pile
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI / 2
      
      const r = radius * (0.7 + Math.random() * 0.3) // Slightly inside the surface
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi) * height / radius
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      
      // Randomize particle sizes
      sizes[i] = Math.random() * 0.05 + 0.02
    }
    
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    
    return geometry
  }, [sparkle, dimensions])
  
  // Animate sparkle particles
  useFrame(({ clock }) => {
    if (!particlesRef.current || !sparkle) return
    
    const time = clock.getElapsedTime()
    const material = particlesRef.current.material as THREE.ShaderMaterial
    
    if (material.uniforms) {
      material.uniforms.time.value = time
    }
  })
  
  // Particle shader materials
  const shaderMaterial = useMemo(() => {
    if (!sparkle) return null
    
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color('#ffffff') }
      },
      vertexShader: `
        attribute float size;
        uniform float time;
        varying vec3 vPosition;
        
        void main() {
          vPosition = position;
          
          // Calculate visibility based on time
          float visibility = 0.6 + 0.4 * sin(time * 0.5 + position.x * 5.0 + position.y * 3.0 + position.z * 2.0);
          
          // Set point size
          gl_PointSize = size * visibility * 2.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying vec3 vPosition;
        
        void main() {
          // Create circular point
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          
          if (dist > 0.5) discard;
          
          // Sparkle effect
          float brightness = 1.0 - smoothstep(0.0, 0.5, dist);
          
          gl_FragColor = vec4(color, brightness * 0.7);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }, [sparkle])
  
  return (
    <group 
      ref={groupRef} 
      position={new THREE.Vector3(...position)}
      scale={new THREE.Vector3(...scale)}
    >
      {/* Snow pile mesh */}
      <mesh 
        ref={meshRef} 
        geometry={geometry} 
        receiveShadow 
        castShadow
      >
        <meshStandardMaterial 
          color="#ffffff"
          roughness={0.9}
          metalness={0.1}
          envMapIntensity={0.2}
        />
      </mesh>
      
      {/* Sparkle particles */}
      {sparkle && particles && shaderMaterial && (
        <points ref={particlesRef} geometry={particles} material={shaderMaterial} />
      )}
    </group>
  )
} 