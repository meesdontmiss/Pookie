'use client'

import { useEffect, useState, useRef, useMemo, useCallback, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { 
  PerspectiveCamera, 
  Environment, 
  Sky, 
  Stars,
  Preload,
  AdaptiveDpr,
  PerformanceMonitor,
  useTexture,
  Text,
  Html,
  GradientTexture,
  OrbitControls,
  TransformControls
} from '@react-three/drei'
import * as THREE from 'three'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import { Player } from '../entities/player'
import { Igloo } from '../entities/igloo'
import { WinterChat } from '../ui/winter-chat'
import { MiniMap } from '../ui/mini-map'
import { ControlsPanel } from '../ui/controls-panel'
import { DevToolsButton } from '../ui/dev-tools-button'
import { FishingRod } from '../fishing/fishing-rod'
import { Fish, FishType } from '../fishing/fish'
import { OrbitCamera } from '../controls/orbit-camera'
import { useMiddleClick } from '../../../hooks/use-middle-click'
import { CollisionEditorProvider, useCollisionEditor } from '@/components/game/collision-editor-context'
import { CollisionEditorGrid } from '@/components/game/collision-editor-grid'
import { useCollisionVisualization } from '@/components/game/collision-visualization-context'
import { CollisionShapeProvider, useCollisionShape } from '@/components/game/collision-shape-context'
import { CollisionShapeToolbar } from '../ui/collision-shape-toolbar'
import { CollisionShapePreview } from '@/components/game/collision-shape-preview'
import { CollisionTestControls } from '@/components/game/collision-testing/test-controls'
import { TestBallProvider } from '@/components/game/collision-testing/test-ball-context'
import { TestBallRenderer } from '@/components/game/collision-testing/test-ball-renderer'
import { CollisionTestingEnvironment } from '@/components/game/collision-testing/collision-testing-environment'
import { FreeCamera } from '@/components/game/collision-testing/free-camera'
import { CustomGLBAssets } from '../entities/custom-glb-assets'
import { ArcticOcean, PineTree, TallPineTree } from '../landscape/arctic-ocean'
import { OceanSettingsProvider } from '../landscape/ocean-settings-context'
import { GameUI } from '../ui/game-ui'
import { CollectibleItem } from '../entities/collectible-item'
import { collectibleItems, CollectibleItemData } from '@/data/collectible-items'
import { initAutoSave, initGameState } from '@/lib/supabase-service'
import { supabase } from '@/services/supabase-config'
import { useGameStore } from '@/lib/store'
// import { FighterJet } from '../entities/fighter-jet' // Commented out
import { DisplayJet } from '../entities/display-jet'
// import { AirCombatPortal } from '../minigames/air-combat/portal' // Commented out
// import { AirCombatScene } from '../minigames/air-combat' // Commented out
import { SocketService } from '@/lib/socket'
import { CollisionMapVisualizer } from '@/components/game/collision-map-visualizer'
import { PermanentCollisionRenderer } from '@/components/game/permanent-collision-renderer'
import { WorldLeaderboard } from '@/components/leaderboard/world-leaderboard'
import { FloatingLeaderboard } from '@/components/leaderboard/floating-leaderboard'

interface GameSceneProps {
  onLoadComplete?: () => void
}

// Global Snowfall component that covers the entire map
function Snowfall({ 
  count = 3000, 
  size = 0.2, 
  area = 1500,
  speed = 0.6
}: { 
  count?: number; 
  size?: number; 
  area?: number; 
  speed?: number; 
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { camera } = useThree()
  
  // Create a more optimized area for snow
  const [positions] = useState(() => {
    const positions = []
    
    // Distribute snowflakes evenly across a smaller area
    for (let i = 0; i < count; i++) {
      positions.push({
        x: (Math.random() - 0.5) * area,
        y: Math.random() * 200, // Lower height ceiling for better performance
        z: (Math.random() - 0.5) * area,
        velocity: Math.random() * 0.15 + 0.1, // Simplified velocity range
        size: Math.random() * 0.6 + 0.7, // Simplified size variation
        rotation: Math.random() * Math.PI,
        offset: Math.random() * Math.PI * 2
      })
    }
    
    return positions
  })
  
  useFrame((state, delta) => {
    if (!mesh.current) return
    
    const time = state.clock.getElapsedTime()
    const tempObject = new THREE.Object3D()
    
    // Get camera position for focusing snow
    const cameraPosition = camera.position.clone()
    
    // Only update a portion of the snowflakes each frame for better performance
    const updateCount = Math.min(count, 500)
    const startIndex = Math.floor(Math.random() * (count - updateCount))
    
    // Process a subset of snowflakes
    for (let i = startIndex; i < startIndex + updateCount; i++) {
      const p = positions[i]
      
      // Update position with falling motion
      p.y -= p.velocity
      
      // Reset height when it falls below ground
      if (p.y < -5) {
        p.y = 200
        
        // Concentrate near the camera
        const distanceFromCamera = Math.random() * area * 0.3
        const angle = Math.random() * Math.PI * 2
        
          p.x = cameraPosition.x + Math.cos(angle) * distanceFromCamera
          p.z = cameraPosition.z + Math.sin(angle) * distanceFromCamera
      }
      
      // Add simplified swaying motion
      const swayX = Math.sin(time * 0.3 + p.offset) * 0.3
      const swayZ = Math.cos(time * 0.2 + p.offset) * 0.3
      
      // Set the position
      tempObject.position.set(
        p.x + swayX, 
        p.y, 
        p.z + swayZ
      )
      tempObject.rotation.y = p.rotation
      tempObject.scale.set(p.size * size, p.size * size, p.size * size)
      tempObject.updateMatrix()
      
      // Update the instance matrix
      mesh.current.setMatrixAt(i, tempObject.matrix)
    }
    
    // Update only the modified matrices for better performance
    mesh.current.instanceMatrix.needsUpdate = true
  })
  
  return (
    <>
      {/* Snowflakes with optimized geometry */}
      <instancedMesh 
        ref={mesh} 
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <circleGeometry args={[1, 4]} /> {/* Reduced segments for better performance */}
        <meshBasicMaterial color="white" transparent opacity={0.8} side={THREE.DoubleSide} />
      </instancedMesh>
    </>
  )
}

// Enhanced SnowGround with collision visualization
function SnowGround() {
  const snowTexture = useTexture('/textures/winters_eve/snow_ground.jpg')
  const { showDebug = false, isEnabled = false } = useCollisionVisualization()
  
  // Configure texture
  snowTexture.wrapS = snowTexture.wrapT = THREE.RepeatWrapping
  snowTexture.repeat.set(8, 8) // Reduced for performance
  
  // Downscale texture for performance
  snowTexture.minFilter = THREE.LinearFilter
  snowTexture.magFilter = THREE.LinearFilter
  snowTexture.needsUpdate = true
  
  return (
    <group>
      {/* Main flat ground - optimized for performance */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[600, 600, 1, 1]} /> {/* Reduced size and segments */}
        <meshStandardMaterial 
          map={snowTexture}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Ground collision - optimized */}
      <RigidBody type="fixed" position={[0, -0.5, 0]} colliders={false}>
        <CuboidCollider args={[300, 0.5, 300]} position={[0, 0, 0]} />
        
        {/* Debug visualization - only when needed */}
        {isEnabled && showDebug && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[600, 1, 600]} />
            <meshBasicMaterial 
              color={"#ff0000"} 
              wireframe={true} 
              transparent={true} 
              opacity={0.3} 
            />
          </mesh>
        )}
      </RigidBody>
    </group>
  )
}

