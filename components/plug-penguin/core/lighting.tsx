'use client'

import { useRef, useMemo } from 'react'
import * as THREE from 'three'

export function Lighting() {
  // Use useMemo to create stable light settings that won't cause re-renders
  const lightSettings = useMemo(() => ({
    ambient: {
      intensity: 0.4, // Slightly increased for better visibility
      color: "#3b4a7a"
    },
    directional: {
      position: new THREE.Vector3(30, 40, -20),
      intensity: 0.7, // Increased for better visibility
      color: "#a0c4ff",
      shadowBias: -0.0005,
      shadowMapSize: 1024
    },
    hemisphere: {
      skyColor: "#4b6cb7",
      groundColor: "#ffffff",
      intensity: 0.6 // Increased for better visibility
    },
    point: {
      position: new THREE.Vector3(0, 10, 0),
      intensity: 0.3,
      color: "#ffd54f",
      distance: 50,
      decay: 2
    }
  }), []);
  
  // References for the lights
  const moonLightRef = useRef<THREE.DirectionalLight>(null)
  
  return (
    <>
      {/* Ambient light for general illumination */}
      <ambientLight 
        intensity={lightSettings.ambient.intensity} 
        color={lightSettings.ambient.color} 
      />
      
      {/* Directional light for shadows and main lighting */}
      <directionalLight
        ref={moonLightRef}
        position={[
          lightSettings.directional.position.x,
          lightSettings.directional.position.y,
          lightSettings.directional.position.z
        ]}
        intensity={lightSettings.directional.intensity}
        color={lightSettings.directional.color}
        castShadow
        shadow-bias={lightSettings.directional.shadowBias}
        shadow-mapSize={[
          lightSettings.directional.shadowMapSize,
          lightSettings.directional.shadowMapSize
        ]}
      />
      
      {/* Hemisphere light for sky/ground color gradient */}
      <hemisphereLight
        args={[
          lightSettings.hemisphere.skyColor,
          lightSettings.hemisphere.groundColor,
          lightSettings.hemisphere.intensity
        ]}
      />
      
      {/* Single point light for subtle illumination */}
      <pointLight 
        position={lightSettings.point.position}
        intensity={lightSettings.point.intensity}
        color={lightSettings.point.color}
        distance={lightSettings.point.distance}
        decay={lightSettings.point.decay}
        castShadow={false}
      />
    </>
  )
} 