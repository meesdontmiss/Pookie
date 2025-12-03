'use client'

import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

interface OrbitCameraProps {
  target: THREE.Vector3 | null
  distance?: number
  height?: number
  rotationSpeed?: number
  isActive: boolean
  onReset?: () => void
}

export function OrbitCamera({
  target,
  distance = 15,
  height = 8,
  rotationSpeed = 0.5,
  isActive,
  onReset
}: OrbitCameraProps) {
  const { camera } = useThree()
  const originalPosition = useRef<THREE.Vector3 | null>(null)
  const originalRotation = useRef<THREE.Euler | null>(null)
  const originalUp = useRef<THREE.Vector3 | null>(null)
  const angle = useRef(0)
  
  // Track mouse movement for manual control
  const lastMousePosition = useRef({ x: 0, y: 0 })
  const manualRotation = useRef({ horizontal: 0, vertical: 0 })
  const isMouseDown = useRef(false)
  
  // Store original camera position and rotation when orbit mode is activated
  useEffect(() => {
    if (isActive && !originalPosition.current) {
      originalPosition.current = camera.position.clone()
      originalRotation.current = camera.rotation.clone()
      originalUp.current = camera.up.clone()
      
      // Initialize manual rotation to match current angle
      manualRotation.current.horizontal = angle.current
    } else if (!isActive && originalPosition.current) {
      // Reset camera to original position and rotation when orbit mode is deactivated
      camera.position.copy(originalPosition.current)
      camera.rotation.copy(originalRotation.current!)
      camera.up.copy(originalUp.current!)
      
      // Clear stored values
      originalPosition.current = null
      originalRotation.current = null
      originalUp.current = null
      
      // Call onReset callback
      if (onReset) onReset()
    }
  }, [isActive, camera, onReset])
  
  // Handle mouse controls
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      // Only activate on middle mouse button
      if (e.button === 1) {
        e.preventDefault()
        isMouseDown.current = true
        lastMousePosition.current = { x: e.clientX, y: e.clientY }
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        isMouseDown.current = false
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown.current || !isActive || (window as any).isChatInputFocused) return
      
      // Calculate mouse movement delta
      const deltaX = e.clientX - lastMousePosition.current.x
      const deltaY = e.clientY - lastMousePosition.current.y
      
      // Update manual rotation based on mouse movement
      manualRotation.current.horizontal -= deltaX * 0.005
      manualRotation.current.vertical = Math.max(
        -Math.PI / 3, // Limit downward view
        Math.min(Math.PI / 3, manualRotation.current.vertical + deltaY * 0.005) // Limit upward view
      )
      
      // Update last mouse position
      lastMousePosition.current = { x: e.clientX, y: e.clientY }
    }
    
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isActive])
  
  // Orbit camera around target
  useFrame((_, delta) => {
    if (!isActive || !target) return
    
    // Calculate new camera position based on horizontal and vertical rotation
    const horizontalRadius = distance * Math.cos(manualRotation.current.vertical)
    const x = target.x + Math.sin(manualRotation.current.horizontal) * horizontalRadius
    const z = target.z + Math.cos(manualRotation.current.horizontal) * horizontalRadius
    const y = target.y + height + Math.sin(manualRotation.current.vertical) * distance
    
    // Update camera position
    camera.position.set(x, y, z)
    
    // Make camera look at target
    camera.lookAt(target)
    
    // Ensure camera up direction is correct
    camera.up.set(0, 1, 0)
  })
  
  return null
} 