// Enhanced lighting setup for darker, aurora-focused atmosphere
function SceneLighting() {
  return (
    <>
      {/* Main directional light (sun) - reduced for performance */}
      <directionalLight 
        position={[50, 100, 50]} 
        intensity={0.4}
        castShadow 
        shadow-mapSize={[4096, 4096]} // Restored from 2048
        shadow-camera-far={500} // Restored from 400
        shadow-camera-left={-150} // Restored from -120
        shadow-camera-right={150} // Restored from 120
        shadow-camera-top={150} // Restored from 120
        shadow-camera-bottom={-150} // Restored from -120
        shadow-bias={-0.0005}
        color="#a0c8ff"
      />
      
      {/* Ambient light with blue tint */}
      <ambientLight intensity={0.15} color="#8090ff" />
      
      {/* Hemisphere light for blue sky */}
      <hemisphereLight 
        args={["#6090ff", "#e6f0ff", 0.3]}
        position={[0, 50, 0]} 
      />
    </>
  )
}

// Moon component with enhanced blue glow and aurora interaction
function Moon() {
  const moonTexture = useTexture('/textures/winters_eve/moon_sd.png')
  
  // Position the moon higher in the sky and further away
  const moonPosition: [number, number, number] = [-200, 180, 300]
  const moonSize = 32
  
  // Use a single ref for optimization
  const moonRefs = useRef({
    light: null as THREE.DirectionalLight | null
  })
  
  return (
    <group>
      {/* Main moon sprite */}
      <sprite position={moonPosition} scale={[moonSize, moonSize, 1]} renderOrder={3}>
        <spriteMaterial 
          map={moonTexture} 
          transparent={true} 
          opacity={0.9} 
          color="#e8f0ff"
          depthTest={true}
          depthWrite={false}
          fog={false}
        />
      </sprite>
      
      {/* Directional light from moon for casting shadows */}
      <directionalLight
        ref={(ref) => { moonRefs.current.light = ref }}
        position={moonPosition}
        intensity={0.5}
        color="#d0e0ff"
        castShadow={false} // Disabled shadow casting for performance
      />
    </group>
  )
}

