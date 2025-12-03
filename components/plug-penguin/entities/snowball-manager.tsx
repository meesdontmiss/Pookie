'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Snowball, SnowImpact } from './snowball'

// Constants for snowball throwing
const MIN_THROW_VELOCITY = 20
const MAX_THROW_VELOCITY = 100 // Increased from 60 for higher throws
const THROW_COOLDOWN = 200 // ms
const BASE_UPWARD_FORCE = 12 // Doubled from 6 for much higher arcs
const VERTICAL_AIM_MULTIPLIER = 25.0 // Increased from 15.0 for more dramatic vertical throwing

// For tracking snowballs and impacts
interface ActiveSnowball {
  id: string
  position: THREE.Vector3
  velocity: THREE.Vector3
}

interface ActiveImpact {
  id: string
  position: THREE.Vector3
  type: 'ground' | 'tree' // Add collision type
}

export interface SnowballManagerRef {
  throwSnowball: (
    startPosition: THREE.Vector3, 
    direction: THREE.Vector3, 
    power: number
  ) => void
}

export const SnowballManager = forwardRef<SnowballManagerRef>((props, ref) => {
  const [snowballs, setSnowballs] = useState<ActiveSnowball[]>([])
  const [impacts, setImpacts] = useState<ActiveImpact[]>([])
  const lastThrowTimeRef = useRef(0)
  const { camera } = useThree()
  
  // Generate a new snowball
  const throwSnowball = (
    startPosition: THREE.Vector3, 
    direction: THREE.Vector3, 
    power: number = 1.0
  ) => {
    console.log("SnowballManager: throwSnowball called", { startPosition, direction, power })
    
    // Check cooldown
    const now = Date.now()
    if (now - lastThrowTimeRef.current < THROW_COOLDOWN) {
      console.log("Throw on cooldown, ignoring")
      return
    }
    
    lastThrowTimeRef.current = now
    
    // Apply the same POWER_SCALE_MULTIPLIER as in player.tsx if power ≤ 1.0
    // This handles the case where the power comes from player component
    const scaledPower = power <= 1.0 ? power * 3.0 : power;
    
    // Calculate base velocity based on power with predictable scaling
    const speed = MIN_THROW_VELOCITY + (MAX_THROW_VELOCITY - MIN_THROW_VELOCITY) * scaledPower
    
    // Store original vertical component (pitch) for trajectory adjustment
    const verticalAimFactor = direction.y
    
    // Decompose the direction: use direction for horizontal, add upward force for arc
    const horizontalDirection = direction.clone()
    horizontalDirection.y = 0 // Zero out the vertical component
    
    // Normalize if not zero length
    if (horizontalDirection.lengthSq() > 0.001) {
      horizontalDirection.normalize()
    } else {
      // If looking straight up/down, use camera forward direction for horizontal
      const cameraForward = new THREE.Vector3(0, 0, -1)
      cameraForward.applyQuaternion(camera.quaternion)
      cameraForward.y = 0
      cameraForward.normalize()
      horizontalDirection.copy(cameraForward)
    }
    
    // Create velocity vector with proper arc trajectory
    const velocity = new THREE.Vector3()
    
    // Add horizontal direction component 
    velocity.x = horizontalDirection.x * speed
    velocity.z = horizontalDirection.z * speed
    
    // Calculate vertical component for the arc with a smoother power curve
    // This ensures better consistency between different throw powers
    const powerCurve = 0.4 + scaledPower * 0.6 // Smoother power scaling
    const verticalComponent = BASE_UPWARD_FORCE * powerCurve
    
    // Apply vertical aim adjustment - simpler and more predictable formula
    if (verticalAimFactor < -0.3) {
      // Downward throws - reduce arc more with steeper angle
      const downwardFactor = Math.max(0, 1 + verticalAimFactor * 2)
      velocity.y = verticalComponent * downwardFactor + verticalAimFactor * VERTICAL_AIM_MULTIPLIER
    } else {
      // Level or upward throws
      velocity.y = verticalComponent + verticalAimFactor * VERTICAL_AIM_MULTIPLIER
    }
    
    // Add a small random variation for natural feel (but less than before)
    velocity.x += (Math.random() - 0.5) * 0.5
    velocity.y += (Math.random() - 0.5) * 0.3
    velocity.z += (Math.random() - 0.5) * 0.5
    
    console.log("Throwing snowball with velocity", velocity)
    
    // Add new snowball
    const newSnowball: ActiveSnowball = {
      id: `snowball-${now}-${Math.random()}`,
      position: startPosition.clone(),
      velocity
    }
    
    setSnowballs(prev => [...prev, newSnowball])
  }
  
  // Expose the throwSnowball method to parent components
  useImperativeHandle(ref, () => ({
    throwSnowball
  }), [])
  
  // Handle snowball collision
  const handleSnowballCollision = (position: THREE.Vector3, id: string, isTreeCollision = false) => {
    console.log(`Snowball collision at ${position}, type: ${isTreeCollision ? 'tree' : 'ground'}`)
    
    // Add impact effect
    const newImpact: ActiveImpact = {
      id: `impact-${Date.now()}-${Math.random()}`,
      position: position.clone(),
      type: isTreeCollision ? 'tree' : 'ground'
    }
    
    setImpacts(prev => [...prev, newImpact])
    
    // Remove the snowball
    setSnowballs(prev => prev.filter(ball => ball.id !== id))
  }
  
  // Handle snowball expiration (timeout or out of bounds)
  const handleSnowballExpire = (id: string) => {
    setSnowballs(prev => prev.filter(ball => ball.id !== id))
  }
  
  // Handle impact effect completion
  const handleImpactFinished = (id: string) => {
    setImpacts(prev => prev.filter(impact => impact.id !== id))
  }
  
  return (
    <group name="snowball-manager">
      {/* Render active snowballs */}
      {snowballs.map(snowball => (
        <Snowball
          key={snowball.id}
          position={snowball.position}
          velocity={snowball.velocity}
          onCollision={(pos, isTree = false) => handleSnowballCollision(pos, snowball.id, isTree)}
          onExpire={() => handleSnowballExpire(snowball.id)}
        />
      ))}
      
      {/* Render impact effects */}
      {impacts.map(impact => (
        impact.type === 'tree' ? (
          <TreeImpact
            key={impact.id}
            position={impact.position}
            onFinished={() => handleImpactFinished(impact.id)}
          />
        ) : (
          <SnowImpact
            key={impact.id}
            position={impact.position}
            onFinished={() => handleImpactFinished(impact.id)}
          />
        )
      ))}
    </group>
  )
})

