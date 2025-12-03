import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import { Text, Billboard, Stats } from '@react-three/drei'
import { useGameStore } from '@/lib/store'
import { Html } from '@react-three/drei'

// Frame counter for performance optimization
let frameCounter = 0;

// Preload audio elements
const audioElements = {
  startup: new Audio('/sounds/dogfight/startup.mp3'),
  shutdown: new Audio('/sounds/dogfight/shutdown.mp3'),
  wind: new Audio('/sounds/dogfight/wind.mp3')
};

audioElements.wind.loop = true;

// Memoize shared geometries and materials
const sharedGeometries = {
  capsule: new THREE.CapsuleGeometry(0.8, 7, 16, 16),
  cylinder: new THREE.CapsuleGeometry(0.4, 1.2, 12, 12),
  sphere: new THREE.SphereGeometry(0.4, 12, 12),
  box: new THREE.BoxGeometry(1, 0.1, 1.5)
};

const sharedMaterials = {
  basic: new THREE.MeshBasicMaterial({ color: "#333333" }),
  metal: new THREE.MeshStandardMaterial({ 
    color: "#303540",
    roughness: 0.4,
    metalness: 0.8
  }),
  glow: new THREE.MeshStandardMaterial({
    color: "#ff3300",
    emissive: "#ff3300",
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.8
  })
};

// Avatar component for when player is in plane
interface PlayerAvatarInPlaneProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
}

// Memoize the PlayerAvatarInPlane component
const PlayerAvatarInPlane = React.memo(({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0] 
}: PlayerAvatarInPlaneProps) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.2, 0]} scale={0.8}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <primitive object={sharedMaterials.basic} />
      </mesh>
      
      <mesh position={[0, -0.1, 0]} scale={0.8}>
        <boxGeometry args={[0.3, 0.4, 0.25]} />
        <primitive object={sharedMaterials.basic} />
      </mesh>
      
      <mesh position={[0.1, -0.2, -0.15]} rotation={[0, 0, Math.PI/3]} scale={[0.1, 0.25, 0.1]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive object={sharedMaterials.basic} />
      </mesh>
      
      <mesh position={[0.1, -0.2, 0.15]} rotation={[0, 0, Math.PI/3]} scale={[0.1, 0.25, 0.1]}>
        <boxGeometry args={[1, 1, 1]} />
        <primitive object={sharedMaterials.basic} />
      </mesh>
    </group>
  )
});

interface FighterJetProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  isPlayerJet?: boolean
  silverColor?: boolean
  customColor?: string
  onClick?: (e: ThreeEvent<MouseEvent>) => void
}

// Additional silver material for display jets
const silverMaterial = new THREE.MeshStandardMaterial({
  color: "#E0E0E0", 
  roughness: 0.1,
  metalness: 0.9,
  envMapIntensity: 1.5
});

// Performance monitoring
const DEBUG = true;
let lastFrameTime = performance.now();
let frameCount = 0;
let frameTimeSum = 0;
const FRAME_TIME_SAMPLES = 60;

// Movement tracking
let lastPosition = new THREE.Vector3();
let lastRotation = new THREE.Euler();
let movementUpdateCount = 0;

// Add detailed performance tracking
const PERFORMANCE_METRICS = {
  lastFrameTime: performance.now(),
  frameCount: 0,
  heavyFrames: 0,
  totalFrameTime: 0,
  particleUpdates: 0,
  geometryUpdates: 0
};

// Throttle values for different update types
const UPDATE_RATES = {
  MOVEMENT: 1000 / 60,  // 60fps for movement
  EFFECTS: 1000 / 30,   // 30fps for effects
  PARTICLES: 1000 / 20  // 20fps for particles
};

// Input state tracking
const inputState = {
  lastMouseUpdate: 0,
  lastKeyboardUpdate: 0,
  mousePosition: new THREE.Vector2(),
  keyboardControls: {
    throttle: 0,
    roll: 0
  }
};

// Enhanced movement logging function
const logMovement = (position: THREE.Vector3, rotation: THREE.Euler, controls: any) => {
  if (!DEBUG) return;
  
  if (movementUpdateCount % 30 === 0) {
    const positionDelta = position.distanceTo(lastPosition);
    const rotationDelta = Math.abs(rotation.x - lastRotation.x) + 
                         Math.abs(rotation.y - lastRotation.y) + 
                         Math.abs(rotation.z - lastRotation.z);
    
    const frameTime = performance.now() - PERFORMANCE_METRICS.lastFrameTime;
    PERFORMANCE_METRICS.totalFrameTime += frameTime;
    PERFORMANCE_METRICS.frameCount++;
    
    if (frameTime > 16) {
      PERFORMANCE_METRICS.heavyFrames++;
    }
    
    console.log(`[Performance Stats] Frame ${PERFORMANCE_METRICS.frameCount}:`, {
      averageFrameTime: (PERFORMANCE_METRICS.totalFrameTime / PERFORMANCE_METRICS.frameCount).toFixed(2),
      heavyFramePercentage: ((PERFORMANCE_METRICS.heavyFrames / PERFORMANCE_METRICS.frameCount) * 100).toFixed(1),
      currentFrameTime: frameTime.toFixed(2),
      movement: {
        positionDelta: positionDelta.toFixed(2),
        rotationDelta: rotationDelta.toFixed(2),
        throttle: controls.throttle.toFixed(2),
        speed: controls.speed?.toFixed(2) || 0
      },
      updates: {
        particles: PERFORMANCE_METRICS.particleUpdates,
        geometry: PERFORMANCE_METRICS.geometryUpdates
      }
    });

    lastPosition.copy(position);
    lastRotation.copy(rotation);
    PERFORMANCE_METRICS.lastFrameTime = performance.now();
  }
  movementUpdateCount++;
};