// Party lights component for the igloo
function PartyLights() {
  // Use a single shared color ref for all lights
  const colorRef = useRef(new THREE.Color("#9900ff"))
  
  // Create a single light ref
  const mainLightRef = useRef<THREE.RectAreaLight>(null)
  
  // Track last color change time to reduce update frequency
  const lastUpdateRef = useRef(0)
  const isGreenRef = useRef(false)
  
  // Optimized animation with throttled updates
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    
    // Only update every 0.2 seconds (5Hz) instead of every frame
    if (time - lastUpdateRef.current > 0.2) {
      // Toggle between colors
      isGreenRef.current = !isGreenRef.current
      
      // Update the shared color
      colorRef.current.set(isGreenRef.current ? "#00ff80" : "#9900ff")
      
      // Update light with the new color
      if (mainLightRef.current) {
        mainLightRef.current.color = colorRef.current
      }
      
      // Update last change time
      lastUpdateRef.current = time
    }
  })
  
  // Memoize the light to prevent unnecessary recreations
  const light = useMemo(() => (
    <>
      {/* Single massive area light covering the entire ceiling */}
      <rectAreaLight
        ref={mainLightRef}
        position={[0, 5, 0]}
        width={15}
        height={25}
        intensity={100}
        color={colorRef.current}
        rotation={[-Math.PI / 2, 0, 0]} // Point downward
        castShadow={false}
      />
      
      {/* Low-intensity ambient light */}
      <ambientLight intensity={0.2} color="#ffffff" />
    </>
  ), []) // Empty dependency array means this only renders once
  
  return (
    <group>
      {light}
    </group>
  )
}

