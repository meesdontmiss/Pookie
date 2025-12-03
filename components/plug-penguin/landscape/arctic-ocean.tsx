'use client'

import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useCollisionVisualization } from '@/components/game/collision-visualization-context'
import { useOceanSettings } from './ocean-settings-context'

interface ArcticOceanProps {
  useCustomSettings?: boolean
  size?: number
  position?: [number, number, number]
  waterColor?: string
  distortionScale?: number
  sunDirection?: [number, number, number]
  waveSpeed?: number
  depth?: number
}

export function ArcticOcean({
  useCustomSettings = true,
  size = 600,
  position = [0, -0.5, 0],
  waterColor = '#a3d9ff',
  distortionScale = 1.2,
  sunDirection = [0, 1, 0],
  waveSpeed = 0.2,
  depth = 15
}: ArcticOceanProps) {
  const waterRef = useRef<THREE.Mesh>(null)
  const waterObjectRef = useRef<Water | null>(null)
  const waterNormals = useLoader(THREE.TextureLoader, '/textures/ocean/waterNormal1.png')
  const { scene } = useThree()
  const { showDebug = false, isEnabled = false } = useCollisionVisualization()
  const animationFrameRef = useRef<number | null>(null)
  
  // Get settings from context if useCustomSettings is true
  const { settings, isInitialized } = useOceanSettings()
  
  // Use context settings or props
  const finalSettings = useCustomSettings && isInitialized ? {
    size: settings.size,
    position: settings.position,
    waterColor: settings.waterColor,
    distortionScale: settings.distortionScale,
    waveSpeed: settings.waveSpeed,
    depth: settings.depth
  } : {
    size,
    position,
    waterColor,
    distortionScale,
    waveSpeed,
    depth
  }
  
  // Add near the top with other state/refs
  const lastLogTime = useRef(0);
  
  // Throttle logging
  const throttledLog = (message: string, data: any) => {
    const currentTime = Date.now();
    if (currentTime - lastLogTime.current >= 5000) {
      console.log(message, data);
      lastLogTime.current = currentTime;
    }
  };
  
  // Log the settings being used
  useEffect(() => {
    throttledLog('ArcticOcean using settings:', finalSettings);
  }, [finalSettings]);
  
  // Configure water normal texture
  useEffect(() => {
    if (waterNormals) {
      waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping
    }
  }, [waterNormals])
  
  // Create water object
  const water = useMemo(() => {
    if (!waterNormals) return null;
    
    throttledLog('Creating water with settings:', {
      size,
      waterColor,
      distortionScale
    });
    
    const waterGeometry = new THREE.PlaneGeometry(finalSettings.size, finalSettings.size, 64, 64)
    
    const water = new Water(waterGeometry, {
      textureWidth: 256,
      textureHeight: 256,
      waterNormals,
      sunDirection: new THREE.Vector3(...sunDirection),
      sunColor: 0xffffff,
      waterColor: new THREE.Color(finalSettings.waterColor),
      distortionScale: finalSettings.distortionScale,
      fog: scene.fog !== undefined
    })
    
    water.rotation.x = -Math.PI / 2
    
    // Optimize material settings
    if (water.material) {
      water.material.transparent = true;
      water.material.side = THREE.FrontSide;
      water.material.needsUpdate = true;
      
      // Initialize time uniform to ensure it exists
      if (!water.material.uniforms.time) {
        water.material.uniforms.time = { value: 0 };
      }
      
      // Add optimization hints
      water.material.precision = 'mediump';
      water.material.dithering = false;
    }
    
    return water
  }, [finalSettings.size, finalSettings.waterColor, finalSettings.distortionScale, waterNormals, sunDirection, scene.fog])
  
  // Set the water object to the ref when it changes
  useEffect(() => {
    if (water && waterRef.current) {
      // Clear existing children
      while (waterRef.current.children.length > 0) {
        waterRef.current.remove(waterRef.current.children[0]);
      }
      
      // Add the water as a child
      waterRef.current.add(water);
      
      // Store direct reference to water object
      waterObjectRef.current = water;
      
      console.log('Water object added to ref');
      
      // Start direct animation as a fallback
      const animate = () => {
        if (waterObjectRef.current && waterObjectRef.current.material) {
          const timeValue = performance.now() * 0.001 * finalSettings.waveSpeed;
          waterObjectRef.current.material.uniforms.time.value = timeValue;
          waterObjectRef.current.material.needsUpdate = true;
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      
      // Start animation
      animate();
      
      // Cleanup animation on unmount
      return () => {
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [water]);
  
  // Update water animation
  useFrame((state) => {
    // Use the direct reference for animation
    if (waterObjectRef.current && waterObjectRef.current.material) {
      // Update time uniform for wave animation
      const timeValue = state.clock.getElapsedTime() * finalSettings.waveSpeed;
      waterObjectRef.current.material.uniforms.time.value = timeValue;
      
      // Force material update to ensure animation is visible
      waterObjectRef.current.material.needsUpdate = true;
      
      // Debug log every 100 frames to avoid console spam
      if (Math.floor(state.clock.elapsedTime * 10) % 100 === 0) {
        console.log('Water animation updated:', {
          time: timeValue,
          waveSpeed: finalSettings.waveSpeed
        });
      }
    }
  })
  
  // Update water properties when settings change
  useEffect(() => {
    if (waterObjectRef.current && waterObjectRef.current.material) {
      // Update water color
      waterObjectRef.current.material.uniforms.waterColor.value = new THREE.Color(finalSettings.waterColor);
      
      // Update distortion scale
      waterObjectRef.current.material.uniforms.distortionScale.value = finalSettings.distortionScale;
      
      console.log('Updated water material with new settings');
    }
  }, [finalSettings.waterColor, finalSettings.distortionScale]);
  
  return (
    <group>
      {/* Water surface */}
      <mesh 
        ref={waterRef}
        position={new THREE.Vector3(...finalSettings.position)}
        renderOrder={-1}
        frustumCulled={true}
      />
      
      {/* Ocean collision - prevents player from walking on water */}
      <RigidBody type="fixed" position={[finalSettings.position[0], finalSettings.position[1] - finalSettings.depth/2, finalSettings.position[2]]} colliders={false}>
        <CuboidCollider args={[finalSettings.size/2, finalSettings.depth/2, finalSettings.size/2]} sensor />
        
        {/* Debug visualization */}
        {isEnabled && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[finalSettings.size, finalSettings.depth, finalSettings.size]} />
            <meshBasicMaterial 
              color={showDebug ? "#0000ff" : "#00ffff"} 
              wireframe={true} 
              transparent={true} 
              opacity={0.2} 
            />
          </mesh>
        )}
      </RigidBody>
    </group>
  )
}

// Pine tree component for creating small islands with trees
interface PineTreeProps {
  position: [number, number, number]
  scale?: number
  rotation?: number
  hasCollision?: boolean
  snowAmount?: number // 0-1 value for snow coverage
  treeColor?: string // Color of the tree foliage
}

export function PineTree({
  position,
  scale = 1,
  rotation = 0,
  hasCollision = true,
  snowAmount = 0.7, // Default heavy snow coverage
  treeColor = "#a5d6a7" // Default light green
}: PineTreeProps) {
  const { showDebug = false, isEnabled = false } = useCollisionVisualization()
  
  // Create a small island for the tree
  const islandRadius = 15 * scale
  const islandHeight = 2 * scale
  const treeGroupRef = useRef<THREE.Group>(null)
  
  // Calculate collision sizes based on scale
  const trunkHeight = 10 * scale
  const foliageHeight = 15 * scale
  const baseRadius = 8 * scale
  
  // We're using a dedicated ref for the tree group to help with visualization
  const treeHeight = islandHeight + trunkHeight + foliageHeight
  
  return (
    <RigidBody 
      type="fixed" 
      position={position} 
      colliders={false} // We'll define explicit colliders instead of automatic
      userData={{ name: 'PineTree' }} // Add name to userData for collision identification
    >
      <group rotation={[0, rotation, 0]} ref={treeGroupRef}>
        {/* Island base */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[islandRadius, islandRadius * 1.1, islandHeight, 8]} />
          <meshStandardMaterial 
            color="#ffffff" 
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>
        
        {/* Tree trunk */}
        <mesh position={[0, islandHeight/2 + 5 * scale, 0]}>
          <cylinderGeometry args={[1 * scale, 1.5 * scale, 10 * scale, 8]} />
          <meshStandardMaterial 
            color="#3e2723" 
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        
        {/* Tree foliage - multiple cone layers */}
        <group position={[0, islandHeight/2 + 10 * scale, 0]}>
          {/* Bottom layer */}
          <mesh position={[0, 0, 0]}>
            <coneGeometry args={[8 * scale, 10 * scale, 8]} />
            <meshStandardMaterial 
              color={treeColor} 
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          
          {/* Snow on bottom layer */}
          <mesh position={[0, 1 * scale, 0]} rotation={[0, Math.PI / 8, 0]}>
            <coneGeometry args={[8 * scale * 0.9, 4 * scale, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              roughness={0.9}
              metalness={0.0}
              transparent
              opacity={snowAmount}
            />
          </mesh>
          
          {/* Middle layer */}
          <mesh position={[0, 6 * scale, 0]}>
            <coneGeometry args={[6 * scale, 8 * scale, 8]} />
            <meshStandardMaterial 
              color={treeColor} 
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          
          {/* Snow on middle layer */}
          <mesh position={[0, 7 * scale, 0]} rotation={[0, Math.PI / 6, 0]}>
            <coneGeometry args={[6 * scale * 0.9, 3 * scale, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              roughness={0.9}
              metalness={0.0}
              transparent
              opacity={snowAmount}
            />
          </mesh>
          
          {/* Top layer */}
          <mesh position={[0, 11 * scale, 0]}>
            <coneGeometry args={[4 * scale, 6 * scale, 8]} />
            <meshStandardMaterial 
              color={treeColor} 
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          
          {/* Snow on top layer */}
          <mesh position={[0, 12 * scale, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[4 * scale * 0.9, 2 * scale, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              roughness={0.9}
              metalness={0.0}
              transparent
              opacity={snowAmount}
            />
          </mesh>
        </group>
        
        {/* Island collision */}
        {hasCollision && (
          <>
            {/* Island base collision */}
            <CuboidCollider 
              args={[islandRadius, islandHeight/2, islandRadius]} 
              position={[0, 0, 0]} 
            />
            
            {/* Tree trunk collision */}
            <CuboidCollider 
              args={[1.5 * scale, trunkHeight/2, 1.5 * scale]} 
              position={[0, islandHeight/2 + trunkHeight/2, 0]} 
            />
            
            {/* Tree foliage collision - conical approximation using multiple cuboids */}
            <CuboidCollider 
              args={[baseRadius * 0.9, 4 * scale, baseRadius * 0.9]} 
              position={[0, islandHeight/2 + trunkHeight + 2 * scale, 0]} 
            />
            
            <CuboidCollider 
              args={[baseRadius * 0.7, 4 * scale, baseRadius * 0.7]} 
              position={[0, islandHeight/2 + trunkHeight + 6 * scale, 0]} 
            />
            
            <CuboidCollider 
              args={[baseRadius * 0.5, 4 * scale, baseRadius * 0.5]} 
              position={[0, islandHeight/2 + trunkHeight + 10 * scale, 0]} 
            />
        
        {/* Debug visualization */}
            {isEnabled && (
              <group>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[islandRadius * 2, islandHeight, islandRadius * 2]} />
                  <meshBasicMaterial 
                    color={showDebug ? "#ff0000" : "#00ff00"} 
                    wireframe={true} 
                    transparent={true} 
                    opacity={0.5} 
                  />
                </mesh>
                
                <mesh position={[0, islandHeight/2 + trunkHeight/2, 0]}>
                  <boxGeometry args={[3 * scale, trunkHeight, 3 * scale]} />
                  <meshBasicMaterial 
                    color={showDebug ? "#ff0000" : "#00ff00"} 
                    wireframe={true} 
                    transparent={true} 
                    opacity={0.5} 
                  />
                </mesh>
                
                <mesh position={[0, islandHeight/2 + trunkHeight + 2 * scale, 0]}>
                  <boxGeometry args={[baseRadius * 1.8, 4 * scale, baseRadius * 1.8]} />
                  <meshBasicMaterial 
                    color={showDebug ? "#ff0000" : "#00ff00"} 
                    wireframe={true} 
                    transparent={true} 
                    opacity={0.5} 
                  />
                </mesh>
                
                <mesh position={[0, islandHeight/2 + trunkHeight + 6 * scale, 0]}>
                  <boxGeometry args={[baseRadius * 1.4, 4 * scale, baseRadius * 1.4]} />
                  <meshBasicMaterial 
                    color={showDebug ? "#ff0000" : "#00ff00"} 
                    wireframe={true} 
                    transparent={true} 
                    opacity={0.5} 
                  />
                </mesh>
                
                <mesh position={[0, islandHeight/2 + trunkHeight + 10 * scale, 0]}>
                  <boxGeometry args={[baseRadius * 1.0, 4 * scale, baseRadius * 1.0]} />
            <meshBasicMaterial 
              color={showDebug ? "#ff0000" : "#00ff00"} 
              wireframe={true} 
              transparent={true} 
              opacity={0.5} 
            />
          </mesh>
              </group>
            )}
          </>
        )}
      </group>
    </RigidBody>
  )
}

// Taller pine tree variant with darker foliage
export function TallPineTree({
  position,
  scale = 1,
  rotation = 0,
  hasCollision = true,
  snowAmount = 0.6 // Slightly less snow for contrast
}: PineTreeProps) {
  const { showDebug = false, isEnabled = false } = useCollisionVisualization()
  
  // Use a darker green for this variant
  const treeColor = "#2e7d32" // Darker green
  
  // Make it taller by increasing the scale
  const tallScale = scale * 1.2
  
  // Create a small island for the tree
  const islandRadius = 15 * tallScale
  const islandHeight = 2 * tallScale
  const treeGroupRef = useRef<THREE.Group>(null)
  
  // Calculate collision sizes based on scale
  const trunkHeight = 10 * tallScale
  const foliageHeight = 15 * tallScale
  const baseRadius = 8 * tallScale
  
  // We're using a dedicated ref for the tree group to help with visualization
  const treeHeight = islandHeight + trunkHeight + foliageHeight
  
  return (
    <RigidBody 
      type="fixed" 
      position={position}
      colliders={false} // We'll define explicit colliders instead of automatic
      userData={{ name: 'TallPineTree' }} // Add name to userData for collision identification
    >
      <group rotation={[0, rotation, 0]} ref={treeGroupRef}>
        {/* Island base */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[islandRadius, islandRadius * 1.1, islandHeight, 8]} />
          <meshStandardMaterial 
            color="#ffffff" 
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>
        
        {/* Tree trunk */}
        <mesh position={[0, islandHeight/2 + 5 * tallScale, 0]}>
          <cylinderGeometry args={[1 * tallScale, 1.5 * tallScale, 10 * tallScale, 8]} />
          <meshStandardMaterial 
            color="#3e2723" 
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        
        {/* Tree foliage - multiple cone layers */}
        <group position={[0, islandHeight/2 + 10 * tallScale, 0]}>
          {/* Bottom layer */}
          <mesh position={[0, 0, 0]}>
            <coneGeometry args={[8 * tallScale, 10 * tallScale, 8]} />
            <meshStandardMaterial 
              color={treeColor} 
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          
          {/* Snow on bottom layer */}
          <mesh position={[0, 1 * tallScale, 0]} rotation={[0, Math.PI / 8, 0]}>
            <coneGeometry args={[8 * tallScale * 0.9, 4 * tallScale, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              roughness={0.9}
              metalness={0.0}
              transparent
              opacity={snowAmount}
            />
          </mesh>
          
          {/* Middle layer */}
          <mesh position={[0, 6 * tallScale, 0]}>
            <coneGeometry args={[6 * tallScale, 8 * tallScale, 8]} />
            <meshStandardMaterial 
              color={treeColor} 
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          
          {/* Snow on middle layer */}
          <mesh position={[0, 7 * tallScale, 0]} rotation={[0, Math.PI / 6, 0]}>
            <coneGeometry args={[6 * tallScale * 0.9, 3 * tallScale, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              roughness={0.9}
              metalness={0.0}
              transparent
              opacity={snowAmount}
            />
          </mesh>
          
          {/* Top layer */}
          <mesh position={[0, 11 * tallScale, 0]}>
            <coneGeometry args={[4 * tallScale, 6 * tallScale, 8]} />
            <meshStandardMaterial 
              color={treeColor} 
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
          
          {/* Snow on top layer */}
          <mesh position={[0, 12 * tallScale, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[4 * tallScale * 0.9, 2 * tallScale, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              roughness={0.9}
              metalness={0.0}
              transparent
              opacity={snowAmount}
            />
          </mesh>
        </group>
        
        {/* Island collision */}
        {hasCollision && (
          <>
            {/* Island base collision */}
            <CuboidCollider 
              args={[islandRadius, islandHeight/2, islandRadius]} 
              position={[0, 0, 0]} 
            />
            
            {/* Tree trunk collision */}
            <CuboidCollider 
              args={[1.5 * tallScale, trunkHeight/2, 1.5 * tallScale]} 
              position={[0, islandHeight/2 + trunkHeight/2, 0]} 
            />
            
            {/* Tree foliage collision - conical approximation using multiple cuboids */}
            <CuboidCollider 
              args={[baseRadius * 0.9, 4 * tallScale, baseRadius * 0.9]} 
              position={[0, islandHeight/2 + trunkHeight + 2 * tallScale, 0]} 
            />
            
            <CuboidCollider 
              args={[baseRadius * 0.7, 4 * tallScale, baseRadius * 0.7]} 
              position={[0, islandHeight/2 + trunkHeight + 6 * tallScale, 0]} 
            />
            
            <CuboidCollider 
              args={[baseRadius * 0.5, 4 * tallScale, baseRadius * 0.5]} 
              position={[0, islandHeight/2 + trunkHeight + 10 * tallScale, 0]} 
            />
            
            {/* Debug visualization */}
            {isEnabled && (
              <group>
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[islandRadius * 2, islandHeight, islandRadius * 2]} />
                  <meshBasicMaterial 
                    color={showDebug ? "#ff0000" : "#00ff00"} 
                    wireframe={true} 
                    transparent={true} 
                    opacity={0.5} 
                  />
                </mesh>
                
                <mesh position={[0, islandHeight/2 + trunkHeight/2, 0]}>
                  <boxGeometry args={[3 * tallScale, trunkHeight, 3 * tallScale]} />
                  <meshBasicMaterial 
                    color={showDebug ? "#ff0000" : "#00ff00"} 
                    wireframe={true} 
                    transparent={true} 
                    opacity={0.5} 
                  />
                </mesh>
                
                <mesh position={[0, islandHeight/2 + trunkHeight + 2 * tallScale, 0]}>
                  <boxGeometry args={[baseRadius * 1.8, 4 * tallScale, baseRadius * 1.8]} />
                  <meshBasicMaterial 
                    color={showDebug ? "#ff0000" : "#00ff00"} 
                    wireframe={true} 
                    transparent={true} 
                    opacity={0.5} 
                  />
                </mesh>
                
                <mesh position={[0, islandHeight/2 + trunkHeight + 6 * tallScale, 0]}>
                  <boxGeometry args={[baseRadius * 1.4, 4 * tallScale, baseRadius * 1.4]} />
                  <meshBasicMaterial 
                    color={showDebug ? "#ff0000" : "#00ff00"} 
                    wireframe={true} 
                    transparent={true} 
                    opacity={0.5} 
                  />
                </mesh>
                
                <mesh position={[0, islandHeight/2 + trunkHeight + 10 * tallScale, 0]}>
                  <boxGeometry args={[baseRadius * 1.0, 4 * tallScale, baseRadius * 1.0]} />
                  <meshBasicMaterial 
                    color={showDebug ? "#ff0000" : "#00ff00"} 
                    wireframe={true} 
                    transparent={true} 
                    opacity={0.5} 
                  />
                </mesh>
              </group>
            )}
          </>
        )}
      </group>
    </RigidBody>
  )
}

// Export a complete arctic ocean scene with pine trees
export function ArcticOceanScene() {
  return (
    <group>
      <ArcticOcean useCustomSettings={true} />
      
      {/* Create several pine trees at different positions */}
      <PineTree position={[-100, 0, -100]} scale={1.2} rotation={Math.PI * 0.2} />
      <TallPineTree position={[150, 0, -50]} scale={0.9} rotation={Math.PI * 0.7} />
      <PineTree position={[-50, 0, 150]} scale={1.5} rotation={Math.PI * 0.4} />
      <TallPineTree position={[200, 0, 200]} scale={1.0} rotation={Math.PI * 0.9} />
      <PineTree position={[-200, 0, -200]} scale={1.3} rotation={Math.PI * 0.3} />
      <TallPineTree position={[-120, 0, 80]} scale={1.1} rotation={Math.PI * 0.5} />
      <PineTree position={[100, 0, -180]} scale={0.8} rotation={Math.PI * 0.1} />
      
      {/* Add some lighting for the ocean scene */}
      <ambientLight intensity={0.4} color="#b0c8ff" />
      <directionalLight 
        position={[100, 100, 50]} 
        intensity={0.8} 
        castShadow 
        color="#e0f0ff"
      />
    </group>
  )
} 