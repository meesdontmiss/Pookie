'use client'

import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface FatJointProps {
  position?: [number, number, number] | number
  rotation?: [number, number, number] | number
  scale?: [number, number, number] | number
  onClick?: () => void
  floating?: boolean
  [key: string]: any
}

export function FatJoint({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = 1,
  onClick = () => {},
  floating = true,
  ...props 
}: FatJointProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { scene } = useGLTF('/models/consumables/fat_joint.glb')
  
  // Clone the model on mount
  useEffect(() => {
    if (!groupRef.current) return
    
    // Clear any existing children
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0])
    }
    
    // Clone the model and add it to the group
    const modelClone = scene.clone()
    groupRef.current.add(modelClone)
    
    // Clean up function
    return () => {
      if (groupRef.current) {
        // Remove all children
        while (groupRef.current.children.length > 0) {
          groupRef.current.remove(groupRef.current.children[0])
        }
      }
    }
  }, [scene])
  
  // Handle floating/spinning animation
  useFrame(({ clock }) => {
    if (!groupRef.current) return
    
    const time = clock.getElapsedTime()
    
    // Floating animation
    if (floating) {
      // Slow up and down floating motion
      const floatY = Math.sin(time * 0.8) * 0.1
      groupRef.current.position.y = positionArray[1] + floatY
      
      // Slow spinning rotation
      groupRef.current.rotation.y = rotationArray[1] + time * 0.5
    }
  })
  
  // Convert position, rotation, and scale to the correct format
  const positionArray: [number, number, number] = Array.isArray(position) 
    ? position 
    : [position as number, 0, 0]
    
  const rotationArray: [number, number, number] = Array.isArray(rotation) 
    ? rotation 
    : [0, rotation as number, 0]
    
  const scaleArray: [number, number, number] = Array.isArray(scale) 
    ? scale 
    : [scale as number, scale as number, scale as number]
  
  return (
    <group 
      ref={groupRef} 
      position={positionArray} 
      rotation={rotationArray}
      scale={scaleArray}
      onClick={onClick}
      {...props}
    />
  )
} 