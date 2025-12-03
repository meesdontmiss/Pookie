'use client'

import React, { useState, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Html, Billboard } from '@react-three/drei'
import { Group, Mesh, MeshStandardMaterial } from 'three'
import { useRouter } from 'next/navigation'
import { WorldLeaderboard } from '../../leaderboard/world-leaderboard'

/**
 * Main world leaderboard and dogfight entrance component
 * Designed specifically for the Plug Penguin main world
 */
export function PlugPenguinDogfightLeaderboard({
  position = [0, 0, 0] as [number, number, number]
}) {
  // Position the leaderboard higher above the entrance
  const leaderboardPosition: [number, number, number] = [
    position[0], 
    position[1] + 30, 
    position[2]
  ]
  
  // Position the portal at eye level
  const portalPosition: [number, number, number] = [
    position[0], 
    position[1] + 15, 
    position[2]
  ]
  
  return (
    <group position={position}>
      {/* The floating leaderboard - only visible in the main world */}
      <WorldLeaderboard 
        position={leaderboardPosition} 
        scale={1.2}
        maxEntries={10}
      />
      
      {/* Dogfight portal with entrance button */}
      <DogfightPortal position={portalPosition} />
      
      {/* Spotlights to illuminate the area */}
      <spotLight
        position={[0, 40, 0]}
        angle={0.5}
        penumbra={0.5}
        intensity={2}
        color="#4fc3f7"
        distance={60}
        castShadow
      />
    </group>
  )
}

function DogfightPortal({ position }: { position: [number, number, number] }) {
  const router = useRouter()
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  
  // For fighter jet model
  const jetMesh = useRef<Mesh>(null)
  
  // Animation
  useFrame((state) => {
    if (groupRef.current) {
      // Hover animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 1.5
      
      // Rotation animation
      if (!clicked) {
        groupRef.current.rotation.y += 0.005
      } else {
        // Spin faster when clicked
        groupRef.current.rotation.y += 0.05
        
        // Scale down animation
        if (groupRef.current.scale.x > 0.1) {
          groupRef.current.scale.x -= 0.02
          groupRef.current.scale.y -= 0.02
          groupRef.current.scale.z -= 0.02
        } else {
          // Navigate when animation completes
          router.push('/dogfight')
        }
      }
    }
    
    // Engine glow effect
    if (jetMesh.current) {
      const material = jetMesh.current.material as MeshStandardMaterial
      if (material && material.emissiveIntensity !== undefined) {
        material.emissiveIntensity = hovered ? (0.5 + Math.sin(state.clock.elapsedTime * 5) * 0.5) : 0.2
      }
    }
  })
  
  // Special click handler for aim mode
  const handleClick = (e: any) => {
    e.stopPropagation()
    if (!clicked) {
      setClicked(true)
    }
  }
  
  return (
    <group 
      ref={groupRef} 
      position={position}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Fighter jet model */}
      <mesh 
        ref={jetMesh}
        scale={[3, 3, 3]}
        rotation={[0, Math.PI, 0]}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial 
          color={hovered ? "#cc3333" : "#333333"}
          emissive={hovered ? "#ff5555" : "#555555"}
          emissiveIntensity={0.2}
          metalness={0.8}
          roughness={0.2}
        />
        <coneGeometry args={[1, 4, 8]} />
        
        {/* Wings */}
        <group position={[0, 0, 0]}>
          <mesh 
            position={[2, 0, 0]} 
            rotation={[0, 0, Math.PI / 8]}
            onClick={handleClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
          >
            <boxGeometry args={[4, 0.2, 1.5]} />
            <meshStandardMaterial 
              color="#444444" 
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
          <mesh 
            position={[-2, 0, 0]} 
            rotation={[0, 0, -Math.PI / 8]}
            onClick={handleClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
          >
            <boxGeometry args={[4, 0.2, 1.5]} />
            <meshStandardMaterial 
              color="#444444" 
              metalness={0.8}
              roughness={0.2}
            />
          </mesh>
        </group>
        
        {/* Engine glow */}
        <mesh 
          position={[0, -2, 0]}
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial 
            color={hovered ? "#ff8855" : "#ff4411"} 
            emissive={hovered ? "#ffaa44" : "#ff6622"}
            emissiveIntensity={hovered ? 2 : 1}
            toneMapped={false}
          />
        </mesh>
      </mesh>
      
      {/* Green ENTER GAME NOW button - billboarded so it's always visible */}
      <Billboard follow={true} position={[0, -6, 0]}>
        <Html 
          transform 
          distanceFactor={12} 
          zIndexRange={[100, 0]} 
          pointerEvents="all"
          sprite
        >
          <div 
            style={{
              width: '180px',
              height: '80px',
              backgroundColor: '#4caf50',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: 'white',
              fontFamily: 'Arial, sans-serif',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 0 10px rgba(0,0,0,0.5)',
              border: '3px solid #822',
              transition: 'all 0.2s ease',
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
              userSelect: 'none',
              pointerEvents: 'auto'
            }}
            onClick={handleClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <div style={{ 
              textAlign: 'center', 
              lineHeight: '1.2',
              textShadow: '2px 2px 4px rgba(0,0,0,0.4)'
            }}>
              ENTER GAME<br />NOW
            </div>
          </div>
        </Html>
      </Billboard>
      
      {/* Extra light effects */}
      <spotLight
        position={[0, 8, 0]}
        angle={0.3}
        penumbra={0.8}
        intensity={hovered ? 5 : 2}
        color="#4fc3f7"
        distance={20}
        castShadow
      />
    </group>
  )
} 