'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import * as THREE from 'three'

export interface MouseControlsOptions {
  horizontalSensitivity?: number
  verticalSensitivity?: number
  edgeThreshold?: number // % distance from center to edge that begins rotation
  bottomEdgeThreshold?: number // Additional threshold for bottom edge
  maxRotationSpeed?: number
  smoothingFactor?: number // Higher = smoother but less responsive (0-1)
  smoothingSteps?: number  // More steps = smoother but more delayed
  element?: HTMLElement | null
}

export interface MouseState {
  position: { x: number, y: number } // Normalized position (-1 to 1, 0,0 is center)
  worldPosition: { x: number, y: number } // Actual screen coordinates
  rotation: { horizontal: number, vertical: number } // Current model rotation
  isAtEdge: boolean
}

export function useMouseControls({
  horizontalSensitivity = 3.0,
  verticalSensitivity = 3.0, 
  edgeThreshold = 0.5,      // Increased from 0.15 to 0.2
  bottomEdgeThreshold = 0.4, // Increased from 0.35 to 0.4
  maxRotationSpeed = 0.04,
  smoothingFactor = 0.8,
  smoothingSteps = 6,
  element = null
}: MouseControlsOptions = {}) {
  const [mouseState, setMouseState] = useState<MouseState>({
    position: { x: 0, y: 0 },
    worldPosition: { x: 0, y: 0 },
    rotation: { horizontal: 0, vertical: 0 },
    isAtEdge: false
  })
  
  // Track rotation separately for smoother updates
  const [rotation, setRotation] = useState({ horizontal: 0, vertical: 0 })
  
  // For continuous rotation when mouse is at edge
  const isAtEdgeRef = useRef(false)
  const edgeRotationRef = useRef({ horizontal: 0, vertical: 0 })
  
  // Track if we're initialized yet
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Add continuous rotation when mouse is at edge
  useEffect(() => {
    let animationFrameId: number
    
    const updateRotation = () => {
      if (isAtEdgeRef.current) {
        setRotation(prev => ({
          horizontal: prev.horizontal + edgeRotationRef.current.horizontal,
          vertical: Math.max(
            Math.min(prev.vertical + edgeRotationRef.current.vertical, Math.PI / 2), // Allow full 90 degrees upward view
            -Math.PI / 6 // Severely limit downward view to just 30 degrees
          )
        }))
      }
      
      animationFrameId = requestAnimationFrame(updateRotation)
    }
    
    animationFrameId = requestAnimationFrame(updateRotation)
    
    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])
  
  // Modify the handleMouseMove function to improve edge detection
  const handleMouseMove = useCallback((e: Event) => {
    // Cast the event to MouseEvent
    const event = e as MouseEvent
    
    if (!element) return
    
    const rect = element.getBoundingClientRect()
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    // Calculate normalized position (-1 to 1, with 0,0 at center)
    const normalizedX = (event.clientX - rect.left - centerX) / centerX
    const normalizedY = (event.clientY - rect.top - centerY) / centerY
    
    // Store the actual screen coordinates
    const worldX = event.clientX
    const worldY = event.clientY
    
    // Calculate distance from center (0 to 1, where 1 is at the corner)
    const distanceFromCenter = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY)
    
    // Create a smaller "dead zone" in the center area
    const horizontalDeadZone = 0.4  // Increased from 0.3 to 0.4 (40% of screen width)
    const verticalDeadZone = 0.35   // Increased from 0.25 to 0.35 (35% of screen height)
    
    // Check if mouse is within the oval dead zone
    const isInDeadZone = (normalizedX * normalizedX) / (horizontalDeadZone * horizontalDeadZone) + 
                         (normalizedY * normalizedY) / (verticalDeadZone * verticalDeadZone) <= 1
    
    // Determine which threshold to use based on position
    // Make looking up even easier and looking down even harder
    const currentThreshold = normalizedY > 0 ? 0.4 : 0.1  // Bottom: 0.4 (harder, increased from 0.35), Top: 0.1 (easier, increased from 0.05)
    
    // Check if mouse is at the edge of the screen
    const isAtEdge = !isInDeadZone && distanceFromCenter > currentThreshold
    
    // Update edge state for continuous rotation
    isAtEdgeRef.current = isAtEdge
    
    // Only update rotation if at edge
    if (isAtEdge) {
      // Calculate rotation speed based on distance from threshold
      const edgeDistance = Math.max(0, distanceFromCenter - currentThreshold)
      const normalizedDistance = Math.min(edgeDistance / (1 - currentThreshold), 1)
      
      // Apply extreme dampening for downward camera movement and boost for upward
      const verticalDampening = normalizedY > 0 ? 0.4 : 1.5  // Heavily dampen down (0.4), strongly boost up (1.5)
      
      // Calculate rotation values with sensitivity and dampening
      // IMPORTANT: Negate the normalizedX to fix inverted horizontal controls
      // Moving mouse left should rotate camera left
      const horizontalRotation = -normalizedX * horizontalSensitivity * normalizedDistance * maxRotationSpeed
      
      // IMPORTANT: Negate the normalizedY to fix inverted vertical controls
      // Moving mouse up should rotate camera up
      const verticalRotation = -normalizedY * verticalSensitivity * normalizedDistance * verticalDampening * maxRotationSpeed
      
      // Store rotation values for continuous updates
      edgeRotationRef.current = {
        horizontal: horizontalRotation,
        vertical: verticalRotation
      }
    } else {
      // Reset rotation values when not at edge
      edgeRotationRef.current = { horizontal: 0, vertical: 0 }
    }
    
    // Always update mouse position
    setMouseState({
      position: { x: normalizedX, y: normalizedY },
      worldPosition: { x: worldX, y: worldY },
      rotation: rotation,
      isAtEdge
    })
  }, [element, edgeThreshold, bottomEdgeThreshold, horizontalSensitivity, verticalSensitivity, maxRotationSpeed, rotation])
  
  // Add a method to get the current state
  const getState = useCallback(() => {
    return {
      ...mouseState,
      rotation: rotation // Use the current rotation state
    }
  }, [mouseState, rotation])
  
  // Apply smoothing to the rotation
  useEffect(() => {
    // Initialize rotation history with current rotation
    if (!isInitialized) {
      setIsInitialized(true)
      return
    }
    
    // Apply smoothing to rotation
    const applySmoothing = () => {
      // Update the actual rotation with smoothing
      setRotation(prev => ({
        horizontal: prev.horizontal,
        vertical: prev.vertical
      }))
    }
    
    // Apply smoothing
    applySmoothing()
  }, [isInitialized])
  
  // Add event listeners
  useEffect(() => {
    const targetElement = element || window
    
    // Add mouse move listener
    targetElement.addEventListener('mousemove', handleMouseMove)
    
    // Cleanup
    return () => {
      targetElement.removeEventListener('mousemove', handleMouseMove)
    }
  }, [element, handleMouseMove])
  
  // Return the mouse state and methods
  return {
    mouseState,
    getState
  }
}

export default useMouseControls 