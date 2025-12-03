/**
 * Weapons control hook for air combat minigame
 * Handles weapon firing, ammo tracking, and cooldowns
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'

interface WeaponsState {
  ammo: number
  missiles: number
  machineGunCooldown: number
  missileCooldown: number
  lastMachineGunFire: number
  lastMissileFire: number
  isFiring: boolean
  isReloading: boolean
}

interface WeaponsControls {
  ammo: number
  missiles: number
  isFiring: boolean
  isReloading: boolean
  fire: () => void
  fireMissile: () => boolean
  reload: () => void
}

// Weapon configuration parameters
const WEAPONS_CONFIG = {
  MACHINE_GUN_COOLDOWN: 100, // ms between shots
  MISSILE_COOLDOWN: 2000, // ms between missile launches
  MAX_AMMO: 500,
  MAX_MISSILES: 4,
  RELOAD_TIME: 3000, // ms to reload
  SOUND_VOLUME: 0.4
}

export function useWeapons(): WeaponsControls {
  // Mutable weapons state
  const state = useRef<WeaponsState>({
    ammo: WEAPONS_CONFIG.MAX_AMMO,
    missiles: WEAPONS_CONFIG.MAX_MISSILES,
    machineGunCooldown: 0,
    missileCooldown: 0,
    lastMachineGunFire: 0,
    lastMissileFire: 0,
    isFiring: false,
    isReloading: false
  })

  // State for React updates
  const [ammo, setAmmo] = useState(WEAPONS_CONFIG.MAX_AMMO)
  const [missiles, setMissiles] = useState(WEAPONS_CONFIG.MAX_MISSILES)
  const [isFiring, setIsFiring] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  
  // Setup weapon sounds with updated paths
  const sounds = useRef({
    machineGun: new Audio('/sounds/dogfight/machine-gun.mp3'),
    missile: new Audio('/sounds/dogfight/missile-launch.mp3'),
    reload: new Audio('/sounds/dogfight/reload.mp3'),
    empty: new Audio('/sounds/dogfight/gun-click.mp3')
  })

  // Initialize sounds
  useEffect(() => {
    // Set volumes
    Object.values(sounds.current).forEach(sound => {
      sound.volume = WEAPONS_CONFIG.SOUND_VOLUME
    })
    
    // Preload sounds
    Object.values(sounds.current).forEach(sound => {
      sound.load()
    })
    
    return () => {
      // Stop all sounds on cleanup
      Object.values(sounds.current).forEach(sound => {
        sound.pause()
        sound.currentTime = 0
      })
    }
  }, [])

  // Handle keyboard events for firing weapons
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if chat is open
      if ((window as any).isChatInputFocused) return
      
      if (e.code === 'Space') {
        // Fire machine gun
        fire()
      }
      
      if (e.code === 'KeyF') {
        // Fire missile
        fireMissile()
      }
      
      if (e.code === 'KeyR') {
        // Reload
        reload()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  
  // Update cooldowns and state
  useEffect(() => {
    const interval = setInterval(() => {
      // Update cooldowns
      const now = Date.now()
      
      if (state.current.isReloading) {
        if (now - state.current.lastMachineGunFire > WEAPONS_CONFIG.RELOAD_TIME) {
          // Reloading complete
          state.current.ammo = WEAPONS_CONFIG.MAX_AMMO
          state.current.isReloading = false
          setAmmo(WEAPONS_CONFIG.MAX_AMMO)
          setIsReloading(false)
        }
      }
      
      // Check if machine gun cooldown is complete
      if (now - state.current.lastMachineGunFire > WEAPONS_CONFIG.MACHINE_GUN_COOLDOWN) {
        state.current.isFiring = false
        setIsFiring(false)
      }
      
    }, 100) // Check every 100ms
    
    return () => clearInterval(interval)
  }, [])
  
  // Fire machine gun
  const fire = useCallback(() => {
    const now = Date.now()
    
    // Check cooldown
    if (now - state.current.lastMachineGunFire < WEAPONS_CONFIG.MACHINE_GUN_COOLDOWN) {
      return false
    }
    
    // Check if reloading
    if (state.current.isReloading) {
      sounds.current.empty.play()
      return false
    }
    
    // Check ammo
    if (state.current.ammo <= 0) {
      sounds.current.empty.play()
      return false
    }
    
    // Fire
    state.current.ammo--
    state.current.lastMachineGunFire = now
    state.current.isFiring = true
    setAmmo(state.current.ammo)
    setIsFiring(true)
    
    // Play sound
    sounds.current.machineGun.currentTime = 0
    sounds.current.machineGun.play().catch(e => console.log('Error playing sound:', e))
    
    return true
  }, [])
  
  // Fire missile
  const fireMissile = useCallback(() => {
    const now = Date.now()
    
    // Check cooldown
    if (now - state.current.lastMissileFire < WEAPONS_CONFIG.MISSILE_COOLDOWN) {
      return false
    }
    
    // Check missiles
    if (state.current.missiles <= 0) {
      sounds.current.empty.play()
      return false
    }
    
    // Fire
    state.current.missiles--
    state.current.lastMissileFire = now
    setMissiles(state.current.missiles)
    
    // Play sound
    sounds.current.missile.currentTime = 0
    sounds.current.missile.play().catch(e => console.log('Error playing sound:', e))
    
    return true
  }, [])
  
  // Reload
  const reload = useCallback(() => {
    const now = Date.now()
    
    // Skip if already reloading
    if (state.current.isReloading) {
      return false
    }
    
    // Skip if ammo is full
    if (state.current.ammo === WEAPONS_CONFIG.MAX_AMMO) {
      return false
    }
    
    // Start reloading
    state.current.isReloading = true
    state.current.lastMachineGunFire = now
    setIsReloading(true)
    
    // Play sound
    sounds.current.reload.currentTime = 0
    sounds.current.reload.play().catch(e => console.log('Error playing sound:', e))
    
    return true
  }, [])

  return {
    ammo,
    missiles,
    isFiring,
    isReloading,
    fire,
    fireMissile,
    reload
  }
} 