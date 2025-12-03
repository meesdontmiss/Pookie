/**
 * Movement Mechanics Configuration - Final Version
 * 
 * This file contains the core movement mechanics extracted from the Player component.
 * These functions can be imported and used to ensure consistent movement behavior.
 */

import * as THREE from 'three'

// Movement constants
export const MOVEMENT_CONFIG = {
  defaultSpeed: 5,
  sprintMultiplier: 2,
  jumpHeight: 1.0,
  gravity: 9.8,
  
  // Default camera rotation
  defaultHorizontalSensitivity: 2.0,
  defaultVerticalSensitivity: 1.8
}

// Interface for key state tracking
export interface MovementKeyState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  jump: boolean
  shift: boolean
  trick1: boolean
  trick2: boolean
  action: boolean
}

// Core movement calculation function
export function calculateMovementDirection(
  keys: MovementKeyState, 
  rotation: { horizontal: number, vertical: number },
  speed: number = MOVEMENT_CONFIG.defaultSpeed,
  delta: number
): THREE.Vector3 {
  const direction = new THREE.Vector3()
  let isMoving = false
  
  // Calculate sprint speed
  const currentSpeed = keys.shift 
    ? speed * MOVEMENT_CONFIG.sprintMultiplier 
    : speed
  
  // Calculate forward/backward direction
  if (keys.forward) {
    direction.z = -1
    isMoving = true
  } else if (keys.backward) {
    direction.z = 1
    isMoving = true
  }
  
  // Calculate left/right direction
  if (keys.left) {
    direction.x = -1
    isMoving = true
  } else if (keys.right) {
    direction.x = 1
    isMoving = true
  }
  
  // Only normalize and apply rotation if we're actually moving
  if (direction.length() > 0) {
    direction.normalize().multiplyScalar(currentSpeed * delta)
    
    // Apply player's rotation to movement direction
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.horizontal)
  }
  
  return direction
}

// Calculate initial jump velocity based on desired jump height
export function calculateJumpVelocity(jumpHeight: number = MOVEMENT_CONFIG.jumpHeight): number {
  return Math.sqrt(2 * MOVEMENT_CONFIG.gravity * jumpHeight)
}

// Apply gravity to jumping movement
export function applyGravity(
  currentVelocity: number, 
  delta: number, 
  gravity: number = MOVEMENT_CONFIG.gravity
): number {
  return currentVelocity - gravity * delta
}

// Apply movement to an object
export function applyMovement(
  object: THREE.Object3D,
  direction: THREE.Vector3, 
  jumpVelocity: number | null = null,
  delta: number
): boolean {
  const wasJumping = object.position.y > 0.5
  
  // Apply horizontal movement
  object.position.x += direction.x
  object.position.z += direction.z
  
  // Apply vertical movement if jumping
  if (jumpVelocity !== null) {
    object.position.y += jumpVelocity * delta
    
    // Check if landed (assuming ground is at y=0.5)
    if (object.position.y <= 0.5 && jumpVelocity < 0) {
      object.position.y = 0.5
      return false // No longer jumping
    }
    
    return true // Still jumping
  }
  
  return wasJumping // Return previous jump state if no jump velocity provided
}

// Apply rotation to player model
export function applyRotation(
  object: THREE.Object3D,
  rotation: { horizontal: number, vertical: number }
): void {
  const playerRotation = new THREE.Euler(0, rotation.horizontal, 0, 'YXZ')
  object.rotation.copy(playerRotation)
}

// Movement helper that combines all movement functions
export function handlePlayerMovement(
  playerRef: React.RefObject<THREE.Group>,
  keys: MovementKeyState,
  rotation: { horizontal: number, vertical: number },
  isJumping: boolean,
  jumpVelocity: number,
  speed: number,
  delta: number
): {
  newIsJumping: boolean,
  newJumpVelocity: number,
  isMoving: boolean
} {
  if (!playerRef.current) return { newIsJumping: isJumping, newJumpVelocity: jumpVelocity, isMoving: false }
  
  // Calculate movement direction
  const direction = calculateMovementDirection(keys, rotation, speed, delta)
  const isMoving = direction.length() > 0
  
  // Handle jumping
  let newJumpVelocity = jumpVelocity
  let newIsJumping = isJumping
  
  if (keys.jump && !isJumping) {
    newIsJumping = true
    newJumpVelocity = calculateJumpVelocity()
  }
  
  if (isJumping) {
    // Apply gravity
    newJumpVelocity = applyGravity(jumpVelocity, delta)
  }
  
  // Apply movement
  if (!isMoving) {
    if (isJumping) {
      // If we're jumping but not moving horizontally, just apply vertical movement
      newIsJumping = applyMovement(playerRef.current, new THREE.Vector3(0, 0, 0), newJumpVelocity, delta)
      if (!newIsJumping) newJumpVelocity = 0
    }
  } else {
    // Apply full movement
    newIsJumping = applyMovement(playerRef.current, direction, isJumping ? newJumpVelocity : null, delta)
    if (!newIsJumping && isJumping) newJumpVelocity = 0
  }
  
  // Apply rotation
  applyRotation(playerRef.current, rotation)
  
  return { newIsJumping, newJumpVelocity, isMoving }
} 