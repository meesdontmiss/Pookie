'use client'

import React, { useRef, useEffect, useState, forwardRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import { useGameStore } from '@/lib/store'
import { useKeyboardControls } from '../hooks/use-keyboard-controls'

interface PlayerProps {
  position?: [number, number, number]
  onPlayerLoaded?: () => void
  onPositionChange?: (position: THREE.Vector3) => void
  horizontalSensitivity: number
  verticalSensitivity: number
  controlsEnabled: boolean
}

// Constants for player movement and camera
const MOVEMENT_SPEED = 50.0
const SPRINT_MULTIPLIER = 2.0
const ACCELERATION = 0.6
const DECELERATION = 0.4
const JUMP_HEIGHT = 1.0
const JUMP_MULTIPLIER = 8.0  // Added for jump force calculation
const GRAVITY = 25.0
const CAMERA_HEIGHT = 5.0
const CAMERA_DISTANCE = 10.0
const LOOK_AHEAD_DISTANCE = 12.0
const SHOULDER_OFFSET = 1.0
const GROUND_LEVEL = 0.0

export const Player = forwardRef<THREE.Group, PlayerProps>(({ 
  position = [0, GROUND_LEVEL, 0],
  onPlayerLoaded,
  onPositionChange,
  horizontalSensitivity,
  verticalSensitivity,
  controlsEnabled
}, ref) => {
  // Refs for physics
  const playerRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const mouseRotation = useRef({ x: 0, y: 0 })
  // Store the last rotation state to preserve it between pointer lock changes
  const savedRotation = useRef({ x: 0, y: 0 })
  const isPointerLocked = useRef(false)
  const hasExitedOnce = useRef(false) // Track if we've exited at least once
  const velocity = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0))
  const jumpVelocity = useRef(0)
  const jumpHeightRef = useRef(0)  // Track actual jump height
  const isJumping = useRef(false)
  const lastJumpTime = useRef(0)  // Add this to prevent rapid jumps
  const keyboardControls = useRef({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    jump: false,
    sprint: false
  })
  const canJump = useRef(true)
  const isMoving = useRef<boolean>(false)
  const currentSpeed = useRef<number>(MOVEMENT_SPEED)
  const initialPositionSet = useRef(false)
  const cameraPositionOffset = useRef(new THREE.Vector3(0, 0, 0))
  
  // Access the camera and scene
  const { camera } = useThree()
  
  // Load the Pookie model
  const { scene: pookieModel } = useGLTF('/models/POOKIE.glb')
  
  // Helper to check if element is a UI element that should prevent interaction
  const isUIElement = (target: HTMLElement): boolean => {
    // First check for common dev tools elements specifically
    if (
      target.closest('.dev-tools-button') ||
      target.closest('[data-no-engage]') ||
      target.closest('.dev-tools')
    ) {
      console.log('Clicking on dev tools, preventing game engagement');
      return true;
    }
    
    // Then check for other UI elements
    return Boolean(
      target.tagName === 'BUTTON' || 
      target.tagName === 'INPUT' || 
      target.tagName === 'SELECT' ||
      target.tagName === 'TEXTAREA' ||
      target.closest('button') || 
      target.closest('input') ||
      target.closest('select') ||
      target.closest('textarea') ||
      target.closest('.controls-panel') ||
      target.closest('.ui-element') ||
      target.closest('[data-ui]') ||
      target.closest('.settings-panel') ||
      target.closest('.control-panel') ||
      target.closest('.collision-toolbar') ||
      target.closest('.chat-container') ||
      target.closest('.mini-map') ||
      target.closest('.game-ui') ||
      target.closest('.inventory') ||
      target.closest('dialog') ||
      target.closest('.modal') ||
      target.closest('.slider') ||
      target.closest('.dropdown') ||
      target.closest('.menu') ||
      // Handle any element with onClick or event listeners
      target.onclick !== null ||
      target.hasAttribute('role')
    );
  }
  
  // Set up model when loaded
  useEffect(() => {
    if (pookieModel && playerRef.current) {
      // Clear any existing models
      if (modelRef.current) {
        playerRef.current.remove(modelRef.current)
      }
      
      // Clone the model
      const model = pookieModel.clone()
      
      // Fix model scaling and rotation to prevent distortion
      // model.scale.set(0.95, 1, 0.95) // Slightly reduce X and Z scale to fix contortion - TEMPORARILY REVERTED
      model.scale.set(1, 1, 1) // TEMPORARILY SET TO UNIFORM SCALING
      
      // Reset rotation to face forward (away from camera)
      model.rotation.set(0, Math.PI + Math.PI / 2, 0) // Rotated 90 degrees counter-clockwise
      model.position.set(0, 0, 0)
      
      // Apply proper transformations to all child meshes to ensure consistent appearance
      model.traverse((child) => {
        if ((child as any).isMesh) {
          const meshChild = child as THREE.Mesh;
          meshChild.castShadow = true;
          meshChild.receiveShadow = true;
          
          // Log properties for potential eye meshes
          const nameLower = meshChild.name.toLowerCase();
          if (nameLower.includes('eye') || nameLower.includes('pupil') || nameLower.includes('cornea') || nameLower.includes('iris') || nameLower.includes('sclera')) {
            console.log(`Eye Mesh Found: ${meshChild.name}`, meshChild);
            if (meshChild.material) {
              if (Array.isArray(meshChild.material)) {
                meshChild.material.forEach((mat, index) => {
                  console.log(`Eye Material (${meshChild.name}, index ${index}):`, {
                    name: mat.name,
                    transparent: mat.transparent,
                    alphaTest: mat.alphaTest,
                    depthWrite: mat.depthWrite,
                    depthTest: mat.depthTest,
                    side: mat.side,
                    visible: mat.visible,
                    opacity: mat.opacity,
                    blending: mat.blending,
                    // Add any other properties you suspect
                  });
                });
              } else {
                const mat = meshChild.material as THREE.MeshStandardMaterial; // Or appropriate type
                console.log(`Eye Material (${meshChild.name}):`, {
                  name: mat.name,
                  transparent: mat.transparent,
                  alphaTest: mat.alphaTest,
                  depthWrite: mat.depthWrite,
                  depthTest: mat.depthTest,
                  side: mat.side,
                  visible: mat.visible,
                  opacity: mat.opacity,
                  blending: mat.blending,
                  // Add any other properties you suspect
                });
              }
            }
          }

          if (meshChild.material) {
            if (Array.isArray(meshChild.material)) {
              meshChild.material.forEach(mat => mat.needsUpdate = true);
            } else {
              (meshChild.material as THREE.Material).needsUpdate = true;
            }
          }
        }
      })
      
      // Store the cloned scene in modelRef
      modelRef.current = model
      
      // Add model to player group
      playerRef.current.clear()
      playerRef.current.add(model)
      
      // Set initial position above ground
      playerRef.current.position.y = GROUND_LEVEL
      
      if (onPlayerLoaded) {
        onPlayerLoaded()
      }
    }
  }, [pookieModel, onPlayerLoaded])

  // Set up camera FOV on mount
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 70 // Wider FOV
      camera.updateProjectionMatrix()
    }
  }, [camera])

  // Set up keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((window as any).isChatInputFocused) return

      switch (e.code) {
        case 'KeyW':
          keyboardControls.current.moveForward = true
          break
        case 'KeyS':
          keyboardControls.current.moveBackward = true
          break
        case 'KeyA':
          keyboardControls.current.moveLeft = true
          break
        case 'KeyD':
          keyboardControls.current.moveRight = true
          break
        case 'Space':
          if (!isJumping.current) {
            isJumping.current = true
            jumpVelocity.current = JUMP_HEIGHT * JUMP_MULTIPLIER
          }
          keyboardControls.current.jump = true
          break
        case 'ShiftLeft':
          keyboardControls.current.sprint = true
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          keyboardControls.current.moveForward = false
          break
        case 'KeyS':
          keyboardControls.current.moveBackward = false
          break
        case 'KeyA':
          keyboardControls.current.moveLeft = false
          break
        case 'KeyD':
          keyboardControls.current.moveRight = false
          break
        case 'Space':
          keyboardControls.current.jump = false
          break
        case 'ShiftLeft':
          keyboardControls.current.sprint = false
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Handle mouse input and pointer lock
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isPointerLocked.current || !controlsEnabled) return

      // Update rotation with full 360° horizontal and adjusted vertical movement
      // Keeping full upward range of ~210 degrees but limiting downward to ~105 degrees (half of previous)
      mouseRotation.current.x = (mouseRotation.current.x - e.movementX * 0.003 * horizontalSensitivity) % (Math.PI * 2)
      mouseRotation.current.y = Math.max(
        -Math.PI * 0.6, // Reduced downward limit from -1.2 to -0.6 (half)
        Math.min(Math.PI * 1.2, mouseRotation.current.y - e.movementY * 0.003 * verticalSensitivity) // Keep same upward limit
      )
      
      // IMPORTANT: Always keep savedRotation in sync with current rotation
      // This ensures we always have the latest rotation values even before the first ESC press
      savedRotation.current.x = mouseRotation.current.x
      savedRotation.current.y = mouseRotation.current.y
    }

    const handlePointerLockChange = () => {
      if (document.pointerLockElement === document.body) {
        console.log('Pointer locked');
        isPointerLocked.current = true;
        // Restore saved rotation when pointer lock is re-engaged
        mouseRotation.current.x = savedRotation.current.x;
        mouseRotation.current.y = savedRotation.current.y;
      } else {
        console.log('Pointer unlocked');
        isPointerLocked.current = false;
        hasExitedOnce.current = true; // Mark that pointer lock has been exited at least once
        // Save current rotation when pointer lock is disengaged
        savedRotation.current.x = mouseRotation.current.x;
        savedRotation.current.y = mouseRotation.current.y;
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Check if the click target is a UI element
      if (e.target instanceof HTMLElement && isUIElement(e.target)) {
        console.log('Clicked on UI element, not locking pointer.');
        return; // Don't lock pointer if it's a UI element
      }

      if (!isPointerLocked.current && controlsEnabled) {
        document.body.requestPointerLock();
      }
    };

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('pointerlockchange', handlePointerLockChange)
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('pointerlockchange', handlePointerLockChange)
      document.removeEventListener('click', handleClick)
    }
  }, [horizontalSensitivity, verticalSensitivity, controlsEnabled])
  
  // Game loop with condition for camera positioning
  useFrame((state, delta) => {
    if (!playerRef.current || (window as any).isChatInputFocused) return

    // Get keyboard input from our ref
    const keys = {
      forward: keyboardControls.current.moveForward,
      backward: keyboardControls.current.moveBackward,
      left: keyboardControls.current.moveLeft,
      right: keyboardControls.current.moveRight,
      jump: keyboardControls.current.jump,
      shift: keyboardControls.current.sprint
    }
    
    // Calculate movement direction based on keys and player rotation
    const moveDirection = new THREE.Vector3(0, 0, 0)
    
    // Forward/backward movement in the direction the player is facing
    if (keys.forward) moveDirection.z -= 1
    if (keys.backward) moveDirection.z += 1
    
    // Left/right movement perpendicular to the direction the player is facing
    if (keys.left) moveDirection.x -= 1
    if (keys.right) moveDirection.x += 1
    
    // Normalize the movement direction if moving diagonally
    if (moveDirection.length() > 0) {
      moveDirection.normalize()
      isMoving.current = true
    } else {
      isMoving.current = false
    }
    
    // Apply player rotation to movement direction
    moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), mouseRotation.current.x)
    
    // Handle sprint
    if (keys.shift) {
      currentSpeed.current = MOVEMENT_SPEED * SPRINT_MULTIPLIER
    } else {
      currentSpeed.current = MOVEMENT_SPEED
    }
    
    // Apply acceleration/deceleration for smoother movement
    if (isMoving.current) {
      // Accelerate towards target velocity
      velocity.current.x += (moveDirection.x * currentSpeed.current - velocity.current.x) * ACCELERATION
      velocity.current.z += (moveDirection.z * currentSpeed.current - velocity.current.z) * ACCELERATION
    } else {
      // Decelerate to stop
      velocity.current.x *= (1 - DECELERATION)
      velocity.current.z *= (1 - DECELERATION)
      
      // Prevent very small movements
      if (Math.abs(velocity.current.x) < 0.01) velocity.current.x = 0
      if (Math.abs(velocity.current.z) < 0.01) velocity.current.z = 0
    }
    
    // Apply velocity to position
    playerRef.current.position.x += velocity.current.x * delta
    playerRef.current.position.z += velocity.current.z * delta
    
    // Handle jumping with reference implementation's approach
    if (isJumping.current) {
      // Apply gravity to jump velocity
      jumpVelocity.current -= GRAVITY * delta
      
      // Move player up/down
      jumpHeightRef.current += jumpVelocity.current * delta
      
      // Check if we've landed
      if (jumpHeightRef.current <= 0) {
        jumpHeightRef.current = 0
        jumpVelocity.current = 0
        isJumping.current = false
      }
    }
    
    // Apply final position with jump height
    playerRef.current.position.y = GROUND_LEVEL + jumpHeightRef.current
      
    // Ensure player model rotates to match camera direction
    playerRef.current.rotation.y = mouseRotation.current.x

    // Position the camera for 3rd person view - handle both locked and unlocked states properly
    if (state.camera) {
      // When pointer is not locked but we've exited at least once,
      // use savedRotation instead of mouseRotation
      const effectiveRotation = !isPointerLocked.current && hasExitedOnce.current 
        ? savedRotation.current 
        : mouseRotation.current
      
      // Calculate the base position offset from the player
      const baseOffset = new THREE.Vector3(
        SHOULDER_OFFSET,
        CAMERA_HEIGHT,
        CAMERA_DISTANCE
      )
      
      // Apply horizontal rotation to the base offset
      const rotatedOffset = baseOffset.clone().applyAxisAngle(
        new THREE.Vector3(0, 1, 0), 
        effectiveRotation.x // Use the effective rotation
      )
      
      // Store the fixed camera offset on first frame
      if (!initialPositionSet.current) {
        cameraPositionOffset.current.copy(rotatedOffset)
        initialPositionSet.current = true
      }
      
      // Calculate a fixed player position for camera
      const fixedPlayerPositionForCamera = new THREE.Vector3(
        playerRef.current.position.x,
        0,
        playerRef.current.position.z
      )
      
      // Add vertical adjustment based on looking up/down - use effective rotation
      const verticalCameraAdjustment = new THREE.Vector3(
        0,
        Math.sin(effectiveRotation.y) * 1.0,
        Math.sin(Math.abs(effectiveRotation.y)) * -0.1
      )
      
      // Position camera
      state.camera.position.copy(fixedPlayerPositionForCamera)
        .add(rotatedOffset)
        .add(verticalCameraAdjustment)
      
      // Calculate look target
      const lookDirection = new THREE.Vector3(
        0,
        0.0,
        -LOOK_AHEAD_DISTANCE
      )
      
      // Apply rotations to look direction - use effective rotation
      lookDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), effectiveRotation.x)
      lookDirection.y += effectiveRotation.y * 4.5
      
      // Set look target position
      const lookTarget = new THREE.Vector3(
        playerRef.current.position.x + lookDirection.x,
        0.7 + lookDirection.y,
        playerRef.current.position.z + lookDirection.z
      )
      
      // Make camera look at target
      state.camera.lookAt(lookTarget)

      // Set wider FOV
      if (state.camera instanceof THREE.PerspectiveCamera) {
        state.camera.fov = 70
        state.camera.updateProjectionMatrix()
      }
    }

    // Notify position change
    if (onPositionChange) {
      onPositionChange(playerRef.current.position)
    }
  })

  return (
    <>
      <group ref={playerRef} position={position}>
        {/* Model will be added via useEffect */}
      </group>
      
      {/* Simple crosshair */}
      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '16px',
          height: '16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            width: '4px',
            height: '4px',
            backgroundColor: 'white',
            borderRadius: '50%',
            boxShadow: '0 0 4px rgba(0,0,0,0.5)'
          }} />
        </div>
      </Html>
    </>
  )
})

export default Player 