// Homebase Igloo Area
function HomebaseArea() {
  const [isIglooLoaded, setIsIglooLoaded] = useState(false)
  const { showDebug, isEnabled } = useCollisionVisualization()
  const [collisionMapLoaded, setCollisionMapLoaded] = useState(false)
  
  const handleIglooLoaded = () => {
    setIsIglooLoaded(true)
  }
  
  const handleCollisionMapLoaded = () => {
    setCollisionMapLoaded(true)
    console.log("Igloo collision map loaded successfully");
  }
  
  const handleCollisionMapError = (error: Error) => {
    console.error("Failed to load igloo collision map:", error);
  }
  
  return (
    <group position={[30, 0, -40]}>
      {/* Main Igloo - properly positioned on the ground */}
      <Igloo 
        position={[0, -1, 0]} 
        scale={2.2} 
        rotation={[0, Math.PI / 1.5, 0]} 
        onLoad={handleIglooLoaded} 
      />
      
      {/* Collision Map Visualizer for the igloo */}
      <CollisionMapVisualizer
        collisionMapPath="/collision-maps/collision-map-igloo.json"
        modelPath="/models/IGLOO.glb"
        position={[0, -1, 0]}
        rotation={[0, Math.PI / 1.5, 0]}
        scale={2.2}
        onLoad={handleCollisionMapLoaded}
        onError={handleCollisionMapError}
      />
      
      {/* Party lights inside the igloo */}
      {isIglooLoaded && <PartyLights />}
      
      {/* Welcome Sign - positioned exactly where the player was standing */}
      {isIglooLoaded && (
        <group 
          position={[-1.99 - 30, 2.5, 5.17 + 40]}
          rotation={[0, Math.PI * 1.75, 0]}
          scale={[4.5, 4.5, 4.5]}
        >
          {/* Taller sign posts styled like ski poles */}
          <mesh position={[-1.5, -0.5, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 6.5, 8]} />
            <meshStandardMaterial color="#5D4037" />
            
            {/* Connection to sign - horizontal support */}
            <mesh position={[0.75, 3.2, 0]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
              <meshStandardMaterial color="#5D4037" />
            </mesh>
          </mesh>
          
          <mesh position={[1.5, -0.5, 0]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 6.5, 8]} />
            <meshStandardMaterial color="#5D4037" />
            
            {/* Connection to sign - horizontal support */}
            <mesh position={[-0.75, 3.2, 0]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.1, 0.1, 1.5, 8]} />
              <meshStandardMaterial color="#5D4037" />
            </mesh>
          </mesh>
          
          {/* Sign board - positioned closer to the horizontal supports */}
          <mesh position={[0, 3.3, 0]}>
            <boxGeometry args={[4, 1, 0.2]} />
            <meshStandardMaterial color="#5D4037" /> {/* Darker wood color */}
            
            {/* Snow on top of the sign */}
            <mesh position={[0, 0.55, 0]} scale={[1, 0.1, 1.1]}>
              <boxGeometry args={[4, 1, 0.2]} />
              <meshStandardMaterial color="#ffffff" roughness={0.9} />
            </mesh>
            
            {/* Sign face with icy blue background */}
            <mesh position={[0, 0, 0.11]}>
              <planeGeometry args={[3.8, 0.8]} />
              <meshStandardMaterial color="#a0d8ff" roughness={0.3} metalness={0.2} /> {/* Icy blue color */}
              
              {/* Icicles at the bottom of the sign */}
              <group position={[0, -0.45, 0.01]}>
                <mesh position={[-1.5, 0, 0]}>
                  <coneGeometry args={[0.1, 0.4, 4]} />
                  <meshStandardMaterial color="#e6f0ff" transparent opacity={0.8} />
                </mesh>
                <mesh position={[-0.9, 0, 0]}>
                  <coneGeometry args={[0.08, 0.3, 4]} />
                  <meshStandardMaterial color="#e6f0ff" transparent opacity={0.8} />
                </mesh>
                <mesh position={[0, 0, 0]}>
                  <coneGeometry args={[0.1, 0.5, 4]} />
                  <meshStandardMaterial color="#e6f0ff" transparent opacity={0.8} />
                </mesh>
                <mesh position={[0.8, 0, 0]}>
                  <coneGeometry args={[0.07, 0.25, 4]} />
                  <meshStandardMaterial color="#e6f0ff" transparent opacity={0.8} />
                </mesh>
                <mesh position={[1.6, 0, 0]}>
                  <coneGeometry args={[0.09, 0.35, 4]} />
                  <meshStandardMaterial color="#e6f0ff" transparent opacity={0.8} />
                </mesh>
              </group>
              
              {/* Club text */}
              <Text
                position={[-0.7, 0, 0.02]}
                scale={0.5}
                color="#0a3b72" // Deep blue color for contrast
                fontSize={0.7}
                font="/fonts/Heavitas.ttf" // Using the Heavitas font you added
                textAlign="center"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#ffffff"
              >
                Club
              </Text>
              
              {/* Blue P emoji-style */}
              <mesh position={[0, 0, 0.01]}>
                <circleGeometry args={[0.35, 32]} />
                <meshBasicMaterial color="#1e88e5" /> {/* Blue color for P emoji */}
                <Text
                  position={[0, 0.0, 0.01]}
                  scale={0.5}
                  color="#ffffff"
                  fontSize={0.8}
                  font="/fonts/Heavitas.ttf"
                  textAlign="center"
                  anchorX="center"
                  anchorY="middle"
                >
                  P
                </Text>
              </mesh>
              
              {/* Pookie text */}
              <Text
                position={[1.0, 0, 0.02]}
                scale={0.5}
                color="#0a3b72" // Deep blue color for contrast
                fontSize={0.7}
                font="/fonts/Heavitas.ttf" // Using the Heavitas font you added
                textAlign="center"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#ffffff"
              >
                ookie
              </Text>
            </mesh>
          </mesh>
        </group>
      )}
      
      {/* Path to Igloo - adjusted to lead to the entrance */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[-7, 0.01, -7]}>
        <planeGeometry args={[15, 4]} />
        <meshStandardMaterial color="#f0f0ff" roughness={0.7} metalness={0.1} />
      </mesh>
      
      {/* Directional sign pointing to the flight area */}
      <group position={[20, 0, -20]} rotation={[0, Math.PI / 4, 0]}>
        {/* Sign post */}
        <mesh position={[0, 2, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 4, 8]} />
          <meshStandardMaterial color="#5D4037" roughness={0.8} />
        </mesh>
        
        {/* Snow cap on post */}
        <mesh position={[0, 4.1, 0]}>
          <cylinderGeometry args={[0.3, 0.2, 0.2, 8]} />
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </mesh>
        
        {/* Direction arrow - pointing to dogfight area */}
        <group position={[0, 3, 0]} rotation={[0, Math.PI / 4, 0]}>
          <mesh>
            <boxGeometry args={[4, 0.8, 0.2]} />
            <meshStandardMaterial color="#d32f2f" roughness={0.7} />
          </mesh>
          
          {/* Arrow point */}
          <mesh position={[2.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.8, 1.6, 4]} />
            <meshStandardMaterial color="#d32f2f" roughness={0.7} />
          </mesh>
          
          {/* Text */}
          <Text
            position={[0, 0, 0.15]}
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="black"
          >
            DOGFIGHT
          </Text>
          
          {/* Distance indicator */}
          <Text
            position={[0, -0.3, 0.15]}
            fontSize={0.25}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="black"
          >
            200m
          </Text>
        </group>
        
        {/* Direction arrow - pointing to other locations (can add more later) */}
        <group position={[0, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh>
            <boxGeometry args={[3, 0.8, 0.2]} />
            <meshStandardMaterial color="#4caf50" roughness={0.7} />
          </mesh>
          
          {/* Arrow point */}
          <mesh position={[2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.8, 1.6, 4]} />
            <meshStandardMaterial color="#4caf50" roughness={0.7} />
          </mesh>
          
          {/* Text */}
          <Text
            position={[0, 0, 0.15]}
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="black"
          >
            IGLOO
          </Text>
        </group>
      </group>
      
      {/* Path previously connecting to the airport - kept as a path to nowhere */}
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 3]} position={[100, 0.01, -100]}>
        <planeGeometry args={[150, 10]} />
        <meshStandardMaterial color="#f0f0ff" roughness={0.7} metalness={0.1} />
      </mesh>
    </group>
  )
}

