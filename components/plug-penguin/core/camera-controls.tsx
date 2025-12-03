'use client'

import { useRef, useEffect, useState } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CAMERA_CONSTANTS } from '../utils/constants'

interface CameraControlsProps {
  target?: THREE.Object3D
  lockMouse?: boolean // Keeping for backwards compatibility
  onRotationChange?: (rotation: { x: number, y: number }) => void
}

export function CameraControls({ 
  target, 
  lockMouse = false, // Default to false now
  onRotationChange
}: CameraControlsProps) {
  const { camera, gl } = useThree()
  const rotationRef = useRef({ x: 0, y: 0 })
  const mousePositionRef = useRef({ x: 0, y: 0 })
  const targetRotationRef = useRef({ x: 0, y: 0 })
  const screenSizeRef = useRef({ width: 0, height: 0 })
  const [sensitivity, setSensitivity] = useState(1.0)
  
  // Listen for sensitivity changes from the UI
  useEffect(() => {
    const handleSensitivityChange = (e: CustomEvent) => {
      setSensitivity(e.detail)
    }
    
    window.addEventListener('sensitivityChange', handleSensitivityChange as EventListener)
    
    return () => {
      window.removeEventListener('sensitivityChange', handleSensitivityChange as EventListener)
    }
  }, [])
  
  // Edge detection settings - use constants from CAMERA_CONSTANTS
  const edgeThreshold = CAMERA_CONSTANTS.EDGE_THRESHOLD
  const maxRotationSpeed = CAMERA_CONSTANTS.MAX_ROTATION_SPEED
  
  // Set up edge-based mouse controls
  useEffect(() => {
    const canvas = gl.domElement
    const updateScreenSize = () => {
      screenSizeRef.current = {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }
    
    // Initial size calculation
    updateScreenSize()
    
    const handleMouseMove = (e: MouseEvent) => {
      // Store the current mouse position
      mousePositionRef.current = {
        x: e.clientX,
        y: e.clientY
      }
      
      // Calculate rotation based on mouse movement
      if (document.pointerLockElement === gl.domElement) {
        // Apply sensitivity to mouse movement
        const adjustedSensitivity = CAMERA_CONSTANTS.MOUSE_SENSITIVITY * sensitivity
        
        // Update rotation based on mouse movement with sensitivity applied
        rotationRef.current.y -= e.movementX * adjustedSensitivity
        rotationRef.current.x -= e.movementY * adjustedSensitivity
        
        // Clamp vertical rotation
        rotationRef.current.x = Math.max(
          -CAMERA_CONSTANTS.LOOK_UP_LIMIT,
          Math.min(CAMERA_CONSTANTS.LOOK_DOWN_LIMIT, rotationRef.current.x)
        )
      }
    }
    
    const handleResize = () => {
      updateScreenSize()
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
    }
  }, [gl, sensitivity])
  
  // Update camera rotation based on mouse position relative to screen edges
  useFrame((_, delta) => {
    if (!target) return
    
    const mousePos = mousePositionRef.current
    const screenSize = screenSizeRef.current
    
    // Calculate distance from edges
    const distanceFromLeft = mousePos.x
    const distanceFromRight = screenSize.width - mousePos.x
    const distanceFromTop = mousePos.y
    const distanceFromBottom = screenSize.height - mousePos.y
    
    // Calculate rotation based on edge proximity
    let rotationSpeedY = 0
    let rotationSpeedX = 0
    
    // Helper function for smoother edge detection with cubic falloff
    const calculateIntensity = (distance: number, threshold: number) => {
      if (distance >= threshold) return 0
      // Cubic falloff for smoother acceleration (more responsive at edges)
      return Math.pow(1 - (distance / threshold), 3)
    }
    
    // Horizontal rotation (left/right)
    const leftIntensity = calculateIntensity(distanceFromLeft, edgeThreshold)
    const rightIntensity = calculateIntensity(distanceFromRight, edgeThreshold)
    rotationSpeedY = (leftIntensity - rightIntensity) * maxRotationSpeed
    
    // Vertical rotation (up/down)
    const topIntensity = calculateIntensity(distanceFromTop, edgeThreshold)
    const bottomIntensity = calculateIntensity(distanceFromBottom, edgeThreshold)
    rotationSpeedX = (-topIntensity + bottomIntensity) * maxRotationSpeed
    
    // Apply sensitivity to rotation speed
    rotationSpeedY *= sensitivity
    rotationSpeedX *= sensitivity
    
    // Apply rotation to camera with delta time for consistent speed
    const rotationDeltaY = rotationSpeedY * delta * CAMERA_CONSTANTS.MOUSE_SENSITIVITY * 100
    const rotationDeltaX = rotationSpeedX * delta * CAMERA_CONSTANTS.MOUSE_SENSITIVITY * 100
    
    // Update target rotation with limits for looking up/down
    targetRotationRef.current = {
      x: Math.max(
        -CAMERA_CONSTANTS.LOOK_UP_LIMIT,
        Math.min(CAMERA_CONSTANTS.LOOK_DOWN_LIMIT, targetRotationRef.current.x + rotationDeltaX)
      ),
      y: targetRotationRef.current.y + rotationDeltaY
    }
    
    // Smoothly interpolate current rotation towards target rotation
    const smoothing = 0.15 // Lower = smoother but slower response
    rotationRef.current = {
      x: rotationRef.current.x + (targetRotationRef.current.x - rotationRef.current.x) * smoothing,
      y: rotationRef.current.y + (targetRotationRef.current.y - rotationRef.current.y) * smoothing
    }
    
    // Notify about rotation change
    if (onRotationChange) {
      onRotationChange(rotationRef.current)
    }
    
    // Calculate ideal camera position based on target and rotation
    const phi = rotationRef.current.x // vertical angle
    const theta = rotationRef.current.y // horizontal angle
    
    // Calculate ideal offset using spherical coordinates
    const distance = CAMERA_CONSTANTS.CAMERA_DISTANCE
    const offsetX = distance * Math.sin(theta) * Math.cos(phi)
    const offsetY = distance * Math.sin(phi)
    const offsetZ = distance * Math.cos(theta) * Math.cos(phi)
    
    // Apply offset to target position
    const targetPosition = new THREE.Vector3()
    if (target) {
      targetPosition.copy(target.position)
      
      // Add player height offset for better viewing angle
      targetPosition.y += CAMERA_CONSTANTS.PLAYER_HEIGHT
      
      // Set camera position by adding offset to target
      camera.position.set(
        targetPosition.x + offsetX,
        targetPosition.y + offsetY,
        targetPosition.z + offsetZ
      )
      
      // Look at target (slightly above their position)
      camera.lookAt(
        targetPosition.x,
        targetPosition.y + CAMERA_CONSTANTS.LOOK_AT_HEIGHT_OFFSET,
        targetPosition.z
      )
    }
  })
  
  return null
}