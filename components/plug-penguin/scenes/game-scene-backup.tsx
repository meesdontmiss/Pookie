'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
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
  GradientTexture
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

interface GameSceneProps {
  onLoadComplete?: () => void
}

// Global Snowfall component that covers the entire map
function Snowfall({ 
  count = 20000, 
  size = 0.12, 
  area = 2500
}: { 
  count?: number; 
  size?: number; 
  area?: number; 
}) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { scene } = useThree()
  
  // Create a larger area for snow to ensure complete map coverage
  const [positions] = useState(() => {
    const positions = []
    
    // Distribute snowflakes evenly across the entire map area
    for (let i = 0; i < count; i++) {
      positions.push({
        // Random position within a square area
        x: (Math.random() - 0.5) * area,
        y: Math.random() * 200, // Height ceiling
        z: (Math.random() - 0.5) * area,
        // Random velocity for varied falling speeds
        velocity: Math.random() * 0.15 + 0.05,
        // Random size variation
        size: Math.random() * 0.7 + 0.6,
        // Random rotation
        rotation: Math.random() * Math.PI,
        // Random offset for swaying
        offset: Math.random() * Math.PI * 2
      })
    }
    
    return positions
  })
  
  useFrame((state, delta) => {
    if (!mesh.current) return
    
    const time = state.clock.getElapsedTime()
    const tempObject = new THREE.Object3D()
    
    // Process all snowflakes
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]
      
      // Update position with falling motion
      p.y -= p.velocity
      
      // Reset height when it falls below ground
      if (p.y < -5) {
        p.y = 200 // Reset to high above the map
        // Randomize X/Z position when resetting to maintain even distribution
        p.x = (Math.random() - 0.5) * area
        p.z = (Math.random() - 0.5) * area
      }
      
      // Add some gentle swaying motion
      const swayX = Math.sin(time * 0.5 + p.offset) * 0.3
      const swayZ = Math.cos(time * 0.3 + p.offset) * 0.3
      
      // Set the position and rotation
      tempObject.position.set(
        p.x + swayX, 
        p.y, 
        p.z + swayZ
      )
      tempObject.rotation.set(p.rotation, p.rotation, p.rotation)
      tempObject.scale.set(p.size * size, p.size * size, p.size * size)
      tempObject.updateMatrix()
      
      // Update the instance matrix
      mesh.current.setMatrixAt(i, tempObject.matrix)
    }
    
    // Update the instance matrix
    mesh.current.instanceMatrix.needsUpdate = true
  })
  
  return (
    <>
      {/* Snowflakes */}
      <instancedMesh 
        ref={mesh} 
        args={[undefined, undefined, count]}
        frustumCulled={false} // Important: Disable frustum culling to render snow everywhere
      >
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="white" transparent opacity={0.9} />
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
  snowTexture.repeat.set(16, 16) // Reduced from 40x40 to 16x16 (60% reduction)
  
  return (
    <group>
      {/* Main flat ground - reduced by 60% */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[800, 800]} /> {/* Reduced from 2000x2000 to 800x800 (60% reduction) */}
        <meshStandardMaterial 
          map={snowTexture}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Ground collision - reduced by 60% */}
      <RigidBody type="fixed" position={[0, -0.5, 0]} colliders={false}>
        <CuboidCollider args={[400, 0.5, 400]} position={[0, 0, 0]} /> {/* Reduced from 1000 to 400 (60% reduction) */}
        
        {/* Debug visualization - always show when visualization is enabled */}
        {isEnabled && (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[800, 1, 800]} /> {/* Reduced from 2000 to 800 (60% reduction) */}
            <meshBasicMaterial 
              color={showDebug ? "#ff0000" : "#00ff00"} 
              wireframe={true} 
              transparent={true} 
              opacity={0.5} 
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
      {/* Main directional light (sun) - reduced for darker night atmosphere */}
      <directionalLight 
        position={[50, 100, 50]} 
        intensity={0.4} // Reduced from 0.7 to make the night darker
        castShadow 
        shadow-mapSize={[4096, 4096]}
        shadow-camera-far={500}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-bias={-0.0005}
        color="#a0c8ff" // Cooler blue tint for moonlight effect
      />
      
      {/* Ambient light with blue tint - reduced for darker scene */}
      <ambientLight intensity={0.15} color="#8090ff" /> {/* Reduced from 0.2 to 0.15 */}
      
      {/* Hemisphere light with enhanced blue sky */}
      <hemisphereLight 
        args={["#6090ff", "#e6f0ff", 0.3]} // Reduced from 0.4 to 0.3
        position={[0, 50, 0]} 
      />
      
      {/* Fill light with blue tint */}
      <directionalLight 
        position={[-30, 20, -30]} 
        intensity={0.1} // Reduced from 0.15 to 0.1
        color="#8eb8ff" 
      />
      
      {/* Additional point light for the igloo area with blue tint */}
      <pointLight 
        position={[30, 5, -40]} 
        intensity={1.0} // Reduced from 1.3 to 1.0
        color="#b4d8ff" 
        distance={60} 
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.001}
      />
      
      {/* Subtle blue rim light for extra vibes */}
      <pointLight 
        position={[-40, 10, 30]} 
        intensity={0.5} // Reduced from 0.6 to 0.5
        color="#80b0ff" 
        distance={80} 
        decay={2}
      />
    </>
  )
}