// EditorModeHandler component to manage editor state
function EditorModeHandler({ 
  children, 
  playerPosition,
  onSensitivityChange,
  initialSensitivity,
  onFreeCameraModeChange
}: { 
  children: React.ReactNode
  playerPosition: THREE.Vector3
  onSensitivityChange: (value: number) => void
  initialSensitivity: number
  onFreeCameraModeChange: (enabled: boolean) => void
}) {
  const { setEditorMode } = useCollisionEditor()
  const { setIsEditorEnabled } = useCollisionShape()
  const { toggleDebug, setEnabled } = useCollisionVisualization()
  const [isEditorMode, setLocalEditorMode] = useState(false)

  // Handle editor mode toggle
  const handleEditorModeToggle = useCallback(() => {
    const newMode = !isEditorMode
    setLocalEditorMode(newMode)
    setEditorMode(newMode, playerPosition)
    setIsEditorEnabled(newMode) // Sync collision shape editor state
  }, [isEditorMode, playerPosition, setEditorMode, setIsEditorEnabled])

  // Handle collision debug toggle
  const handleCollisionDebugToggle = useCallback(() => {
    toggleDebug()
    setEnabled(true) // Make sure collision visualization is enabled
    
    // Show a temporary notification
    const event = new CustomEvent('showMessage', {
      detail: {
        message: 'Collision Debug Toggled',
        type: 'info',
        duration: 3000
      }
    })
    window.dispatchEvent(event)
    
    // Log debug state to console
    console.log('Collision debug toggled - visualization should now be visible');
  }, [toggleDebug, setEnabled])

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F6') {
        handleEditorModeToggle()
      } else if (e.key === 'F7') {
        handleCollisionDebugToggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleEditorModeToggle, handleCollisionDebugToggle])

  // Handle free camera mode change
  const handleFreeCameraModeChange = (enabled: boolean) => {
    onFreeCameraModeChange(enabled)
  }

  return (
    <>
      {children}
      {/* Position components horizontally at the top, not overlapping title text */}
      <div style={{ 
        position: 'fixed', 
        top: '10px', // Moved up from 20px to better align with other top buttons
        left: '200px', // Left position that doesn't overlap title
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '20px',
        zIndex: 9999 
      }}>
        {/* DevToolsButton next to it */}
        <div>
          <DevToolsButton 
            playerPosition={playerPosition}
            onSensitivityChange={onSensitivityChange}
            initialSensitivity={initialSensitivity}
            isEditorMode={isEditorMode}
            onEditorModeToggle={handleEditorModeToggle}
            onFreeCameraModeChange={handleFreeCameraModeChange}
          />
        </div>
      </div>
    </>
  )
}

