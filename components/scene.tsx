"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, useGLTF, Stars, SpotLight, Text } from "@react-three/drei"
import { useRef, useState, useEffect, Suspense, useMemo } from "react"
import * as THREE from "three"

// Simple snow falling effect
function Snow() {
  const snowCount = 250
  
  // Create snow particles with varying sizes and depths
  const { positions, sizes } = useMemo(() => {
    const pos = new Float32Array(snowCount * 3)
    const particleSizes = new Float32Array(snowCount)
    
    for (let i = 0; i < snowCount; i++) {
      // Random positions above and around the scene, with varying depths
      pos[i * 3] = (Math.random() - 0.5) * 15      // x: -7.5 to 7.5
      pos[i * 3 + 1] = Math.random() * 15 - 5      // y: -5 to 10 (full height coverage)
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15  // z: -7.5 to 7.5 (varying depth)
      
      // Varying sizes - closer particles appear larger
      const depth = Math.abs(pos[i * 3 + 2])
      particleSizes[i] = 0.05 + (0.15 * (1 - depth / 7.5)) * Math.random()
    }
    
    return { positions: pos, sizes: particleSizes }
  }, [])
  
  const particles = useRef<THREE.Points>(null)
  
  useFrame(({ clock }) => {
    if (!particles.current) return
    
    const positions = particles.current.geometry.attributes.position.array as Float32Array
    const time = clock.getElapsedTime()
    
    for (let i = 0; i < snowCount; i++) {
      // Get z-position to determine fall speed (closer particles fall faster)
      const z = positions[i * 3 + 2]
      const depthFactor = 1 - Math.abs(z) / 7.5
      
      // Varying fall speeds based on depth and slight randomization
      const fallSpeed = 0.015 + 0.02 * depthFactor + 0.005 * Math.random()
      positions[i * 3 + 1] -= fallSpeed
      
      // Add gentle horizontal drift with varying intensity based on depth
      positions[i * 3] += Math.sin(time * 0.2 + i) * 0.003 * depthFactor
      positions[i * 3 + 2] += Math.cos(time * 0.1 + i) * 0.002 * depthFactor
      
      // Reset when below the scene to create continuous loop
      if (positions[i * 3 + 1] < -8) {
        positions[i * 3] = (Math.random() - 0.5) * 15
        positions[i * 3 + 1] = 10 // Reset to top
        positions[i * 3 + 2] = (Math.random() - 0.5) * 15
      }
    }
    
    particles.current.geometry.attributes.position.needsUpdate = true
  })
  
  return (
    <points ref={particles}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        sizeAttenuation={true}
        color="white"
        transparent
        opacity={0.8}
        depthWrite={false}
        vertexColors={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

// Spotlight effect to highlight Pookie
function PookieSpotlight() {
  const spotlightRef = useRef<THREE.SpotLight>(null)
  
  useFrame(({ clock }) => {
    if (!spotlightRef.current) return
    
    const time = clock.getElapsedTime()
    
    // Subtle intensity pulsing
    spotlightRef.current.intensity = 5 + Math.sin(time * 0.5) * 0.5
    
    // Very slight position movement for dynamic lighting
    spotlightRef.current.position.x = Math.sin(time * 0.2) * 0.5
    spotlightRef.current.position.z = Math.cos(time * 0.2) * 0.5
  })
  
  return (
    <group>
      <spotLight
        ref={spotlightRef}
        position={[0, 8, 0]}
        angle={0.3}
        penumbra={0.8}
        intensity={5}
        distance={15}
        color="#b3e5fc"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
    </group>
  )
}

// Pookie model
function PookieModel({ onClick }: { onClick?: () => void }) {
  const groupRef = useRef<THREE.Group>(null)
  const [hover, setHover] = useState(false)
  
  // Load the GLTF model
  const { scene: modelScene, materials } = useGLTF('/models/POOKIE.glb', true) as any // Cast to any to access materials if not explicitly typed by useGLTF
  
  // Clone the model to avoid modifying the original
  const model = useMemo(() => {
    return modelScene.clone()
  }, [modelScene])

  // Apply anisotropic filtering to materials
  useEffect(() => {
    if (model) {
      model.traverse((child: any) => {
        if (child.isMesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial; // Assuming standard material
          if (mat.map) { // Check for diffuse map
            mat.map.anisotropy = 16; // Or renderer.capabilities.getMaxAnisotropy()
            mat.map.needsUpdate = true;
          }
          if (mat.metalnessMap) {
            mat.metalnessMap.anisotropy = 16;
            mat.metalnessMap.needsUpdate = true;
          }
          if (mat.roughnessMap) {
            mat.roughnessMap.anisotropy = 16;
            mat.roughnessMap.needsUpdate = true;
          }
          if (mat.normalMap) {
            mat.normalMap.anisotropy = 16;
            mat.normalMap.needsUpdate = true;
          }
          if (mat.aoMap) {
            mat.aoMap.anisotropy = 16;
            mat.aoMap.needsUpdate = true;
          }
          if (mat.emissiveMap) {
            mat.emissiveMap.anisotropy = 16;
            mat.emissiveMap.needsUpdate = true;
          }
          // Add other maps if used, e.g., displacementMap, lightMap, etc.
        }
      });
    }
  }, [model]);
  
  // Add hover effects
  useEffect(() => {
    if (!groupRef.current) return
    
    // Change cursor style when hovering
    document.body.style.cursor = hover ? 'pointer' : 'auto'
    
    // Cleanup cursor style
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [hover]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current) return
    
    const time = state.clock.getElapsedTime()
    
    // Gentle floating animation
    groupRef.current.position.y = -3 + Math.sin(time * 0.8) * 0.2
    
    // Slow rotation - slightly faster when hovered
    groupRef.current.rotation.y += hover ? 0.01 : 0.005
  })
  
  return (
    <group 
      ref={groupRef} 
      position={[0, -3, 0]} 
      onClick={onClick}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      {/* Add a subtle glow effect */}
      {hover && (
        <pointLight
          position={[0, 0, 0]}
          distance={5}
          intensity={2}
          color="#4fc3f7"
        />
      )}
      
      {/* Original model */}
      <primitive object={model} />
    </group>
  )
}

// Main Scene component
interface SceneProps {
  onModelClick?: () => void
  onLoadComplete?: () => void
  onLoadError?: () => void
}

export default function Scene({ onModelClick, onLoadComplete, onLoadError }: SceneProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Handle errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Error in Scene:', event)
      if (onLoadError) onLoadError()
    }
    
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [onLoadError])
  
  // Notify when loaded
  useEffect(() => {
    if (isLoaded && onLoadComplete) {
      onLoadComplete()
    }
  }, [isLoaded, onLoadComplete])
  
  return (
    <Canvas
      style={{ width: '100%', height: '100%' }}
      dpr={typeof window !== 'undefined' ? window.devicePixelRatio : 1}
      gl={{ 
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      }}
      onCreated={() => setIsLoaded(true)}
      camera={{ position: [0, 0, 5], fov: 40 }}
      shadows
    >
      {/* Fixed lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      
      {/* Background stars */}
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0} 
      />
      
      {/* Main content */}
      <Suspense fallback={null}>
        <PookieModel onClick={onModelClick} />
        <PookieSpotlight />
        <Snow />
      </Suspense>
    </Canvas>
  )
} 