// Export a named component for easier reference
SnowballManager.displayName = 'SnowballManager';

interface TreeImpactProps {
  position: THREE.Vector3
  onFinished: () => void
}

// Tree impact effect with wood splinters and snow
export function TreeImpact({ position, onFinished }: TreeImpactProps) {
  const [particles, setParticles] = useState<{ 
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    color: string,
    size: number
  }[]>([])
  const particleGroupRef = useRef<THREE.Group>(null)
  const startTimeRef = useRef(Date.now())
  
  // Debug log on mount
  useEffect(() => {
    console.log("TreeImpact created at", position)
    
    return () => {
      console.log("TreeImpact removed")
    }
  }, [position])
  
  // Create particles on mount - more particles and different colors
  useEffect(() => {
    const newParticles = []
    // Create snow particles
    for (let i = 0; i < 15; i++) {
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 1.5, // More upward bias
        Math.random() * 2 - 1
      ).normalize()
      
      newParticles.push({
        position: direction.clone().multiplyScalar(Math.random() * 0.1), // Start near impact point
        velocity: direction.multiplyScalar(Math.random() * 2 + 2), // Faster
        color: "#ffffff", // Snow white
        size: Math.random() * 0.1 + 0.05
      })
    }
    
    // Create wood splinter particles
    for (let i = 0; i < 10; i++) {
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 0.8, // Less upward bias
        Math.random() * 2 - 1
      ).normalize()
      
      // Random wood colors
      const woodColors = ["#3e2723", "#4e342e", "#5d4037", "#6d4c41"]
      const color = woodColors[Math.floor(Math.random() * woodColors.length)]
      
      newParticles.push({
        position: direction.clone().multiplyScalar(Math.random() * 0.1), // Start near impact point
        velocity: direction.multiplyScalar(Math.random() * 3 + 2), // Faster
        color: color,
        size: Math.random() * 0.15 + 0.05 // Bigger for wood chips
      })
    }
    
    // Create some tree needle particles
    for (let i = 0; i < 8; i++) {
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 1.2, // Medium upward bias
        Math.random() * 2 - 1
      ).normalize()
      
      // Green needle colors
      const needleColors = ["#1b5e20", "#2e7d32", "#388e3c", "#43a047"]
      const color = needleColors[Math.floor(Math.random() * needleColors.length)]
      
      newParticles.push({
        position: direction.clone().multiplyScalar(Math.random() * 0.1), // Start near impact point
        velocity: direction.multiplyScalar(Math.random() * 2.5 + 1.5), // Medium speed
        color: color,
        size: Math.random() * 0.08 + 0.02 // Smaller for needles
      })
    }
    
    setParticles(newParticles)
  }, [])
  
  // Animate particles with physics
  useFrame(() => {
    if (!particleGroupRef.current) return
    
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    
    // Remove effect after 1.5 seconds
    if (elapsed > 1.5) {
      console.log("TreeImpact finished animation")
      onFinished()
      return
    }
    
    // Update particle positions and apply gravity
    const children = particleGroupRef.current.children
    for (let i = 0; i < children.length; i++) {
      const particle = children[i] as THREE.Mesh
      if (!particle.userData.velocity) continue
      
      // Apply gravity and update position
      particle.userData.velocity.y -= 9.8 * 0.016 // gravity
      particle.position.x += particle.userData.velocity.x * 0.016
      particle.position.y += particle.userData.velocity.y * 0.016
      particle.position.z += particle.userData.velocity.z * 0.016
      
      // Add rotation for more dynamism
      particle.rotation.x += particle.userData.velocity.length() * 0.1
      particle.rotation.z += particle.userData.velocity.length() * 0.1
      
      // Scale down as they fall for fade out effect
      const scale = Math.max(0, 1 - elapsed / 1.5)
      particle.scale.set(scale, scale, scale)
    }
  })
  
  return (
    <group 
      ref={particleGroupRef}
      position={[position.x, position.y, position.z]}
    >
      {particles.map((particle, i) => (
        <mesh 
          key={i} 
          position={particle.position}
          userData={{ velocity: particle.velocity }}
        >
          {/* Use different geometries based on particle type */}
          {particle.color === "#ffffff" ? (
            <sphereGeometry args={[particle.size, 8, 8]} />
          ) : particle.color.startsWith("#3") || particle.color.startsWith("#4") || 
              particle.color.startsWith("#5") || particle.color.startsWith("#6") ? (
            <boxGeometry args={[particle.size * 1.5, particle.size * 0.5, particle.size * 0.5]} />
          ) : (
            <cylinderGeometry args={[0.01, 0.01, particle.size * 2, 4]} />
          )}
          <meshStandardMaterial 
            color={particle.color} 
            roughness={0.8}
            metalness={0.1}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  )
} 