/**
 * Flight controls hook
 * 
 * IMPORTANT: This hook is ONLY for use in the air combat minigame.
 * It should NOT be imported or used in the main world components.
 * All flight mechanics are contained in this hook and should remain
 * isolated to the dedicated minigame scene.
 */

import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface FlightState {
  velocity: THREE.Vector3
  acceleration: THREE.Vector3
  throttle: number
  pitch: number
  roll: number
  yaw: number
  isFlying: boolean
  lastVelocity: THREE.Vector3 // For g-force calculation
  gForce: number
  isStalling: boolean
}

interface FlightControls {
  position: THREE.Vector3
  rotation: THREE.Euler
  engineSound: HTMLAudioElement | null
  throttle: number
  isFlying: boolean
  velocity: THREE.Vector3 // Added for airspeed calculation
  g: number // Added for g-force display
  stalling: boolean // Added for stall warning
  startFlight: () => void
  stopFlight: () => void
  setEnabled: (enabled: boolean) => void
  fire: () => void
}

const FLIGHT_PHYSICS = {
  MAX_SPEED: 2.0,
  MIN_SPEED: 0.2,
  ACCELERATION: 0.01,
  DECELERATION: 0.005,
  PITCH_RATE: 0.03,
  ROLL_RATE: 0.04,
  YAW_RATE: 0.02,
  LIFT_COEFFICIENT: 0.01,
  GRAVITY: 0.005,
  GROUND_LEVEL: 1.5,
  STALL_SPEED: 0.3,  // Minimum speed before stalling
  MAX_G_FORCE: 9.0   // Maximum G-force for display
}

