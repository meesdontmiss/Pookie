import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useModel } from '../hooks/use-model'
import { Text } from '@react-three/drei'
import useKeyboardControls from '../hooks/use-keyboard-controls'
import { useMouseControls } from '../hooks/use-mouse-controls'

interface PookieProps {
  onPositionChange?: (position: THREE.Vector3) => void
  speed?: number
  jumpHeight?: number
}

function Pookie({ 
  onPositionChange,
  speed = 5,
  jumpHeight = 1.0
}: PookieProps = {}) {
  const pookieRef = useRef<THREE.Group>(null)
  const { model, isLoading } = useModel('/models/POOKIE.glb')
  const [hovered, setHovered] = useState(false)
  const [clicked, setClicked] = useState(false)
  const [isJumping, setIsJumping] = useState(false)
  const jumpVelocity = useRef(0)
  const jumpHeightRef = useRef(0)
  const velocity = useRef(new THREE.Vector3(0, 0, 0))
  const isMoving = useRef(false)
  
  // Get keyboard controls
  const [, getKeys] = useKeyboardControls()
  
  // Get mouse controls for camera rotation
  const { mouseState } = useMouseControls({
    element: typeof document !== 'undefined' ? document.body : null,
    horizontalSensitivity: 2.0,
    verticalSensitivity: 1.8
  })
  
  // Access the camera for 3rd person positioning
  const { camera } = useThree()
  
  // Handle hover state
  const handlePointerOver = () => setHovered(true)
  const handlePointerOut = () => setHovered(false)
  
  // Handle click to make Pookie jump
  const handleClick = () => {
    if (!isJumping) {
      setClicked(true)
      setIsJumping(true)
      jumpVelocity.current = 0.2
      
      // Reset click state after a short delay
      setTimeout(() => {
        setClicked(false)
      }, 300)
    }
  }
  
  // Animation and movement loop
  useFrame((state, delta) => {
    if (!pookieRef.current) return
    
    // Get current key states
    const { 
      forward, 
      backward, 
      left, 
      right, 
      jump, 
      shift,
      trick1,
      trick2,
      action
    } = getKeys()
    
    // Get current mouse rotation
    const { rotation } = mouseState
    
    // Base idle animation - gentle bobbing
    const idleY = Math.sin(state.clock.elapsedTime * 2) * 0.05
    
    // Reset velocity
    velocity.current.set(0, 0, 0)
    isMoving.current = false
    
    // Calculate movement direction
    const currentSpeed = shift ? speed * 1.5 : speed
    const direction = new THREE.Vector3()
    
    // Calculate forward/backward movement
    if (forward) {
      direction.z = -1
      isMoving.current = true
    } else if (backward) {
      direction.z = 1
      isMoving.current = true
    }
    
    // Calculate left/right movement
    if (left) {
      direction.x = -1
      isMoving.current = true
    } else if (right) {
      direction.x = 1
      isMoving.current = true
    }
    
    // Normalize and scale the direction vector
    if (direction.length() > 0) {
      direction.normalize().multiplyScalar(currentSpeed * delta)
      
      // Apply player's rotation to movement direction
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.horizontal)
    }
    
    // Apply horizontal movement
    pookieRef.current.position.x += direction.x
    pookieRef.current.position.z += direction.z
    
    // Handle jumping
    if (jump && !isJumping) {
      setIsJumping(true)
      jumpVelocity.current = jumpHeight * 8 * delta
    }
    
    // Apply jump velocity and gravity
    if (isJumping) {
      // Apply gravity to jump velocity
      jumpVelocity.current -= 20 * delta
      
      // Move player up/down
      jumpHeightRef.current += jumpVelocity.current * delta
      
      // Check if we've landed
      if (jumpHeightRef.current <= 0) {
        jumpHeightRef.current = 0
        jumpVelocity.current = 0
        setIsJumping(false)
      }
    }
    
    // Apply position
    pookieRef.current.position.y = 0.5 + idleY + jumpHeightRef.current
    
    // Ensure player model rotates to match camera direction
    const playerRotation = new THREE.Euler(0, rotation.horizontal, 0, 'YXZ')
    pookieRef.current.rotation.copy(playerRotation)
    
    // Position camera behind player
    const cameraDistance = 6
    const cameraHeight = 3
    
    // Calculate camera position based on player rotation
    const cameraOffset = new THREE.Vector3(
      Math.sin(rotation.horizontal) * cameraDistance,
      cameraHeight,
      Math.cos(rotation.horizontal) * cameraDistance
    )
    
    // Set camera position behind player
    camera.position.copy(pookieRef.current.position).add(cameraOffset)
    
    // Make camera look at player
    camera.lookAt(
      pookieRef.current.position.x,
      pookieRef.current.position.y + 1, // Look at head level
      pookieRef.current.position.z
    )
    
    // Scale effect when hovered
    const targetScale = hovered ? 0.55 : 0.5
    pookieRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1)
    
    // Notify position change
    if (onPositionChange) {
      onPositionChange(pookieRef.current.position)
    }
  })
  
  // Handle keyboard controls for fun
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isJumping) {
        setIsJumping(true)
        jumpVelocity.current = 0.2
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isJumping])
  
  if (isLoading) return null
  
  // Clone the model to avoid modifying the original
  const pookieModel = model.scene.clone()
  
  return (
    <group>
      <group 
        ref={pookieRef} 
        position={[0, 0.5, 0]} 
        scale={[0.5, 0.5, 0.5]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <primitive object={pookieModel} />
        
        {/* Show interaction hint when hovered */}
        {hovered && (
          <Text
            position={[0, 2.5, 0]}
            fontSize={0.5}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            Click me!
          </Text>
        )}
      </group>
      
      {/* Add a spotlight on Pookie */}
      <spotLight
        position={[0, 5, 0]}
        angle={0.3}
        penumbra={0.8}
        intensity={clicked ? 2 : 1}
        color={clicked ? "#ffff80" : "#ffffff"}
        castShadow
        target={pookieRef.current || undefined}
      />
    </group>
  )
}

export default Pookie 