// Moon component with enhanced blue glow and aurora interaction
function Moon() {
  const moonTexture = useTexture('/textures/winters_eve/moon_sd.png')
  
  // Position the moon higher in the sky and further away
  const moonPosition: [number, number, number] = [-200, 180, 300] // Raised higher and further from player
  const moonSize = 32 // Slightly reduced for a less dominant appearance
  
  // Use a single ref for optimization
  const moonRefs = useRef({
    light: null as THREE.DirectionalLight | null,
    glow: null as THREE.PointLight | null
  })
  
  useFrame(({ clock }) => {
    // Subtle pulsing effect with reduced intensity
    const time = clock.getElapsedTime()
    
    if (moonRefs.current.light) {
      moonRefs.current.light.intensity = 0.5 + Math.sin(time * 0.2) * 0.1
    }
    
    if (moonRefs.current.glow) {
      moonRefs.current.glow.intensity = 1.0 + Math.sin(time * 0.3) * 0.2
    }
  })
  
  return (
    <group>
      {/* Main moon sprite - optimized with proper depth testing */}
      <sprite position={moonPosition} scale={[moonSize, moonSize, 1]} renderOrder={3}>
        <spriteMaterial 
          map={moonTexture} 
          transparent={true} 
          opacity={0.9} 
          color="#e8f0ff"
          depthTest={true} // Enable depth testing so it's hidden behind objects
          depthWrite={false} // Don't write to depth buffer (avoids z-fighting with itself)
          fog={false}
        />
      </sprite>
      
      {/* Outer glow layer (only visible against sky) */}
      <sprite position={moonPosition} scale={[moonSize * 1.2, moonSize * 1.2, 1]} renderOrder={1}>
        <spriteMaterial 
          map={moonTexture} 
          transparent={true} 
          opacity={0.2} 
          color="#b0c8ff"
          depthTest={true} // Enable depth testing
          depthWrite={false}
          fog={false}
        />
      </sprite>
      
      {/* Directional light from moon for casting shadows - dimmed */}
      <directionalLight
        ref={(ref) => { moonRefs.current.light = ref }}
        position={moonPosition}
        intensity={0.5}
        color="#d0e0ff"
        castShadow
        shadow-mapSize={[1024, 1024]} // Reduced for better performance
        shadow-camera-far={500}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
        shadow-bias={-0.0005}
      />
      
      {/* Subtle glow around the moon - now a child of the moon position for better culling */}
      <pointLight
        ref={(ref) => { moonRefs.current.glow = ref }}
        position={moonPosition}
        intensity={0.8}
        distance={350}
        decay={2}
        color="#d0e0ff"
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
        height={15}
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
  
  const handleIglooLoaded = () => {
    setIsIglooLoaded(true)
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
    </group>
  )
}

// Simple Aurora Borealis component
function AuroraBorealis() {
  const auroraRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });
  
  return (
      <mesh 
      ref={auroraRef}
      position={[0, 300, 0]}
      rotation={[0, 0, 0]}
      scale={[1500, 300, 1500]}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          uTime: { value: 0 },
          uIntensity: { value: 0.5 }
        }}
        vertexShader={`
          uniform float uTime;
          varying vec2 vUv;
          varying vec3 vPosition;
          
          void main() {
            vUv = uv;
            vPosition = position;
            
            vec4 modelPosition = modelMatrix * vec4(position, 1.0);
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectedPosition = projectionMatrix * viewPosition;
            
            gl_Position = projectedPosition;
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uIntensity;
          varying vec2 vUv;
          varying vec3 vPosition;
          
          void main() {
            // Calculate position-based color
            float yPos = vPosition.y + 0.5; // Normalize to 0-1 range
            
            // Create aurora bands
            float band1 = smoothstep(0.4, 0.6, yPos);
            float band2 = smoothstep(0.6, 0.8, yPos);
            
            // Create wave effect
            float wave1 = sin(vPosition.x * 5.0 + uTime * 0.2) * 0.5 + 0.5;
            float wave2 = sin(vPosition.z * 3.0 + uTime * 0.3) * 0.5 + 0.5;
            
            // Combine waves and bands
            float mask = (band1 * wave1 + band2 * wave2) * uIntensity;
            
            // Create color gradient
            vec3 color1 = vec3(0.0, 1.0, 0.6); // Teal
            vec3 color2 = vec3(0.2, 0.4, 1.0); // Blue
            vec3 color3 = vec3(0.6, 0.2, 1.0); // Purple
            
            vec3 finalColor;
            if (yPos < 0.5) {
              finalColor = mix(color1, color2, yPos * 2.0);
            } else {
              finalColor = mix(color2, color3, (yPos - 0.5) * 2.0);
            }
            
            // Apply mask and fade at edges
            float edgeFade = 1.0 - pow(abs(vUv.y - 0.5) * 2.0, 2.0);
            float alpha = mask * edgeFade;
            
            gl_FragColor = vec4(finalColor, alpha);
          }
        `}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
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
  const [isEditorMode, setLocalEditorMode] = useState(false)

  // Handle editor mode toggle
  const handleEditorModeToggle = useCallback(() => {
    const newMode = !isEditorMode
    setLocalEditorMode(newMode)
    setEditorMode(newMode, playerPosition)
    setIsEditorEnabled(newMode) // Sync collision shape editor state
  }, [isEditorMode, playerPosition, setEditorMode, setIsEditorEnabled])

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F6') {
        handleEditorModeToggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleEditorModeToggle])

  // Handle free camera mode change
  const handleFreeCameraModeChange = (enabled: boolean) => {
    onFreeCameraModeChange(enabled)
  }

  return (
    <>
      {children}
      <DevToolsButton 
        playerPosition={playerPosition}
        onSensitivityChange={onSensitivityChange}
        initialSensitivity={initialSensitivity}
        isEditorMode={isEditorMode}
        onEditorModeToggle={handleEditorModeToggle}
        onFreeCameraModeChange={handleFreeCameraModeChange}
      />
    </>
  )
}