export function useFlightControls(initialPosition: [number, number, number] = [0, 0, 0]): FlightControls {
  const state = useRef<FlightState>({
    velocity: new THREE.Vector3(),
    acceleration: new THREE.Vector3(),
    throttle: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    isFlying: false,
    lastVelocity: new THREE.Vector3(),
    gForce: 1.0,
    isStalling: false
  })

  const position = useRef(new THREE.Vector3(...initialPosition))
  const rotation = useRef(new THREE.Euler(0, 0, 0))
  const engineSound = useRef<HTMLAudioElement | null>(null)
  const [isFlying, setIsFlying] = useState(false)

  // Initialize engine sound
  useEffect(() => {
    engineSound.current = new Audio('/sounds/dogfight/spitfire_engine_idle.mp3')
    engineSound.current.loop = true
    return () => {
      engineSound.current?.pause()
    }
  }, [])

  // Setup keyboard controls for flight
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip processing keys if chat is open
      if ((window as any).isChatInputFocused) return
      
      // Only process keys if flying
      if (!state.current.isFlying) return
      
      switch (e.key.toLowerCase()) {
        case 'w':
          state.current.pitch = -FLIGHT_PHYSICS.PITCH_RATE
          break
        case 's':
          state.current.pitch = FLIGHT_PHYSICS.PITCH_RATE
          break
        case 'a':
          state.current.roll = -FLIGHT_PHYSICS.ROLL_RATE
          break
        case 'd':
          state.current.roll = FLIGHT_PHYSICS.ROLL_RATE
          break
        case 'q':
          state.current.yaw = -FLIGHT_PHYSICS.YAW_RATE
          break
        case 'e':
          state.current.yaw = FLIGHT_PHYSICS.YAW_RATE
          break
        case 'arrowup':
          state.current.throttle = Math.min(state.current.throttle + FLIGHT_PHYSICS.ACCELERATION, 1)
          break
        case 'arrowdown':
          state.current.throttle = Math.max(state.current.throttle - FLIGHT_PHYSICS.DECELERATION, 0)
          break
        case ' ':
          // Fire weapons or afterburner - depends on implementation
          break
        case 'shift':
          // Afterburner boost
          state.current.throttle = Math.min(state.current.throttle + FLIGHT_PHYSICS.ACCELERATION * 2, 1)
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!state.current.isFlying) return
      
      switch (e.key.toLowerCase()) {
        case 'w':
        case 's':
          state.current.pitch = 0
          break
        case 'a':
        case 'd':
          state.current.roll = 0
          break
        case 'q':
        case 'e':
          state.current.yaw = 0
          break
        case 'arrowup':
        case 'arrowdown':
        case 'shift':
          // Don't reset throttle on key up
          break
      }
    }

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // Clean up event listeners
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Listen for chat input state changes
  useEffect(() => {
    const handleChatInputStateChanged = (e: CustomEvent) => {
      const focused = e.detail?.focused || false
      
      if (focused) {
        // Reset all controls when chat is focused to prevent "stuck" controls
        state.current.pitch = 0
        state.current.roll = 0
        state.current.yaw = 0
        state.current.throttle = 0
        
        console.log('Flight controls reset due to chat focus')
      }
    }
    
    window.addEventListener('chatInputStateChanged', handleChatInputStateChanged as EventListener)
    return () => {
      window.removeEventListener('chatInputStateChanged', handleChatInputStateChanged as EventListener)
    }
  }, [])

  // Animation frame update
  useFrame((_, delta) => {
    // Skip updates if chat is open or not flying
    if ((window as any).isChatInputFocused || !state.current.isFlying) return
    
    // Save previous velocity for g-force calculation
    state.current.lastVelocity.copy(state.current.velocity)
    
    // Apply rotation based on controls
    rotation.current.x += state.current.pitch * delta * 1.5
    rotation.current.z += state.current.roll * delta * 1.5
    rotation.current.y += state.current.yaw * delta * 1.5
    
    // Calculate forward direction based on current rotation
    const direction = new THREE.Vector3(0, 0, 1)
    direction.applyEuler(rotation.current)
    
    // Apply throttle
    const speed = THREE.MathUtils.lerp(
      FLIGHT_PHYSICS.MIN_SPEED,
      FLIGHT_PHYSICS.MAX_SPEED,
      state.current.throttle
    )
    
    // Check for stall condition
    state.current.isStalling = speed < FLIGHT_PHYSICS.STALL_SPEED && Math.abs(rotation.current.x) > 0.3
    
    // Apply velocity with stall effects
    if (state.current.isStalling) {
      // When stalling, reduce control effectiveness and add randomness
      state.current.velocity.copy(direction).multiplyScalar(speed * 0.7)
      state.current.velocity.y -= FLIGHT_PHYSICS.GRAVITY * 2 // Fall faster when stalling
      
      // Add some random motion to simulate loss of control
      state.current.velocity.x += (Math.random() - 0.5) * 0.02
      state.current.velocity.z += (Math.random() - 0.5) * 0.02
      
      // Play stall warning sound (would be added in real implementation)
    } else {
      // Normal flight
      state.current.velocity.copy(direction).multiplyScalar(speed)
    }
    
    // Update position
    position.current.add(state.current.velocity)
    
    // Add gravity effect when throttle is low
    if (state.current.throttle < 0.5) {
      state.current.velocity.y -= FLIGHT_PHYSICS.GRAVITY * (1 - state.current.throttle)
    }
    
    // Enforce minimum height
    if (position.current.y < FLIGHT_PHYSICS.GROUND_LEVEL) {
      position.current.y = FLIGHT_PHYSICS.GROUND_LEVEL
      state.current.velocity.y = 0
    }

    // Calculate g-force based on velocity change
    const acceleration = new THREE.Vector3().subVectors(state.current.velocity, state.current.lastVelocity).divideScalar(delta)
    const accelMagnitude = acceleration.length() * 10 // Scale for more noticeable effect
    state.current.gForce = Math.min(1 + accelMagnitude, FLIGHT_PHYSICS.MAX_G_FORCE)

    // Update engine sound
    if (engineSound.current) {
      engineSound.current.playbackRate = 0.5 + state.current.throttle
    }
  })

  const startFlight = () => {
    state.current.isFlying = true
    setIsFlying(true)
    engineSound.current?.play()
  }

  const stopFlight = () => {
    state.current.isFlying = false
    setIsFlying(false)
    engineSound.current?.pause()
    // Reset to initial position
    position.current.set(...initialPosition)
    rotation.current.set(0, 0, 0)
  }

  return {
    position: position.current,
    rotation: rotation.current,
    engineSound: engineSound.current,
    throttle: state.current.throttle,
    isFlying,
    velocity: state.current.velocity, // Expose velocity for HUD
    g: state.current.gForce, // Expose g-force for HUD
    stalling: state.current.isStalling, // Expose stalling status for HUD
    startFlight,
    stopFlight,
    setEnabled: (enabled: boolean) => {
      state.current.isFlying = enabled
      
      // Reset controls when disabled
      if (!enabled) {
        state.current.pitch = 0
        state.current.roll = 0
        state.current.yaw = 0
        state.current.throttle = 0
      }
    },
    fire: () => {
      // Fire weapon - implementation can be added here
      console.log('Firing weapons!')
    }
  }
} 