// Frame rate monitoring
const updateFrameMetrics = () => {
  if (!DEBUG) return;
  
  const currentTime = performance.now();
  const frameDuration = currentTime - lastFrameTime;
  lastFrameTime = currentTime;
  
  frameTimeSum += frameDuration;
  frameCount++;
  
  if (frameCount >= FRAME_TIME_SAMPLES) {
    const averageFrameTime = frameTimeSum / FRAME_TIME_SAMPLES;
    const fps = 1000 / averageFrameTime;
    
    if (fps < 30) {
      console.warn(`[Performance] Low frame rate detected: ${fps.toFixed(1)} FPS`);
    }
    
    frameCount = 0;
    frameTimeSum = 0;
  }
};

// Optimized movement handler
const handleMovementUpdate = (position: THREE.Vector3, rotation: THREE.Euler, controls: any) => {
  const now = performance.now();
  
  // Throttle mouse updates
  if (now - inputState.lastMouseUpdate > UPDATE_RATES.MOVEMENT) {
    rotation.x = THREE.MathUtils.lerp(rotation.x, controls.rotation.x, 0.5);
    rotation.y = THREE.MathUtils.lerp(rotation.y, controls.rotation.y, 0.5);
    inputState.lastMouseUpdate = now;
  }
  
  // Throttle keyboard updates
  if (now - inputState.lastKeyboardUpdate > UPDATE_RATES.MOVEMENT) {
    rotation.z = THREE.MathUtils.lerp(rotation.z, controls.rotation.z, 0.3);
    position.copy(controls.position);
    inputState.lastKeyboardUpdate = now;
  }
};