// Main game scene component
export default function GameScene({ onLoadComplete }: GameSceneProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [dpr, setDpr] = useState(1.5) // Dynamic DPR for performance
  const [playerPosition, setPlayerPosition] = useState(new THREE.Vector3(-59.50, 0.00, 15.34))
  const [isPlayerInIgloo, setIsPlayerInIgloo] = useState(false)
  const [sensitivity, setSensitivity] = useState({
    horizontal: 2.2,
    vertical: 2.0
  })
  const [controlsPaused, setControlsPaused] = useState(false)
  const [freeCameraMode, setFreeCameraMode] = useState(false)
  
  // Use the middle click hook to toggle orbit camera
  const isOrbitActive = useMiddleClick()

  // Add keyboard shortcuts for coordinates and pausing controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Log player coordinates when 'C' key is pressed
      if (e.key === 'c' || e.key === 'C') {
        if (playerPosition) {
          console.log('Player coordinates:', {
            x: playerPosition.x.toFixed(2),
            y: playerPosition.y.toFixed(2),
            z: playerPosition.z.toFixed(2)
          });
          // Also copy to clipboard for convenience
          const coordsText = `[${playerPosition.x.toFixed(2)}, ${playerPosition.y.toFixed(2)}, ${playerPosition.z.toFixed(2)}]`;
          navigator.clipboard.writeText(coordsText)
            .then(() => console.log('Coordinates copied to clipboard:', coordsText))
            .catch(err => console.error('Could not copy coordinates:', err));
          
          // Show on-screen notification
          alert(`Coordinates: ${coordsText}\n(Also copied to clipboard)`);
        }
      }
      
      // Toggle controls pause with ESC key
      if (e.key === 'Escape') {
        setControlsPaused(prev => !prev);
        console.log(`Game controls ${!controlsPaused ? 'paused' : 'resumed'}`);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playerPosition, controlsPaused]);
  
  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      window.mouseX = e.clientX
      window.mouseY = e.clientY
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  // Handle player loaded
  const handlePlayerLoaded = () => {
    setIsLoaded(true)
    if (onLoadComplete) onLoadComplete()
  }

  // Define additional controls for the controls panel
  const additionalControls = [
    { key: 'ESC', action: 'Pause Controls' },
    { key: 'Middle Click', action: 'Orbit Camera' },
    { key: 'C', action: 'Copy Coordinates' },
    { key: 'F6', action: 'Toggle Editor Mode' }
  ]

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
  
  // Updated sensitivity handler for ControlsPanel
  const handleControlsPanelSensitivity = (value: number) => {
    // Apply the same sensitivity value to both horizontal and vertical
    handleSensitivityChange(value, value)
  }
  
  // Handle performance changes
  const handlePerformanceChange = ({ factor }: { factor: number }) => {
    // Adjust quality based on performance
    setDpr(Math.max(1, Math.min(2, 1.5 * factor)))
  }
  
  // Handle camera reset after orbit mode
  const handleOrbitReset = () => {
    // Any additional reset logic can go here
    console.log('Orbit camera reset')
  }
  
  // Configure shadow settings
  useEffect(() => {
    // Set up shadow settings when the component mounts
    if (typeof window !== 'undefined') {
      THREE.Object3D.DEFAULT_UP.set(0, 1, 0);
      THREE.ColorManagement.enabled = true;
    }
  }, []);
  
  // Handle free camera mode change
  const handleFreeCameraModeChange = (enabled: boolean) => {
    setFreeCameraMode(enabled)
    // Pause regular controls when free camera is enabled
    setControlsPaused(enabled)
  }

  return (
    <OceanSettingsProvider>
      <CollisionEditorProvider>
        <CollisionShapeProvider>
          <TestBallProvider>
            <EditorModeHandler 
              playerPosition={playerPosition}
              onSensitivityChange={handleControlsPanelSensitivity}
              initialSensitivity={sensitivity.horizontal}
              onFreeCameraModeChange={handleFreeCameraModeChange}
            >
              <Canvas 
                shadows 
                dpr={dpr}
                gl={{ 
                  antialias: true,
                  alpha: false,
                  stencil: false,
                  depth: true,
                  powerPreference: 'high-performance'
                }}
                camera={{ position: [-59.50, 0.00, 15.34], fov: 75, far: 2000 }}
                shadows-type="PCFSoftShadowMap"
              >
                <PerformanceMonitor 
                  onDecline={handlePerformanceChange} 
                  onIncline={handlePerformanceChange}
                >
                  {/* Adaptive DPR for performance */}
                  <AdaptiveDpr pixelated />
                  
                  {/* Scene lighting */}
                  <SceneLighting />
                  
                  {/* Night sky background */}
                  <color attach="background" args={['#051428']} />
                  
                  {/* Aurora Borealis effect */}
                  <AuroraBorealis />
                  
                  {/* Moon */}
                  <Moon />
                  
                  {/* Atmospheric fog - adjusted for better night sky visibility */}
                  <fog attach="fog" args={['#0a1a30', 50, 1500]} />
                  
                  {/* Physics world */}
                  <Physics gravity={[0, -9.81, 0]}>
                    {/* Enhanced Snow Ground with expanded terrain */}
                    <SnowGround />
                    
                    {/* Arctic Ocean surrounding the snow ground */}
                    <ArcticOcean 
                      useCustomSettings={true}
                      key="main-ocean"
                    />
                    
                    {/* Pine Trees - small islands with trees */}
                    <PineTree position={[-200, -0.2, -200]} scale={1.2} rotation={Math.PI * 0.2} />
                    <TallPineTree position={[250, -0.2, -150]} scale={0.9} rotation={Math.PI * 0.7} />
                    <PineTree position={[-150, -0.2, 250]} scale={1.5} rotation={Math.PI * 0.4} />
                    <TallPineTree position={[300, -0.2, 300]} scale={1.0} rotation={Math.PI * 0.9} />
                    <PineTree position={[-300, -0.2, 50]} scale={1.3} rotation={Math.PI * 0.5} />
                    <TallPineTree position={[-120, -0.2, 80]} scale={1.1} rotation={Math.PI * 0.5} />
                    <PineTree position={[100, -0.2, -180]} scale={0.8} rotation={Math.PI * 0.1} />
                    <TallPineTree position={[180, -0.2, 120]} scale={1.2} rotation={Math.PI * 0.3} />
                    <PineTree position={[-220, -0.2, -80]} scale={1.0} rotation={Math.PI * 0.8} />
                    
                    {/* Editor Grid */}
                    <CollisionEditorGrid />
                    
                    {/* Custom GLB Assets */}
                    <CustomGLBAssets />
                    
                    {/* Shape Preview */}
                    <CollisionShapePreview />
                    
                    {/* Global Snowfall effect - only visible when player is not in the igloo */}
                    {!isPlayerInIgloo && (
                      <Snowfall 
                        count={20000} 
                        size={0.12} 
                        area={2500} 
                      />
                    )}
                    
                    {/* Homebase area with igloo */}
                    <HomebaseArea />
                    
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
                        speed={20}
                        jumpHeight={5}
                        horizontalSensitivity={sensitivity.horizontal}
                        verticalSensitivity={sensitivity.vertical}
                        controlsEnabled={!controlsPaused}
                      />
                    )}
                    
                    {/* Test Ball Renderer - inside Physics component */}
                    <TestBallRenderer />
                  </Physics>
                  
                  {/* Free Camera - only active in free camera mode */}
                  {freeCameraMode && (
                    <FreeCamera enabled={true} moveSpeed={15} zoomSpeed={1.5} />
                  )}
                  
                  {/* Stars in the sky - enhanced for more vibrant twinkling */}
                  <Stars 
                    radius={500} 
                    depth={100} 
                    count={7000} 
                    factor={2} 
                    saturation={0.5} 
                    fade 
                    speed={0.3} 
                  />
                  
                  {/* Preload all assets */}
                  <Preload all />
                </PerformanceMonitor>
              </Canvas>
              
              {/* UI Elements */}
              {isLoaded && (
                <>
                  {/* Only show UI elements when not in free camera mode */}
                  {!freeCameraMode && (
                    <>
                      <div className="absolute bottom-4 left-4 right-4">
                        <WinterChat />
                      </div>
                      
                      <div className="absolute top-4 right-4">
                        <MiniMap playerPosition={playerPosition} />
                      </div>
                      
                      <ControlsPanel 
                        onSensitivityChange={handleControlsPanelSensitivity} 
                        initialSensitivity={sensitivity.horizontal}
                        additionalControls={additionalControls}
                      />
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