// Add this new component for displaying messages
function GameMessage({ message, type }: { message: string, type: 'success' | 'info' | 'warning' | 'error' }) {
  const [visible, setVisible] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [])
  
  if (!visible) return null
  
  // Define colors based on message type
  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'bg-green-600'
      case 'info': return 'bg-blue-600'
      case 'warning': return 'bg-yellow-600'
      case 'error': return 'bg-red-600'
      default: return 'bg-blue-600'
    }
  }
  
  return (
    <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg ${getBackgroundColor()} text-white shadow-lg z-50 animate-fadeIn`}>
      {message}
    </div>
  )
}

// Main game scene component
export default function GameScene({ onLoadComplete }: GameSceneProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadingStage, setLoadingStage] = useState(0) // 0: initial, 1: core, 2: complete
  const [dpr, setDpr] = useState(window.devicePixelRatio > 1 ? 1 : 0.75) // Lower DPR for better startup performance
  const [playerPosition, setPlayerPosition] = useState(new THREE.Vector3(-59.50, 0.00, 15.34))
  const [debugPhysics, setDebugPhysics] = useState(false)
  const [isPlayerInIgloo, setIsPlayerInIgloo] = useState(false)
  const [freeCameraMode, setFreeCameraMode] = useState(false)
  const [transformActive, setTransformActive] = useState(false)
  const [controlsPaused, setControlsPaused] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [gameMessages, setGameMessages] = useState<{id: number, message: string, type: 'success' | 'info' | 'warning' | 'error'}[]>([])
  const nextMessageId = useRef(0)
  const [currentMinigame, setCurrentMinigame] = useState<string | null>(null)
  const [sensitivity, setSensitivity] = useState({
    horizontal: 2.2,
    vertical: 2.0
  })
  
  // Define performance bounds - moved outside of JSX for stability
  const perfBounds = useMemo(() => [10, 30] as [number, number], [])
  
  // Use the middle click hook to toggle orbit camera
  const isOrbitActive = useMiddleClick()

  // Handle player loaded
  const handlePlayerLoaded = () => {
    // Transition to loading stage 2
    setLoadingStage(2)
    
    // Small delay before marking as fully loaded
    setTimeout(() => {
    setIsLoaded(true)
    if (onLoadComplete) onLoadComplete()
    }, 500)
  }

  // Define additional controls for the controls panel
  const additionalControls = [
    { key: 'ESC', action: 'Pause Controls' },
    { key: 'Middle Click', action: 'Orbit Camera' },
    { key: 'C', action: 'Copy Coordinates' },
    { key: 'F6', action: 'Toggle Editor Mode' },
    { key: 'F7', action: 'Toggle Collision Debug' }
  ]
  
  // Advance to core loading stage
  useEffect(() => {
    // Set initial loading stage
    const timer = setTimeout(() => {
      setLoadingStage(1) // Move to core loading
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  // Add keyboard handler for coordinates copying
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if C key is pressed and not when typing in chat input or other text fields
      if ((e.key === 'c' || e.key === 'C') && !((window as any).isChatInputFocused)) {
        if (playerPosition) {
          console.log('Player coordinates:', {
            x: playerPosition.x.toFixed(2),
            y: playerPosition.y.toFixed(2),
            z: playerPosition.z.toFixed(2)
          });
          
          // Format coordinates for clipboard
          const coordsText = `[${playerPosition.x.toFixed(2)}, ${playerPosition.y.toFixed(2)}, ${playerPosition.z.toFixed(2)}]`;
          
          // Copy to clipboard
          navigator.clipboard.writeText(coordsText)
            .then(() => {
              console.log('Coordinates copied to clipboard:', coordsText);
              
              // Show notification message
              const id = nextMessageId.current++;
              setGameMessages(prev => [...prev, {
                id,
                message: `Coordinates copied: ${coordsText}`,
                type: 'success'
              }]);
              
              // Remove message after duration
              setTimeout(() => {
                setGameMessages(prevMessages => 
                  prevMessages.filter(msg => msg.id !== id)
                );
              }, 3000);
            })
            .catch(err => {
              console.error('Could not copy coordinates:', err);
              
              // Show error message
              const id = nextMessageId.current++;
              setGameMessages(prev => [...prev, {
                id,
                message: 'Failed to copy coordinates',
                type: 'error'
              }]);
              
              // Remove message after duration
              setTimeout(() => {
                setGameMessages(prevMessages => 
                  prevMessages.filter(msg => msg.id !== id)
                );
              }, 3000);
            });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPosition]);

  // Handle player position change
  const handlePositionChange = (position: THREE.Vector3) => {
    setPlayerPosition(position.clone())
    
    // Check if player is inside the igloo area
    // Igloo is positioned at [30, 0, -40] with some height and radius
    const iglooPosition = new THREE.Vector3(30, 0, -40)
    const distanceToIgloo = position.distanceTo(iglooPosition)
    const isInIgloo = distanceToIgloo < 8 // Approximate igloo radius
    
    // Only update state if it changed to avoid unnecessary renders
    if (isInIgloo !== isPlayerInIgloo) {
      setIsPlayerInIgloo(isInIgloo)
    }
  }

  // Handle sensitivity change
  const handleSensitivityChange = (horizontal: number, vertical: number) => {
    setSensitivity({ horizontal, vertical })
  }
  
  // Create an adapter function that takes a single value and passes it to handleSensitivityChange
  const handleControlsGUISensitivity = (value: number) => {
    handleSensitivityChange(value, value);
  }
  
  // Updated sensitivity handler for ControlsPanel
  const handleControlsPanelSensitivity = (value: number) => {
    // Apply the same sensitivity value to both horizontal and vertical
    handleSensitivityChange(value, value)
  }
  
  // Handle performance changes
  const handlePerformanceChange = ({ factor }: { factor: number }) => {
    // Adjust quality based on performance
    setDpr(Math.max(0.75, Math.min(1.5, 1.0 * factor)))
  }
  
  // Handle camera reset after orbit mode
  const handleOrbitReset = () => {
    // Any additional reset logic can go here
    console.log('Orbit camera reset')
  }
  
  // Handle free camera mode change
  const handleFreeCameraModeChange = (enabled: boolean) => {
    setFreeCameraMode(enabled)
    // Pause regular controls when free camera is enabled
    setControlsPaused(enabled)
  }

  // Simplified Loading Screen
  if (loadingStage < 1) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-white text-xl">Loading game assets...</div>
      </div>
    )
  }

  return (
    <OceanSettingsProvider>
      <CollisionEditorProvider>
        <CollisionShapeProvider>
          <TestBallProvider>
            <EditorModeHandler 
              playerPosition={playerPosition}
              onSensitivityChange={handleControlsGUISensitivity}
              initialSensitivity={sensitivity.horizontal}
              onFreeCameraModeChange={handleFreeCameraModeChange}
            >
              {/* Show all active game messages */}
              <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 flex flex-col gap-2">
                {gameMessages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`px-6 py-3 rounded-lg text-white font-bold shadow-lg animate-fadeIn
                      ${msg.type === 'success' ? 'bg-green-600' : 
                        msg.type === 'error' ? 'bg-red-600' : 
                        msg.type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'}`}
                  >
                    {msg.message}
                  </div>
                ))}
              </div>
              
              {/* Show minigame if active */}
              {/* {currentMinigame === 'airCombat' ? ( // Commented out AirCombatScene block
                <AirCombatScene />
              ) : ( */}
                <Canvas 
                  shadows 
                  dpr={window.devicePixelRatio}
                  gl={{ 
                    antialias: true,
                    alpha: false,
                    stencil: false,
                    depth: true,
                    powerPreference: 'high-performance',
                    logarithmicDepthBuffer: false
                  }}
                  camera={{ position: [-59.50, 0.00, 15.34], fov: 75, far: 1000 }} // Reduced far plane
                >
                  <PerformanceMonitor 
                    onDecline={handlePerformanceChange} 
                    onIncline={handlePerformanceChange}
                  >
                    {/* Scene lighting */}
                    <SceneLighting />
                    
                    {/* TEMPORARY TEST REMOVED: <Environment preset="city" /> */}
                    
                    {/* Night sky background */}
                    <color attach="background" args={['#051428']} />
                    
                    {/* Adjusted fog for potentially brighter water */}
                    <fog attach="fog" args={['#2c3e50', 50, 700]} /> 
                    
                    {/* Physics world */}
                    <Physics gravity={[0, -9.81, 0]}>
                      {/* Enhanced Snow Ground with expanded terrain */}
                      <SnowGround />
                      
                      {/* Arctic Ocean surrounding the snow ground */}
                      <ArcticOcean 
                        useCustomSettings={false}
                        key="main-ocean"
                        size={1000}
                        position={[0, -0.5, 0]}
                        waterColor="#A0D2EB" // Even lighter sky blue
                        sunDirection={[0.5, 0.3, -0.8]} 
                        distortionScale={1.5} 
                      />
                      
                      {/* Only show decorative elements when fully loaded */}
                      {loadingStage === 2 && (
                        <>
                          {/* Only load pine trees if fully loaded */}
                      <PineTree position={[-200, -0.2, -200]} scale={1.2} rotation={Math.PI * 0.2} />
                      <TallPineTree position={[300, -0.2, 300]} scale={1.0} rotation={Math.PI * 0.9} />
                      <PineTree position={[-300, -0.2, 50]} scale={1.3} rotation={Math.PI * 0.5} />
                      
                      {/* Added Pine Trees */}
                      <PineTree position={[150, -0.2, -180]} scale={1.1} rotation={Math.PI * 0.7} />
                      <TallPineTree position={[-150, -0.2, 200]} scale={1.25} rotation={Math.PI * 0.3} />
                      <PineTree position={[250, -0.2, 80]} scale={1.35} rotation={Math.PI * 1.1} />
                      <TallPineTree position={[-80, -0.2, -250]} scale={1.15} rotation={Math.PI * 1.5} />
                      <PineTree position={[50, -0.2, 220]} scale={1.2} rotation={Math.PI * 0.1} />
                      <TallPineTree position={[200, -0.2, -50]} scale={1.3} rotation={Math.PI * 1.8} />
                      <PineTree position={[-250, -0.2, -280]} scale={1.0} rotation={Math.PI * 0.8} />
                      
                      {/* Second batch of added Pine Trees */}
                      <PineTree position={[100, -0.2, 150]} scale={1.15} rotation={Math.PI * 1.2} />
                      <TallPineTree position={[-100, -0.2, -150]} scale={1.3} rotation={Math.PI * 0.4} />
                      <PineTree position={[200, -0.2, 250]} scale={1.2} rotation={Math.PI * 1.9} />
                      <TallPineTree position={[-220, -0.2, 100]} scale={1.05} rotation={Math.PI * 0.6} />
                      <PineTree position={[0, -0.2, -200]} scale={1.25} rotation={Math.PI * 1.3} />
                      <TallPineTree position={[180, -0.2, 0]} scale={1.35} rotation={Math.PI * 0.25} />
                      <PineTree position={[-180, -0.2, -100]} scale={1.1} rotation={Math.PI * 1.6} />
                      
                      {/* Editor Grid */}
                      <CollisionEditorGrid />
                      
                          {/* Custom GLB Assets - lazy loaded */}
                      <CustomGLBAssets />
                      
                      {/* Shape Preview */}
                      <CollisionShapePreview />
                      
                          {/* Reduced snowfall */}
                      {!isPlayerInIgloo && (
                        <Snowfall 
                              count={1000}
                          speed={0.9}
                        />
                      )}
                      
                      {/* Homebase area with igloo */}
                      <HomebaseArea />
                      
                          {/* Reduce collectible items to essential ones */}
                          {collectibleItems.slice(0, 5).map((item: CollectibleItemData) => (
                        <CollectibleItem
                          key={item.id}
                          position={item.position}
                          rotation={item.rotation}
                          scale={item.scale}
                          itemId={item.id}
                          name={item.name}
                          modelPath={item.modelPath}
                          itemData={item.itemData}
                          glowColor={item.glowColor}
                        />
                      ))}
                      
                      {/* Portals and main world features */}
                      <group>
                        {/* Dogfight portal - Commented out DisplayJet */}
                        {/* <DisplayJet 
                          position={[-165.97, 5.00, -26.02]} 
                          scale={1.5}
                          rotationSpeed={0.2}
                        /> */}
                        
                        {/* Super Pookyball entrance */}
                        {/* <SuperPookieBallEntrance 
                          position={[-169.34, 0.00, 63.20]}
                          /> */}
                        </group>
                        </>
                      )}
                      
                      {/* Orbit camera that activates with middle mouse clicks */}
                      {isOrbitActive && !controlsPaused && (
                        <OrbitCamera 
                          target={playerPosition} 
                          distance={20} 
                          height={10} 
                          rotationSpeed={0.3}
                          isActive={true}
                          onReset={handleOrbitReset}
                        />
                      )}
                      
                      {/* Player character - only show when not in free camera mode */}
                      {!freeCameraMode && (
                        <Player
                          position={[-59.50, 0.00, 15.34]}
                          onPlayerLoaded={handlePlayerLoaded}
                          onPositionChange={handlePositionChange}
                          horizontalSensitivity={sensitivity.horizontal}
                          verticalSensitivity={sensitivity.vertical}
                          controlsEnabled={!controlsPaused}
                        />
                      )}
                      
                      {/* Only include these components when fully loaded */}
                      {loadingStage === 2 && (
                        <>
                      {/* Test Ball Renderer - inside Physics component */}
                      <TestBallRenderer />
                      
                      {/* Permanent Collision Renderer */}
                      <PermanentCollisionRenderer />
                        </>
                      )}
                    </Physics>
                    
                    {/* Free Camera - only active in free camera mode */}
                    {freeCameraMode && !transformActive && (
                      <FreeCamera enabled={true} moveSpeed={15} zoomSpeed={1.5} />
                    )}
                    
                    {/* Simplified stars */}
                    <Stars 
                      radius={300} 
                      depth={60} 
                      count={1000} 
                      factor={2} 
                      saturation={0.5} 
                      fade 
                      speed={0} 
                    />
                    
                    {/* Moon */}
                    <Moon />
                    
                    {/* Critical assets only for initial loading */}
                    <Preload all={false} />
                  </PerformanceMonitor>
                  
                  {/* Show loading overlay during stage 1 */}
                  {loadingStage === 1 && (
                    <Html fullscreen>
                      <div className="w-full h-full flex items-center justify-center bg-black bg-opacity-70">
                        <div className="text-white text-xl flex flex-col items-center">
                          <div>Loading world...</div>
                          <div className="w-64 h-2 bg-gray-800 rounded-full mt-4">
                            <div className="h-full bg-blue-500 rounded-full w-1/2 animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    </Html>
                  )}
                </Canvas>
              {/* )} */}{/* Closing parenthesis for commented out AirCombatScene block */}
              
              {/* UI Elements */}
              {isLoaded && (
                <>
                  {/* Only show UI elements when not in free camera mode */}
                  {!freeCameraMode && (
                    <>
                      <GameUI 
                        onSensitivityChange={handleControlsGUISensitivity}
                        initialSensitivity={sensitivity.horizontal}
                        additionalControls={additionalControls}
                      />
                      
                      {/* MiniMap positioned separately with absolute positioning */}
                      <div className="absolute top-24 right-8 z-10">
                        <MiniMap playerPosition={playerPosition} />
                      </div>
                    </>
                  )}
                  
                  <CollisionTestControls />
                  
                  {controlsPaused && !freeCameraMode && (
                    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-lg font-bold">
                      Controls Paused (ESC to resume)
                    </div>
                  )}
                </>
              )}
              <CollisionShapeToolbar />
            </EditorModeHandler>
          </TestBallProvider>
        </CollisionShapeProvider>
      </CollisionEditorProvider>
    </OceanSettingsProvider>
  )
} 