export function FighterJet({ 
  position = [0, 0, 0],
  rotation = [0, Math.PI / 2, 0],
  scale = 1,
  isPlayerJet = false,
  silverColor = false,
  customColor,
  onClick
}: FighterJetProps) {
  const jetRef = useRef<THREE.Group>(null)
  const rudderRef = useRef<THREE.Mesh>(null)
  const exhaustRef = useRef<THREE.PointLight>(null)
  const contrailsRef = useRef<THREE.Points>(null)
  const muzzleFlashRef = useRef<THREE.PointLight>(null)
  const gameStore = useGameStore()
  
  // Show interaction prompt when player is near
  const [showPrompt, setShowPrompt] = useState(false)
  
  // Missile instance positions
  const missilePositions = useMemo(() => {
    return [
      [0, -0.2, -2], [0, -0.2, -3],  // Left wing
      [0, -0.2, 2], [0, -0.2, 3]      // Right wing
    ];
  }, []);

  // Initialize particle systems with reduced count
  useEffect(() => {
    if (!contrailsRef.current) return
    
    // Create contrail particles - reduced count for better performance
    const particles = new Float32Array(500 * 3)
    for (let i = 0; i < 500; i++) {
      particles[i * 3] = (Math.random() - 0.5) * 0.5
      particles[i * 3 + 1] = (Math.random() - 0.5) * 0.5
      particles[i * 3 + 2] = -Math.random() * 2
    }
    
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(particles, 3))
    contrailsRef.current.geometry = geometry
  }, [])
  
  // Performance monitoring refs
  const renderCount = useRef(0);
  const lastLogTime = useRef(0);

  // Simplified useFrame for display-only jet - rotates exhaust and basic effects
  useFrame((_, delta) => {
    if (!jetRef.current) return;
    
    // Simple animation for rudder
    if (rudderRef.current) {
      rudderRef.current.rotation.y = Math.sin(performance.now() * 0.001) * 0.1;
    }
    
    // Simple engine glow animation
    if (exhaustRef.current) {
      exhaustRef.current.intensity = 1.0 + Math.sin(performance.now() * 0.005) * 0.2;
    }
    
    // Check player proximity less frequently for interaction prompt
    if (frameCounter % 10 === 0) {
      try {
        const playerState = useGameStore.getState().currentPlayer;
        if (playerState && jetRef.current) {
          const playerPos = new THREE.Vector3(
            playerState.position[0],
            playerState.position[1],
            playerState.position[2]
          );
          const distance = playerPos.distanceTo(jetRef.current.position);
          setShowPrompt(distance < 8);
        } else {
          setShowPrompt(false);
        }
      } catch (error) {
        console.error("Error checking player proximity in FighterJet:", error);
        setShowPrompt(false);
      }
    }
    
    frameCounter = (frameCounter + 1) % 60;
  });

  // Log when component updates
  useEffect(() => {
    renderCount.current++;
    
    // Only log every 5 seconds
    const currentTime = Date.now();
    if (currentTime - lastLogTime.current >= 5000) {
      console.log(`[Performance] FighterJet component rendered. Count: ${renderCount.current}`);
      lastLogTime.current = currentTime;
    }
  });

  // Create geometries and materials for instanced meshes
  const {
    missileGeometry,
    missileMaterial,
    coneGeometry,
    coneMaterial
  } = useMemo(() => ({
    missileGeometry: new THREE.CapsuleGeometry(0.1, 1, 8, 8),
    missileMaterial: new THREE.MeshStandardMaterial({ 
      color: silverColor ? "#D0D0D0" : "#444444",
      roughness: silverColor ? 0.1 : 0.4,
      metalness: silverColor ? 0.9 : 0.5
    }),
    coneGeometry: new THREE.ConeGeometry(0.1, 0.3, 8),
    coneMaterial: new THREE.MeshStandardMaterial({ 
      color: silverColor ? "#E0E0E0" : "#333333",
      roughness: silverColor ? 0.1 : 0.4,
      metalness: silverColor ? 0.9 : 0.5
    })
  }), [silverColor]);

  // Create matrix for missile positioning
  const missileMatrices = useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    missilePositions.forEach(([x, y, z]) => {
      const matrix = new THREE.Matrix4();
      matrix.setPosition(x, y, z);
      matrices.push(matrix);
    });
    return matrices;
  }, [missilePositions]);

  // Update missile instance matrices
  useEffect(() => {
    const missileInstanceMesh = jetRef.current?.getObjectByName('missileInstances') as THREE.InstancedMesh;
    const coneInstanceMesh = jetRef.current?.getObjectByName('coneInstances') as THREE.InstancedMesh;
    
    if (missileInstanceMesh && coneInstanceMesh) {
      missileMatrices.forEach((matrix, i) => {
        missileInstanceMesh.setMatrixAt(i, matrix);
        coneInstanceMesh.setMatrixAt(i, matrix);
      });
      
      missileInstanceMesh.instanceMatrix.needsUpdate = true;
      coneInstanceMesh.instanceMatrix.needsUpdate = true;
    }
  }, [missileMatrices]);

  // Machine gun effect when firing
  const createMuzzleFlash = () => {
    if (muzzleFlashRef.current) {
      muzzleFlashRef.current.intensity = 2;
      setTimeout(() => {
        if (muzzleFlashRef.current) {
          muzzleFlashRef.current.intensity = 0;
        }
      }, 100);
    }
  };

  // Handle weapons firing - for display jets, this is just visual effects
  const handleFireWeapons = () => {
    createMuzzleFlash();
    
    // Play weapon sound effect
    const audio = new Audio('/sounds/aircraft/machine-gun.mp3');
    audio.volume = 0.4;
    audio.play();
  };

  // Memoized components
  const InteractionPrompt = useMemo(() => (
    <Billboard position={[0, 2, 0]}>
      <Text 
        color="white"
        fontSize={0.5}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        Press F to interact
      </Text>
    </Billboard>
  ), []);

  const HudText = useMemo(() => (
    <>
      {/* Remove all HUD elements since we're not using flight controls anymore */}
    </>
  ), []);

  // Create custom material for jet body if custom color provided
  const customJetMaterial = useMemo(() => {
    if (!customColor) return null;
    
    return new THREE.MeshStandardMaterial({
      color: customColor,
      roughness: 0.3,
      metalness: 0.7,
      envMapIntensity: 1.2
    });
  }, [customColor]);

  return (
    <>
      {DEBUG && <Stats />}
      <group 
        ref={jetRef} 
        position={position} 
        rotation={rotation} 
        scale={scale}
        onClick={onClick}
        onPointerOver={() => isPlayerJet && setShowPrompt(true)}
        onPointerOut={() => setShowPrompt(false)}
      >
        {/* Invisible larger hitbox for better click detection in aiming mode */}
        <mesh visible={false} scale={[3, 3, 3]}>
          <boxGeometry args={[5, 5, 10]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        
        {/* Main body - horizontally aligned fuselage */}
        <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.8, 7, 16, 16]} /> {/* Reduced geometry */}
          {customJetMaterial ? (
            <primitive object={customJetMaterial} />
          ) : silverColor ? (
            <meshStandardMaterial 
              color={silverColor ? "#E0E0E0" : "#303540"} 
              roughness={silverColor ? 0.1 : 0.4} 
              metalness={silverColor ? 0.9 : 0.8} 
              envMapIntensity={silverColor ? 1.5 : 1}
            />
          ) : (
            <primitive object={sharedMaterials.metal} />
          )}
        </mesh>
        
        {/* Nose cone - attached to front of fuselage */}
        <group position={[-4.5, 1, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.8, 2, 16]} /> {/* Reduced geometry */}
            {customJetMaterial ? (
              <primitive object={customJetMaterial} />
            ) : silverColor ? (
              <meshStandardMaterial 
                color={silverColor ? "#E0E0E0" : "#303540"} 
                roughness={silverColor ? 0.1 : 0.4} 
                metalness={silverColor ? 0.9 : 0.8}
                envMapIntensity={silverColor ? 1.5 : 1}
              />
            ) : (
              <meshStandardMaterial 
                color={silverColor ? "#E0E0E0" : "#303540"} 
                roughness={silverColor ? 0.1 : 0.4} 
                metalness={silverColor ? 0.9 : 0.8}
                envMapIntensity={silverColor ? 1.5 : 1}
              />
            )}
          </mesh>
          
          {/* Radar dome */}
          <mesh position={[1, 0, 0]}>
            <sphereGeometry args={[0.4, 12, 12]} /> {/* Reduced geometry */}
            <meshBasicMaterial color={silverColor ? "#D0D0D0" : "#222222"} /> {/* Simplified material */}
          </mesh>
        </group>
        
        {/* Racing stripe - color stripe along fuselage */}
        <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.01, 0.2, 1.01]}>
          <capsuleGeometry args={[0.8, 7, 16, 16]} />
          <meshStandardMaterial 
            color={silverColor ? "#C0C0C0" : "#bf0000"} 
            emissive={silverColor ? "#A0A0A0" : "#500000"}
            emissiveIntensity={0.2}
            roughness={silverColor ? 0.2 : 0.3}
            metalness={silverColor ? 0.8 : 0.5}
          />
        </mesh>
        
        {/* Additional Stripe - dark middle section */}
        <mesh position={[0, 1, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1.005, 0.6, 1.005]}>
          <capsuleGeometry args={[0.8, 6, 16, 16]} /> {/* Reduced geometry */}
          <meshBasicMaterial 
            color={silverColor ? "#B0B0B0" : "#202020"} 
            transparent
            opacity={0.9}
          />
        </mesh>
        
        {/* Air intakes */}
        <group position={[0, 1, 0]}>
          {/* Left intake */}
          <group position={[1, 0.3, -0.8]}>
            <mesh rotation={[0, Math.PI/4, Math.PI/2]}>
              <cylinderGeometry args={[0.3, 0.2, 0.8, 16]} />
              {customJetMaterial ? (
                <primitive object={customJetMaterial} />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#C0C0C0" : "#1a1a1a"} 
                  roughness={silverColor ? 0.1 : 0.4} 
                  metalness={silverColor ? 0.9 : 0.7}
                />
              ) : (
                <meshStandardMaterial 
                  color={silverColor ? "#C0C0C0" : "#1a1a1a"} 
                  roughness={silverColor ? 0.1 : 0.4} 
                  metalness={silverColor ? 0.9 : 0.7}
                />
              )}
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[0, Math.PI/4, Math.PI/2]}>
              <ringGeometry args={[0.15, 0.2, 16]} />
              {customJetMaterial ? (
                <primitive object={customJetMaterial} />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#A0A0A0" : "#0a0a0a"} 
                  roughness={silverColor ? 0.1 : 0.2} 
                  metalness={silverColor ? 0.9 : 0.9}
                />
              ) : (
                <meshStandardMaterial 
                  color={silverColor ? "#A0A0A0" : "#0a0a0a"} 
                  roughness={silverColor ? 0.1 : 0.2} 
                  metalness={silverColor ? 0.9 : 0.9}
                />
              )}
            </mesh>
          </group>
          
          {/* Right intake */}
          <group position={[1, 0.3, 0.8]}>
            <mesh rotation={[0, -Math.PI/4, Math.PI/2]}>
              <cylinderGeometry args={[0.3, 0.2, 0.8, 16]} />
              {customJetMaterial ? (
                <primitive object={customJetMaterial} />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#C0C0C0" : "#1a1a1a"} 
                  roughness={silverColor ? 0.1 : 0.4} 
                  metalness={silverColor ? 0.9 : 0.7}
                />
              ) : (
                <meshStandardMaterial 
                  color={silverColor ? "#C0C0C0" : "#1a1a1a"} 
                  roughness={silverColor ? 0.1 : 0.4} 
                  metalness={silverColor ? 0.9 : 0.7}
                />
              )}
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[0, -Math.PI/4, Math.PI/2]}>
              <ringGeometry args={[0.15, 0.2, 16]} />
              {customJetMaterial ? (
                <primitive object={customJetMaterial} />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#A0A0A0" : "#0a0a0a"} 
                  roughness={silverColor ? 0.1 : 0.2} 
                  metalness={silverColor ? 0.9 : 0.9}
                />
              ) : (
                <meshStandardMaterial 
                  color={silverColor ? "#A0A0A0" : "#0a0a0a"} 
                  roughness={silverColor ? 0.1 : 0.2} 
                  metalness={silverColor ? 0.9 : 0.9}
                />
              )}
            </mesh>
          </group>
          
          {/* Surface details */}
          {/* Anti-collision light on top */}
          <mesh position={[1.5, 0.9, 0]}>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial 
              color="#ff0000" 
              emissive="#ff0000"
              emissiveIntensity={0.5}
            />
          </mesh>
          
          {/* Antenna */}
          <mesh position={[1, 0.9, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
            <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
        
        {/* Wings with weapons - using instanced meshes */}
        <group position={[0, 1, 0]}>
          {/* Left wing */}
          <group position={[0, 0, -0.8]}>
            {/* Main wing surface - swept back design */}
            <mesh>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={4}
                  array={new Float32Array([
                    -2, 0, 0,    // front inner point
                    2, 0, -4,    // rear outer point
                    2, 0, 0,     // rear inner point
                    -2, 0, -2    // front outer point
                  ])}
                  itemSize={3}
                />
                <bufferAttribute
                  attach="index"
                  array={new Uint16Array([0, 1, 2, 0, 3, 1])}
                  count={6}
                  itemSize={1}
                />
              </bufferGeometry>
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#303540"} 
                  roughness={0.1} 
                  metalness={0.8} 
                  side={THREE.DoubleSide} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#E0E0E0" : "#303540"} 
                  roughness={silverColor ? 0.1 : 0.4} 
                  metalness={silverColor ? 0.9 : 0.8} 
                  side={THREE.DoubleSide} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#303540" 
                  roughness={0.4} 
                  metalness={0.8} 
                  side={THREE.DoubleSide} 
                />
              )}
            </mesh>
            
            {/* Wing edge detail */}
            <mesh position={[0, 0.05, 0]}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={4}
                  array={new Float32Array([
                    -2, 0, 0,    // front inner point
                    2, 0, -4,    // rear outer point
                    2, 0, 0,     // rear inner point
                    -2, 0, -2    // front outer point
                  ])}
                  itemSize={3}
                />
                <bufferAttribute
                  attach="index"
                  array={new Uint16Array([0, 1, 2, 0, 3, 1])}
                  count={6}
                  itemSize={1}
                />
              </bufferGeometry>
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#202020"} 
                  roughness={0.2} 
                  metalness={0.8} 
                  side={THREE.DoubleSide} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#C0C0C0" : "#202020"} 
                  roughness={silverColor ? 0.2 : 0.5} 
                  metalness={silverColor ? 0.8 : 0.6} 
                  side={THREE.DoubleSide} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#202020" 
                  roughness={0.5} 
                  metalness={0.6} 
                  side={THREE.DoubleSide} 
                />
              )}
            </mesh>
            
            {/* Aileron/flap */}
            <mesh position={[1, 0.02, -2]}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={4}
                  array={new Float32Array([
                    0, 0, 0,      // front inner
                    1, 0, -2,     // rear outer
                    1, 0, 0,      // rear inner
                    0, 0, -2      // front outer
                  ])}
                  itemSize={3}
                />
                <bufferAttribute
                  attach="index"
                  array={new Uint16Array([0, 1, 2, 0, 3, 1])}
                  count={6}
                  itemSize={1}
                />
              </bufferGeometry>
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#252525"} 
                  roughness={0.2} 
                  metalness={0.6} 
                  side={THREE.DoubleSide}
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#D5D5D5" : "#252525"} 
                  roughness={silverColor ? 0.2 : 0.5} 
                  metalness={silverColor ? 0.8 : 0.6} 
                  side={THREE.DoubleSide}
                />
              ) : (
                <meshStandardMaterial 
                  color="#252525" 
                  roughness={0.5} 
                  metalness={0.6} 
                  side={THREE.DoubleSide}
                />
              )}
            </mesh>
            
            {/* Wingtip light */}
            <group position={[1, 0, -3.5]}>
              <mesh>
                <boxGeometry args={[0.4, 0.2, 0.2]} />
                {customJetMaterial ? (
                  <meshStandardMaterial 
                    color={customColor ? customColor : "#333333"} 
                    roughness={0.1} 
                    metalness={0.8}
                  />
                ) : silverColor ? (
                  <meshStandardMaterial 
                    color={silverColor ? "#C0C0C0" : "#333333"} 
                    roughness={silverColor ? 0.1 : 0.4} 
                    metalness={silverColor ? 0.9 : 0.8}
                  />
                ) : (
                  <meshStandardMaterial 
                    color="#333333" 
                    roughness={0.4} 
                    metalness={0.8}
                  />
                )}
              </mesh>
              <pointLight position={[0, 0, -0.1]} intensity={0.3} distance={5} color="#ff0000" />
              <mesh position={[0, 0, -0.1]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
              </mesh>
            </group>
            
            {/* Machine guns */}
            <group position={[-1.8, 0, -0.3]}>
              <mesh rotation={[0, 0, Math.PI/2]}>
                <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
                {customJetMaterial ? (
                  <meshStandardMaterial 
                    color={customColor ? customColor : "#111111"} 
                    roughness={0.1} 
                    metalness={0.9}
                  />
                ) : silverColor ? (
                  <meshStandardMaterial 
                    color={silverColor ? "#B0B0B0" : "#111111"} 
                    roughness={silverColor ? 0.1 : 0.2} 
                    metalness={silverColor ? 0.9 : 0.9}
                  />
                ) : (
                  <meshStandardMaterial 
                    color="#111111" 
                    roughness={0.2} 
                    metalness={0.9}
                  />
                )}
              </mesh>
              <pointLight 
                ref={muzzleFlashRef} 
                position={[-0.4, 0, 0]} 
                intensity={0} 
                distance={2} 
                color="#ff9933" 
              />
            </group>
            
            {/* Missiles using instanced mesh */}
            <instancedMesh 
              name="missileInstances"
              geometry={missileGeometry}
              material={missileMaterial}
              count={missilePositions.length}
            />
            <instancedMesh 
              name="coneInstances"
              geometry={coneGeometry}
              material={coneMaterial}
              count={missilePositions.length}
            />
          </group>
          
          {/* Right wing - mirrored version */}
          <group position={[0, 0, 0.8]}>
            {/* Main wing surface - swept back design */}
            <mesh>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={4}
                  array={new Float32Array([
                    -2, 0, 0,    // front inner point
                    2, 0, 4,     // rear outer point
                    2, 0, 0,     // rear inner point
                    -2, 0, 2     // front outer point
                  ])}
                  itemSize={3}
                />
                <bufferAttribute
                  attach="index"
                  array={new Uint16Array([0, 2, 1, 0, 1, 3])}
                  count={6}
                  itemSize={1}
                />
              </bufferGeometry>
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#303540"} 
                  roughness={0.1} 
                  metalness={0.8} 
                  side={THREE.DoubleSide} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#E0E0E0" : "#303540"} 
                  roughness={silverColor ? 0.1 : 0.4} 
                  metalness={silverColor ? 0.9 : 0.8} 
                  side={THREE.DoubleSide} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#303540" 
                  roughness={0.4} 
                  metalness={0.8} 
                  side={THREE.DoubleSide} 
                />
              )}
            </mesh>
            
            {/* Wing edge detail */}
            <mesh position={[0, 0.05, 0]}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={4}
                  array={new Float32Array([
                    -2, 0, 0,    // front inner point
                    2, 0, 4,     // rear outer point
                    2, 0, 0,     // rear inner point
                    -2, 0, 2     // front outer point
                  ])}
                  itemSize={3}
                />
                <bufferAttribute
                  attach="index"
                  array={new Uint16Array([0, 2, 1, 0, 1, 3])}
                  count={6}
                  itemSize={1}
                />
              </bufferGeometry>
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#202020"} 
                  roughness={0.2} 
                  metalness={0.8} 
                  side={THREE.DoubleSide} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#C0C0C0" : "#202020"} 
                  roughness={silverColor ? 0.2 : 0.5} 
                  metalness={silverColor ? 0.8 : 0.6} 
                  side={THREE.DoubleSide} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#202020" 
                  roughness={0.5} 
                  metalness={0.6} 
                  side={THREE.DoubleSide} 
                />
              )}
            </mesh>
            
            {/* Aileron/flap */}
            <mesh position={[1, 0.02, 0]}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={4}
                  array={new Float32Array([
                    0, 0, 0,      // front inner
                    1, 0, 2,     // rear outer
                    1, 0, 0,      // rear inner
                    0, 0, 2      // front outer
                  ])}
                  itemSize={3}
                />
                <bufferAttribute
                  attach="index"
                  array={new Uint16Array([0, 2, 1, 0, 1, 3])}
                  count={6}
                  itemSize={1}
                />
              </bufferGeometry>
              {customJetMaterial ? (
                <meshStandardMaterial color="#252525" roughness={0.5} metalness={0.6} side={THREE.DoubleSide} />
              ) : silverColor ? (
                <meshStandardMaterial color="#252525" roughness={0.5} metalness={0.6} side={THREE.DoubleSide} />
              ) : (
                <meshStandardMaterial color="#252525" roughness={0.5} metalness={0.6} side={THREE.DoubleSide} />
              )}
            </mesh>
            
            {/* Wingtip light */}
            <group position={[1, 0, 3.5]}>
              <mesh>
                <boxGeometry args={[0.4, 0.2, 0.2]} />
                {customJetMaterial ? (
                  <meshStandardMaterial 
                    color={customColor ? customColor : "#333333"} 
                    roughness={0.4} 
                    metalness={0.8}
                  />
                ) : silverColor ? (
                  <meshStandardMaterial 
                    color={silverColor ? "#333333" : "#333333"} 
                    roughness={0.4} 
                    metalness={0.8}
                  />
                ) : (
                  <meshStandardMaterial 
                    color="#333333" 
                    roughness={0.4} 
                    metalness={0.8}
                  />
                )}
              </mesh>
              <pointLight position={[0, 0, 0.1]} intensity={0.3} distance={5} color="#00ff00" />
              <mesh position={[0, 0, 0.1]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} />
              </mesh>
            </group>
            
            {/* Machine guns */}
            <group position={[-1.8, 0, 0.3]}>
              <mesh rotation={[0, 0, Math.PI/2]}>
                <cylinderGeometry args={[0.05, 0.05, 0.8, 8]} />
                {customJetMaterial ? (
                  <meshStandardMaterial 
                    color={customColor ? customColor : "#111111"} 
                    roughness={0.1} 
                    metalness={0.9}
                  />
                ) : silverColor ? (
                  <meshStandardMaterial 
                    color={silverColor ? "#B0B0B0" : "#111111"} 
                    roughness={silverColor ? 0.1 : 0.2} 
                    metalness={silverColor ? 0.9 : 0.9}
                  />
                ) : (
                  <meshStandardMaterial 
                    color="#111111" 
                    roughness={0.2} 
                    metalness={0.9}
                  />
                )}
              </mesh>
              <pointLight 
                position={[-0.4, 0, 0]} 
                intensity={0} 
                distance={2} 
                color="#ff9933" 
              />
            </group>
            
            {/* Missiles using instanced mesh */}
            <instancedMesh 
              name="missileInstances"
              geometry={missileGeometry}
              material={missileMaterial}
              count={missilePositions.length}
            />
            <instancedMesh 
              name="coneInstances"
              geometry={coneGeometry}
              material={coneMaterial}
              count={missilePositions.length}
            />
          </group>
          
          {/* Horizontal stabilizers */}
          <group position={[3.5, 0.5, 0]}>
            {/* Left horizontal stabilizer */}
            <mesh position={[0, 0, -1.5]} rotation={[0, 0, 0]}>
              <boxGeometry args={[1, 0.1, 1.5]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#303540"} 
                  roughness={0.1} 
                  metalness={0.6} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#E0E0E0" : "#303540"} 
                  roughness={silverColor ? 0.1 : 0.5} 
                  metalness={silverColor ? 0.9 : 0.6} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#303540" 
                  roughness={0.4} 
                  metalness={0.8} 
                />
              )}
            </mesh>
            {/* Right horizontal stabilizer */}
            <mesh position={[0, 0, 1.5]} rotation={[0, 0, 0]}>
              <boxGeometry args={[1, 0.1, 1.5]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#303540"} 
                  roughness={0.1} 
                  metalness={0.6} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#E0E0E0" : "#303540"} 
                  roughness={silverColor ? 0.1 : 0.5} 
                  metalness={silverColor ? 0.9 : 0.6} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#303540" 
                  roughness={0.4} 
                  metalness={0.8} 
                />
              )}
            </mesh>
          </group>
          
          {/* Winglets - vertical tips */}
          <mesh position={[1, 0.2, -3.8]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.8, 0.6, 0.1]} />
            {customJetMaterial ? (
              <meshStandardMaterial 
                color={customColor ? customColor : "#3a3a3a"} 
                roughness={0.5} 
                metalness={0.6} 
              />
            ) : silverColor ? (
              <meshStandardMaterial 
                color={silverColor ? "#3a3a3a" : "#3a3a3a"} 
                roughness={0.5} 
                metalness={0.6} 
              />
            ) : (
              <meshStandardMaterial 
                color="#3a3a3a" 
                roughness={0.5} 
                metalness={0.6} 
              />
            )}
          </mesh>
          
          <mesh position={[1, 0.2, 3.8]} rotation={[0, 0, 0]}>
            <boxGeometry args={[0.8, 0.6, 0.1]} />
            {customJetMaterial ? (
              <meshStandardMaterial 
                color={customColor ? customColor : "#3a3a3a"} 
                roughness={0.5} 
                metalness={0.6} 
              />
            ) : silverColor ? (
              <meshStandardMaterial 
                color={silverColor ? "#3a3a3a" : "#3a3a3a"} 
                roughness={0.5} 
                metalness={0.6} 
              />
            ) : (
              <meshStandardMaterial 
                color="#3a3a3a" 
                roughness={0.5} 
                metalness={0.6} 
              />
            )}
          </mesh>
        </group>
        
        {/* Landing gear */}
        <group position={[0, 0, 0]}>
          {/* Nose gear */}
          <group position={[-3, 0.5, 0]}>
            <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 1, 8]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#444444"} 
                  roughness={0.4} 
                  metalness={0.8} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#444444" : "#444444"} 
                  roughness={0.4} 
                  metalness={0.8} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#444444" 
                  roughness={0.4} 
                  metalness={0.8} 
                />
              )}
            </mesh>
            <mesh position={[0, -0.5, 0]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.1, 16]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#222222"} 
                  roughness={0.4} 
                  metalness={0.7} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#222222" : "#222222"} 
                  roughness={0.4} 
                  metalness={0.7} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#222222" 
                  roughness={0.4} 
                  metalness={0.7} 
                />
              )}
            </mesh>
          </group>
          
          {/* Left main gear */}
          <group position={[0.5, 0.2, -1.5]}>
            <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#444444"} 
                  roughness={0.4} 
                  metalness={0.8} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#444444" : "#444444"} 
                  roughness={0.4} 
                  metalness={0.8} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#444444" 
                  roughness={0.4} 
                  metalness={0.8} 
                />
              )}
            </mesh>
            <mesh position={[0, -0.4, 0]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.25, 0.25, 0.15, 16]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#222222"} 
                  roughness={0.4} 
                  metalness={0.7} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#222222" : "#222222"} 
                  roughness={0.4} 
                  metalness={0.7} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#222222" 
                  roughness={0.4} 
                  metalness={0.7} 
                />
              )}
            </mesh>
          </group>
          
          {/* Right main gear */}
          <group position={[0.5, 0.2, 1.5]}>
            <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.8, 8]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#444444"} 
                  roughness={0.4} 
                  metalness={0.8} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#444444" : "#444444"} 
                  roughness={0.4} 
                  metalness={0.8} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#444444" 
                  roughness={0.4} 
                  metalness={0.8} 
                />
              )}
            </mesh>
            <mesh position={[0, -0.4, 0]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.25, 0.25, 0.15, 16]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#222222"} 
                  roughness={0.4} 
                  metalness={0.7} 
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#222222" : "#222222"} 
                  roughness={0.4} 
                  metalness={0.7} 
                />
              ) : (
                <meshStandardMaterial 
                  color="#222222" 
                  roughness={0.4} 
                  metalness={0.7} 
                />
              )}
            </mesh>
          </group>
        </group>
        
        {/* Tail - vertical stabilizer */}
        <group position={[3.5, 2, 0]}>
          <mesh ref={rudderRef} rotation={[0, 0, 0]}>
            <boxGeometry args={[1, 1.5, 0.1]} />
            {customJetMaterial ? (
              <meshStandardMaterial 
                color={customColor ? customColor : "#3a3a3a"} 
                roughness={0.1} 
                metalness={0.6} 
              />
            ) : silverColor ? (
              <meshStandardMaterial 
                color={silverColor ? "#E0E0E0" : "#3a3a3a"} 
                roughness={silverColor ? 0.1 : 0.5} 
                metalness={silverColor ? 0.9 : 0.6} 
              />
            ) : (
              <meshStandardMaterial 
                color="#3a3a3a" 
                roughness={0.5} 
                metalness={0.6} 
              />
            )}
          </mesh>
        </group>
        
        {/* Engines - positioned at rear of aircraft */}
        <group position={[3.5, 1, 0]}>
          {/* Left engine */}
          <group position={[0, 0, -0.9]}>
            <mesh rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.4, 0.4, 1.2, 12]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#BEBEBE"} 
                  roughness={0.1} 
                  metalness={0.7}
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#BEBEBE" : "#333333"} 
                  roughness={silverColor ? 0.1 : 0.4} 
                  metalness={silverColor ? 0.9 : 0.7}
                />
              ) : (
                <meshStandardMaterial 
                  color="#333333" 
                  roughness={0.4} 
                  metalness={0.8}
                />
              )}
            </mesh>
            
            {/* Engine interior */}
            <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.3, 0.3, 0.1, 12]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? "#ff3300" : "#ff3300"} 
                  emissive={customColor ? "#ff3300" : "#ff3300"} 
                  emissiveIntensity={1.5} 
                  toneMapped={false}
                  roughness={0.2}
                  metalness={0.8}
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#ff3300" : "#ff3300"} 
                  emissive={silverColor ? "#ff3300" : "#ff3300"} 
                  emissiveIntensity={silverColor ? 1.5 : 1.5} 
                  toneMapped={false}
                  roughness={0.2}
                  metalness={0.8}
                />
              ) : (
                <meshStandardMaterial 
                  color="#ff3300" 
                  emissive="#ff3300" 
                  emissiveIntensity={1.5} 
                  toneMapped={false}
                  roughness={0.2}
                  metalness={0.8}
                />
              )}
            </mesh>
            
            {/* Afterburner rings */}
            <mesh position={[0.61, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
              <torusGeometry args={[0.35, 0.05, 12, 12]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? "#ff4400" : "#ff4400"} 
                  emissive={customColor ? "#ff4400" : "#ff4400"} 
                  emissiveIntensity={1}
                  roughness={0.2}
                  metalness={0.8}
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#ff4400" : "#ff4400"} 
                  emissive={silverColor ? "#ff4400" : "#ff4400"} 
                  emissiveIntensity={silverColor ? 1 : 1}
                  roughness={0.2}
                  metalness={0.8}
                />
              ) : (
                <meshStandardMaterial 
                  color="#ff4400" 
                  emissive="#ff4400" 
                  emissiveIntensity={1}
                  roughness={0.2}
                  metalness={0.8}
                />
              )}
            </mesh>
            
            {/* Add back engine glow light */}
            <pointLight 
              position={[0.7, 0, 0]} 
              intensity={1.0} 
              distance={3} 
              decay={2}
              color="#ff6a00" 
            />
          </group>
          
          {/* Right engine */}
          <group position={[0, 0, 0.9]}>
            <mesh rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.4, 0.4, 1.2, 12]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? customColor : "#BEBEBE"} 
                  roughness={0.1} 
                  metalness={0.7}
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#BEBEBE" : "#333333"} 
                  roughness={silverColor ? 0.1 : 0.4} 
                  metalness={silverColor ? 0.9 : 0.7}
                />
              ) : (
                <meshStandardMaterial 
                  color="#333333" 
                  roughness={0.4} 
                  metalness={0.8}
                />
              )}
            </mesh>
            
            {/* Right engine interior */}
            <mesh position={[0.6, 0, 0]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.3, 0.3, 0.1, 12]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? "#ff3300" : "#ff3300"} 
                  emissive={customColor ? "#ff3300" : "#ff3300"} 
                  emissiveIntensity={1.5} 
                  toneMapped={false}
                  roughness={0.2}
                  metalness={0.8}
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#ff3300" : "#ff3300"} 
                  emissive={silverColor ? "#ff3300" : "#ff3300"} 
                  emissiveIntensity={silverColor ? 1.5 : 1.5} 
                  toneMapped={false}
                  roughness={0.2}
                  metalness={0.8}
                />
              ) : (
                <meshStandardMaterial 
                  color="#ff3300" 
                  emissive="#ff3300" 
                  emissiveIntensity={1.5} 
                  toneMapped={false}
                  roughness={0.2}
                  metalness={0.8}
                />
              )}
            </mesh>
            
            {/* Right engine afterburner rings */}
            <mesh position={[0.61, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
              <torusGeometry args={[0.35, 0.05, 12, 12]} />
              {customJetMaterial ? (
                <meshStandardMaterial 
                  color={customColor ? "#ff4400" : "#ff4400"} 
                  emissive={customColor ? "#ff4400" : "#ff4400"} 
                  emissiveIntensity={1}
                  roughness={0.2}
                  metalness={0.8}
                />
              ) : silverColor ? (
                <meshStandardMaterial 
                  color={silverColor ? "#ff4400" : "#ff4400"} 
                  emissive={silverColor ? "#ff4400" : "#ff4400"} 
                  emissiveIntensity={silverColor ? 1 : 1}
                  roughness={0.2}
                  metalness={0.8}
                />
              ) : (
                <meshStandardMaterial 
                  color="#ff4400" 
                  emissive="#ff4400" 
                  emissiveIntensity={1}
                  roughness={0.2}
                  metalness={0.8}
                />
              )}
            </mesh>
            
            {/* Add back engine glow light for right engine */}
            <pointLight 
              position={[0.7, 0, 0]} 
              intensity={1.0} 
              distance={3} 
              decay={2}
              color="#ff6a00" 
            />
          </group>
        </group>
        
        {/* Cockpit - on top of fuselage */}
        <group position={[-2, 1.8, 0]}>
          {/* Main canopy */}
          <mesh rotation={[Math.PI, 0, Math.PI/2 * 1.0]}>
            <capsuleGeometry args={[0.4, 1.2, 24, 24]} />
            <meshPhysicalMaterial 
              color="#4d7c9e" 
              transparent 
              opacity={0.4} 
              metalness={1}
              roughness={0.1}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={2}
              transmission={0.6}
            />
          </mesh>
          
          {/* Canopy frame - simplified to avoid issues */}
          <mesh rotation={[Math.PI, 0, Math.PI/2 * 1.0]} scale={[1.01, 1.01, 1.01]}>
            <capsuleGeometry args={[0.4, 1.2, 12, 8]} />
            <meshStandardMaterial 
              color="#444444" 
              roughness={0.4}
              metalness={0.8}
            />
          </mesh>
          
          {/* HUD display */}
          <mesh position={[-0.2, -0.3, 0]} rotation={[Math.PI, 0, -Math.PI/3]}>
            <planeGeometry args={[0.4, 0.3]} />
            <meshStandardMaterial 
              color="#00ff00" 
              emissive="#00ff00" 
              emissiveIntensity={0.4}
              transparent 
              opacity={0.3}
            />
          </mesh>
          
          {/* Control stick */}
          <mesh position={[-0.2, 0.4, 0]} rotation={[-Math.PI/12, 0, Math.PI]}>
            <cylinderGeometry args={[0.03, 0.03, 0.3, 8]} />
            <meshStandardMaterial color="#222222" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[-0.2, 0.25, 0]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color="#cc0000" roughness={0.4} />
          </mesh>
        </group>
        
        {/* Aircraft markings and insignia - colored to avoid white elements */}
        <group position={[0, 1, 0]}>
          {/* Squadron insignia on fuselage */}
          <mesh position={[-1, 0.5, 0.81]} rotation={[0, Math.PI/2, 0]}>
            <planeGeometry args={[1, 1]} />
            {customJetMaterial ? (
              <meshStandardMaterial 
                color={customColor ? customColor : "#222222"} 
                roughness={0.1}
                metalness={0.8}
                transparent 
                opacity={0.9}
              />
            ) : silverColor ? (
              <meshStandardMaterial 
                color={silverColor ? "#E0E0E0" : "#222222"} 
                roughness={silverColor ? 0.1 : 0.4}
                metalness={silverColor ? 0.9 : 0.5}
                transparent 
                opacity={silverColor ? 0.9 : 0.9}
              />
            ) : (
              <meshStandardMaterial 
                color="#222222" 
                roughness={0.1}
                metalness={0.8}
                transparent 
                opacity={0.9}
              />
            )}
          </mesh>
          
          {/* Roundel on left wing */}
          <mesh position={[0, 0.07, -1.5]} rotation={[-Math.PI/2, 0, 0]}>
            <circleGeometry args={[0.4, 32]} />
            {customJetMaterial ? (
              <meshStandardMaterial 
                color={customColor ? customColor : "#0077cc"} 
                roughness={0.1}
                metalness={0.8}
              />
            ) : silverColor ? (
              <meshStandardMaterial 
                color={silverColor ? "#E0E0E0" : "#0077cc"} 
                roughness={silverColor ? 0.1 : 0.4}
                metalness={silverColor ? 0.9 : 0.5}
              />
            ) : (
              <meshStandardMaterial 
                color="#0077cc" 
                roughness={0.1}
                metalness={0.8}
              />
            )}
          </mesh>
          
          {/* Roundel on right wing */}
          <mesh position={[0, 0.07, 1.5]} rotation={[-Math.PI/2, 0, 0]}>
            <circleGeometry args={[0.4, 32]} />
            {customJetMaterial ? (
              <meshStandardMaterial 
                color={customColor ? customColor : "#0077cc"} 
                roughness={0.1}
                metalness={0.8}
              />
            ) : silverColor ? (
              <meshStandardMaterial 
                color={silverColor ? "#E0E0E0" : "#0077cc"} 
                roughness={silverColor ? 0.1 : 0.4}
                metalness={silverColor ? 0.9 : 0.5}
              />
            ) : (
              <meshStandardMaterial 
                color="#0077cc" 
                roughness={0.1}
                metalness={0.8}
              />
            )}
          </mesh>
          
          {/* Tail number - dark background */}
          <mesh position={[3.5, 1, 0.4]} rotation={[0, Math.PI/2, 0]}>
            <planeGeometry args={[0.8, 0.4]} />
            {customJetMaterial ? (
              <meshStandardMaterial 
                color={customColor ? customColor : "#222222"} 
                roughness={0.1}
                metalness={0.8}
                transparent 
                opacity={0.9}
              />
            ) : silverColor ? (
              <meshStandardMaterial 
                color={silverColor ? "#E0E0E0" : "#222222"} 
                roughness={silverColor ? 0.1 : 0.4}
                metalness={silverColor ? 0.9 : 0.5}
                transparent 
                opacity={silverColor ? 0.9 : 0.9}
              />
            ) : (
              <meshStandardMaterial 
                color="#222222" 
                roughness={0.1}
                metalness={0.8}
                transparent 
                opacity={0.9}
              />
            )}
          </mesh>
        </group>
      </group>
      
      {/* HUD and prompts - only show for player jets */}
      {isPlayerJet && HudText}
      {isPlayerJet && showPrompt && InteractionPrompt}
    </>
  )
} 