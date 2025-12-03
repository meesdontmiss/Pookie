/**
 * Final Camera Movement Configuration
 * 
 * This file serves as a backup for the optimized camera settings.
 * These values can be imported and used to restore camera configuration
 * or to maintain consistency across different components.
 */

import * as THREE from 'three'

export const cameraConfig = {
  // Base camera position settings
  cameraDistance: 9.5,
  cameraHeight: 4.4,
  
  // Sensitivity settings
  horizontalSensitivity: 2.0,
  verticalSensitivity: 1.8,
  
  // Offset settings
  cameraOffset: new THREE.Vector3(1.25, 4.4, 9.5),
  
  // Look target settings
  lookAheadDistance: 13.5,
  lookDirection: new THREE.Vector3(0, -0.5, -13.5),
  lookTargetYOffset: 0.75,
  
  // Field of view
  fov: 62,
  
  // Apply these settings to a camera
  applyCameraSettings: (
    camera: THREE.PerspectiveCamera,
    playerPosition: THREE.Vector3,
    rotation: { horizontal: number, vertical: number }
  ) => {
    // Calculate camera position
    const cameraOffset = new THREE.Vector3(
      1.25,
      cameraConfig.cameraHeight,
      cameraConfig.cameraDistance
    )
    
    // Apply horizontal rotation
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.horizontal)
    
    // Apply vertical tilt
    const verticalRotation = rotation.vertical
    const verticalAdjustment = new THREE.Vector3(
      0,
      -Math.sin(verticalRotation) * cameraConfig.cameraDistance * 0.3,
      Math.sin(Math.abs(verticalRotation)) * cameraConfig.cameraDistance * 0.1
    )
    verticalAdjustment.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.horizontal)
    
    // Position camera relative to player
    camera.position.copy(playerPosition).add(cameraOffset).add(verticalAdjustment)
    
    // Calculate look direction
    const lookDirection = new THREE.Vector3(
      0,
      -0.5,
      -cameraConfig.lookAheadDistance
    )
    lookDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.horizontal)
    lookDirection.y += verticalRotation * 4
    
    // Set look target
    const lookTarget = new THREE.Vector3(
      playerPosition.x + lookDirection.x,
      playerPosition.y + cameraConfig.lookTargetYOffset + lookDirection.y,
      playerPosition.z + lookDirection.z
    )
    
    camera.lookAt(lookTarget)
    
    // Set FOV
    camera.fov = cameraConfig.fov
    camera.updateProjectionMatrix()
    
    return {
      cameraPosition: camera.position.clone(),
      lookTarget: lookTarget.clone()
    }
  }
}

/**
 * Helper functions to adjust camera settings programmatically
 */
export const cameraAdjustments = {
  // Move camera closer to player
  moveCloser: (amount: number = 0.5) => ({
    ...cameraConfig,
    cameraDistance: cameraConfig.cameraDistance - amount
  }),
  
  // Move camera further from player
  moveFurther: (amount: number = 0.5) => ({
    ...cameraConfig,
    cameraDistance: cameraConfig.cameraDistance + amount
  }),
  
  // Adjust camera height
  adjustHeight: (amount: number) => ({
    ...cameraConfig,
    cameraHeight: cameraConfig.cameraHeight + amount
  }),
  
  // Widen or narrow field of view
  adjustFOV: (amount: number) => ({
    ...cameraConfig,
    fov: cameraConfig.fov + amount
  })
}

/**
 * Camera presets for different gameplay scenarios
 */
export const cameraPresets = {
  // Default gameplay view (our current optimized settings)
  default: cameraConfig,
  
  // Close-up view for detailed interactions
  closeUp: {
    ...cameraConfig,
    cameraDistance: 6.0,
    cameraHeight: 3.0,
    lookAheadDistance: 8.0,
    fov: 55
  },
  
  // Wide-angle view for scenic vistas
  wideView: {
    ...cameraConfig,
    cameraDistance: 12.0,
    cameraHeight: 6.0,
    lookAheadDistance: 18.0,
    fov: 70
  },
  
  // Top-down view for certain gameplay sections
  topDown: {
    ...cameraConfig,
    cameraDistance: 8.0,
    cameraHeight: 10.0,
    lookAheadDistance: 5.0,
    lookDirection: new THREE.Vector3(0, -1.2, -5.0),
    fov: 60
  }
}

// Export URL parameter handling for easy camera adjustments
export const getCameraSettingsFromURL = () => {
  if (typeof window === 'undefined') return cameraConfig
  
  const params = new URLSearchParams(window.location.search)
  const newConfig = { ...cameraConfig }
  
  if (params.has('cameraDistance')) {
    newConfig.cameraDistance = parseFloat(params.get('cameraDistance') || '9.5')
  }
  
  if (params.has('cameraHeight')) {
    newConfig.cameraHeight = parseFloat(params.get('cameraHeight') || '4.4')
  }
  
  if (params.has('fov')) {
    newConfig.fov = parseFloat(params.get('fov') || '62')
  }
  
  if (params.has('lookAhead')) {
    newConfig.lookAheadDistance = parseFloat(params.get('lookAhead') || '13.5')
  }
  
  return newConfig
} 