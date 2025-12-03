'use client'

import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

// Define the props interface with the speed property
interface SnowfallProps {
  count?: number
  size?: number
  area?: number
  speed?: number
}

// Global Snowfall component that covers the entire map
export function Snowfall({ 
  count = 30000, 
  size = 0.15, 
  area = 3000,
  speed = 0.6
}: SnowfallProps) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { scene, camera } = useThree()
  
  // Create a larger area for snow to ensure complete map coverage
  const [positions] = useState(() => {
    const positions = []
    
    // Distribute snowflakes evenly across the entire map area
    for (let i = 0; i < count; i++) {
      positions.push({
        // Random position within a square area
        x: (Math.random() - 0.5) * area,
        y: Math.random() * 300, // Increased height ceiling for more visible falling
        z: (Math.random() - 0.5) * area,
        // Random velocity for varied falling speeds
        velocity: Math.random() * 0.2 + 0.1 * speed, // Increased velocity range
        // Random size variation
        size: Math.random() * 0.8 + 0.7, // Increased size for better visibility
        // Random rotation
        rotation: Math.random() * Math.PI,
        // Random offset for swaying
        offset: Math.random() * Math.PI * 2
      })
    }
    
    return positions
  })
  
  useFrame((state, delta) => {
    if (!mesh.current) return
    
    const time = state.clock.getElapsedTime()
    const tempObject = new THREE.Object3D()
    
    // Get camera position to concentrate more snow around the player
    const cameraPosition = camera.position.clone()
    
    // Process all snowflakes
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      
      // Update position with falling motion
      p.y -= p.velocity
      
      // Reset height when it falls below ground
      if (p.y < -5) {
        p.y = 300 // Reset to high above the map
        
        // Concentrate more snowflakes near the camera/player
        const distanceFromCamera = Math.random() * area * 0.5
        const angle = Math.random() * Math.PI * 2
        
        if (Math.random() < 0.7) {
          // 70% of snowflakes appear closer to the camera
          p.x = cameraPosition.x + Math.cos(angle) * distanceFromCamera
          p.z = cameraPosition.z + Math.sin(angle) * distanceFromCamera
        } else {
          // 30% of snowflakes distributed across the entire area
          p.x = (Math.random() - 0.5) * area
          p.z = (Math.random() - 0.5) * area
        }
      }
      
      // Add some gentle swaying motion
      const swayX = Math.sin(time * 0.5 + p.offset) * 0.5
      const swayZ = Math.cos(time * 0.3 + p.offset) * 0.5
      
      // Set the position and rotation
      tempObject.position.set(
        p.x + swayX, 
        p.y, 
        p.z + swayZ
      )
      tempObject.rotation.set(p.rotation, p.rotation, p.rotation)
      tempObject.scale.set(p.size * size, p.size * size, p.size * size)
      tempObject.updateMatrix()
      
      // Update the instance matrix
      mesh.current.setMatrixAt(i, tempObject.matrix)
    }
    
    // Update the instance matrix
    mesh.current.instanceMatrix.needsUpdate = true
  })
  
  return (
    <>
      {/* Snowflakes */}
      <instancedMesh 
        ref={mesh} 
        args={[undefined, undefined, count]}
        frustumCulled={false} // Important: Disable frustum culling to render snow everywhere
      >
        <circleGeometry args={[1, 6]} /> {/* Using circle geometry for better performance */}
        <meshBasicMaterial color="white" transparent opacity={0.95} side={THREE.DoubleSide} />
      </instancedMesh>
    </>
  )
}
