'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard } from '@react-three/drei'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { FighterJet } from './fighter-jet'
import { useGameStore } from '@/lib/store'

interface AirportProps {
  position?: [number, number, number]
  rotation?: number
  scale?: number
  playerOwnsJet?: boolean
}

// Distance at which player can interact with the jet
const INTERACTION_DISTANCE = 15

// Shared geometries and materials
const {
  lightGeometry,
  lightMaterial,
  redLightMaterial,
  dashedLineGeometry,
  dashedLineMaterial,
  windowGeometry,
  windowMaterial,
  poleMaterial,
  poleGeometry,
  lightHousingGeometry,
  lightHousingMaterial
} = {
  lightGeometry: new THREE.SphereGeometry(0.15, 16, 16),
  lightMaterial: new THREE.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#ffffff",
    emissiveIntensity: 1,
    toneMapped: false
  }),
  redLightMaterial: new THREE.MeshStandardMaterial({
    color: "#ff0000",
    emissive: "#ff0000",
    emissiveIntensity: 1,
    toneMapped: false
  }),
  dashedLineGeometry: new THREE.PlaneGeometry(4, 1.5),
  dashedLineMaterial: new THREE.MeshStandardMaterial({ 
    color: "#ffffff" 
  }),
  windowGeometry: new THREE.PlaneGeometry(2.5, 1.5),
  windowMaterial: new THREE.MeshStandardMaterial({ 
    color: "#64b5f6", 
    transparent: true, 
    opacity: 0.7, 
    metalness: 0.9,
    roughness: 0.1
  }),
  poleMaterial: new THREE.MeshStandardMaterial({
    color: "#2a2a2a",
    roughness: 0.7,
    metalness: 0.3
  }),
  poleGeometry: new THREE.CylinderGeometry(0.05, 0.05, 1, 6),
  lightHousingGeometry: new THREE.CylinderGeometry(0.2, 0.2, 0.2, 8),
  lightHousingMaterial: new THREE.MeshStandardMaterial({
    color: "#333333",
    roughness: 0.4,
    metalness: 0.8
  })
};

// Create matrices for runway light positions
const createRunwayLightMatrices = () => {
  const matrices: THREE.Matrix4[] = [];
  
  // Front end lights
  const frontLeft = new THREE.Matrix4();
  frontLeft.setPosition(-145, 0.5, -15);
  matrices.push(frontLeft);
  
  const frontRight = new THREE.Matrix4();
  frontRight.setPosition(-145, 0.5, 15);
  matrices.push(frontRight);
  
  // Back end lights
  const backLeft = new THREE.Matrix4();
  backLeft.setPosition(145, 0.5, -15);
  matrices.push(backLeft);
  
  const backRight = new THREE.Matrix4();
  backRight.setPosition(145, 0.5, 15);
  matrices.push(backRight);
  
  return { matrices };
};

// Create matrices for runway markings
const createRunwayMarkingMatrices = (count: number) => {
  const matrices: THREE.Matrix4[] = [];
  
  for (let i = 0; i < count; i++) {
    const matrix = new THREE.Matrix4();
    matrix.setPosition((i - count/2) * 8, 0, 0.01);
    matrices.push(matrix);
  }
  
  return matrices;
};

// Create matrices for tower windows
const createTowerWindowMatrices = () => {
  const matrices: THREE.Matrix4[] = [];
  const windowCount = 8;
  
  for (let i = 0; i < windowCount; i++) {
    const angle = i * Math.PI / 4;
    const matrix = new THREE.Matrix4();
    
    // Position
    const x = Math.sin(angle) * 4;
    const y = 22;
    const z = Math.cos(angle) * 4;
    
    // Create and apply transformations
    matrix
      .makeRotationY(angle)
      .setPosition(x, y, z);
    
    matrices.push(matrix);
  }
  
  return matrices;
};

export function Airport({ 
  position = [0, 0, 0], 
  rotation = 0, 
  scale = 1,
  playerOwnsJet = false
}: AirportProps) {
  const groupRef = useRef<THREE.Group>(null)
  const airportJetRef = useRef<THREE.Group>(null)
  const towerLightRef = useRef<THREE.PointLight>(null)
  const [lightIntensity, setLightIntensity] = useState(1.5)
  const [showJetPrompt, setShowJetPrompt] = useState(false)
  const [isInJet, setIsInJet] = useState(false)
  const [isTestFlight, setIsTestFlight] = useState(false)
  
  // Get player position from game state
  const [playerPosition, setPlayerPosition] = useState<THREE.Vector3>(new THREE.Vector3())
  const gameStore = useGameStore()
  
  // Create matrices for all instanced elements
  const { matrices } = useMemo(() => 
    createRunwayLightMatrices(), []
  );
  
  const runwayMarkingMatrices = useMemo(() => 
    createRunwayMarkingMatrices(36), []
  );
  
  const windowMatrices = useMemo(() => 
    createTowerWindowMatrices(), []
  );

  // Setup blinking effect for tower light
  useFrame((state) => {
    if (towerLightRef.current) {
      // Rotate the light
      towerLightRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.3
      towerLightRef.current.position.z = Math.cos(state.clock.elapsedTime * 0.5) * 0.3
      
      // Blink the light - pulsate intensity
      const blinkIntensity = Math.sin(state.clock.elapsedTime * 3) * 0.5 + 1.5
      towerLightRef.current.intensity = blinkIntensity
      setLightIntensity(blinkIntensity)
      
      // Get current player position for interaction detection
      const currentPlayer = gameStore.getState().currentPlayer
      if (currentPlayer) {
        setPlayerPosition(new THREE.Vector3(
          currentPlayer.position[0],
          currentPlayer.position[1],
          currentPlayer.position[2]
        ))
      }
      
      // Check proximity to the jet
      if (airportJetRef.current && !isInJet) {
        const jetWorldPosition = new THREE.Vector3()
        airportJetRef.current.getWorldPosition(jetWorldPosition)
        
        // Calculate distance between player and jet
        const distance = playerPosition.distanceTo(jetWorldPosition)
        
        // Show prompt if player is close enough
        setShowJetPrompt(distance < INTERACTION_DISTANCE)
      }
    }
  })

  // Update all instance matrices
  useEffect(() => {
    const whiteLightMesh = groupRef.current?.getObjectByName('whiteLights') as THREE.InstancedMesh;
    const redLightMesh = groupRef.current?.getObjectByName('redLights') as THREE.InstancedMesh;
    const dashedLinesMesh = groupRef.current?.getObjectByName('dashedLines') as THREE.InstancedMesh;
    const windowsMesh = groupRef.current?.getObjectByName('towerWindows') as THREE.InstancedMesh;
    
    if (whiteLightMesh && redLightMesh) {
      matrices.forEach((matrix, i) => {
        if (i % 2 === 0) {
          whiteLightMesh.setMatrixAt(i/2, matrix);
        } else {
          redLightMesh.setMatrixAt(Math.floor(i/2), matrix);
        }
      });
      whiteLightMesh.instanceMatrix.needsUpdate = true;
      redLightMesh.instanceMatrix.needsUpdate = true;
    }

    if (dashedLinesMesh) {
      runwayMarkingMatrices.forEach((matrix, i) => {
        dashedLinesMesh.setMatrixAt(i, matrix);
      });
      dashedLinesMesh.instanceMatrix.needsUpdate = true;
    }

    if (windowsMesh) {
      windowMatrices.forEach((matrix, i) => {
        windowsMesh.setMatrixAt(i, matrix);
      });
      windowsMesh.instanceMatrix.needsUpdate = true;
    }
  }, [matrices, runwayMarkingMatrices, windowMatrices]);

  // Set up test flight event listener
  useEffect(() => {
    // Add keypress event listener for entering/exiting the jet
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && showJetPrompt) {
        console.log('Toggling jet entry')
        
        // Toggle jet state
        setIsInJet(!isInJet)
        
        // Notify the game about player entering/exiting vehicle
        if (!isInJet) {
          // Player is entering jet
          const enterJetEvent = new CustomEvent('enterVehicle', {
            detail: { 
              type: 'jet',
              vehicleId: 'airport-jet'
            }
          })
          window.dispatchEvent(enterJetEvent)
          
          // Play enter sound
          const enterSound = new Audio('/sounds/aircraft/startup.mp3')
          enterSound.play()
          
          // Show confirmation message
          const confirmationEvent = new CustomEvent('showMessage', {
            detail: { 
              message: 'You are now in the jet! Use WASD to control direction, Space to accelerate, Shift to brake.',
              duration: 5000,
              type: 'success'
            }
          })
          window.dispatchEvent(confirmationEvent)
        } else {
          // Player is exiting jet
          const exitJetEvent = new CustomEvent('exitVehicle', {
            detail: { 
              type: 'jet',
              vehicleId: 'airport-jet'
            }
          })
          window.dispatchEvent(exitJetEvent)
          
          // Play exit sound
          const exitSound = new Audio('/sounds/aircraft/shutdown.mp3')
          exitSound.play()
          
          // Show exit message
          const exitMessageEvent = new CustomEvent('showMessage', {
            detail: { 
              message: 'You have exited the jet.',
              duration: 3000,
              type: 'info'
            }
          })
          window.dispatchEvent(exitMessageEvent)
        }
      }
    }
    
    const handleTestFlight = (event: CustomEvent) => {
      if (!airportJetRef.current) return
      
      if (event.detail?.position) {
        console.log('Creating test flight jet')
        setIsTestFlight(true)
      }
    }

    // Add event listeners
    window.addEventListener('keydown', handleKeyPress)
    window.addEventListener('testFlightJet', handleTestFlight as EventListener)
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
      window.removeEventListener('testFlightJet', handleTestFlight as EventListener)
    }
  }, [showJetPrompt, isInJet])
  
  return (
    <RigidBody type="fixed" position={position} rotation={[0, rotation, 0]} colliders={false}>
      <group ref={groupRef} scale={scale}>
        {/* Extended Runway */}
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[300, 30]} />
          <meshStandardMaterial color="#333333" roughness={0.8} />
          
          {/* Runway markings */}
          <group position={[0, 0, 0.01]}>
            {/* Center line */}
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[295, 1.5]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
            
            {/* Dashed lines using instanced mesh */}
            <instancedMesh
              name="dashedLines"
              geometry={dashedLineGeometry}
              material={dashedLineMaterial}
              count={36}
            />
          </group>
        </mesh>
        
        {/* Airport name using billboard - visible from everywhere */}
        <Billboard
          position={[0, 30, 0]}
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
        >
          <Text
            fontSize={4.5}
            color="#ffffff"
            font="/fonts/Heavitas.ttf"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.2}
            outlineColor="#000000"
          >
            POOKIE INTERNATIONAL AIRPORT
          </Text>
        </Billboard>
        
        {/* Control Tower */}
        <group position={[20, 0, -40]}>
          {/* Tower base */}
          <mesh position={[0, 10, 0]}>
            <cylinderGeometry args={[3.5, 4, 20, 8]} />
            <meshStandardMaterial color="#e0e0e0" roughness={0.6} />
          </mesh>
          
          {/* Tower top - control room */}
          <mesh position={[0, 22, 0]}>
            <cylinderGeometry args={[4.5, 3.5, 4, 8]} />
            <meshStandardMaterial color="#90caf9" roughness={0.2} metalness={0.5} />
          </mesh>
          
          {/* Tower roof */}
          <mesh position={[0, 24.5, 0]}>
            <coneGeometry args={[4.5, 3, 8]} />
            <meshStandardMaterial color="#546e7a" roughness={0.5} />
          </mesh>
          
          {/* Windows using instanced mesh */}
          <instancedMesh
            name="towerWindows"
            geometry={windowGeometry}
            material={windowMaterial}
            count={8}
          />
          
          {/* Red blinking light at the top */}
          <group position={[0, 26, 0]}>
            {/* Light housing */}
            <mesh>
              <cylinderGeometry args={[0.5, 0.5, 0.5, 8]} />
              <meshStandardMaterial color="#333333" roughness={0.4} metalness={0.8} />
            </mesh>
            
            {/* Light bulb */}
            <mesh position={[0, 0.5, 0]}>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshStandardMaterial 
                color="#ff0000" 
                emissive="#ff0000"
                emissiveIntensity={lightIntensity * 0.5}
                toneMapped={false}
              />
            </mesh>
            
            {/* Spinning light */}
            <pointLight 
              ref={towerLightRef} 
              position={[0, 0.5, 0]} 
              intensity={1.5} 
              distance={100} 
              color="#ff0000" 
            />
          </group>
        </group>
        
        {/* Single Airport Jet - serves as both display and flyable */}
        <group ref={airportJetRef}>
          <FighterJet 
            position={isTestFlight ? [130, 1.5, 0] : [120, 1.5, 0]} 
            rotation={[0, isTestFlight ? 0 : 0, 0]} 
            scale={isTestFlight ? 1.5 : 1.2}
            isPlayerJet={isTestFlight || playerOwnsJet}
          />
          
          {/* Enhanced Interaction prompt */}
          {showJetPrompt && !isInJet && (
            <Billboard
              position={[isTestFlight ? 130 : 120, 6, 0]}
              follow={true}
              lockX={false}
              lockY={false}
              lockZ={false}
            >
              <group>
                {/* Background for better visibility */}
                <mesh position={[0, 0, -0.01]}>
                  <planeGeometry args={[3.5, 1.5]} />
                  <meshBasicMaterial color="#000000" opacity={0.7} transparent />
                </mesh>
                
                {/* Main text */}
                <Text
                  position={[0, 0, 0]}
                  fontSize={0.9}
                  color="#ffffff"
                  font="/fonts/Heavitas.ttf"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.08}
                  outlineColor="#000000"
                >
                  Press E to Enter Jet
                </Text>
                
                {/* Key indicator */}
                <group position={[-1.5, 0, 0]}>
                  <mesh>
                    <boxGeometry args={[0.6, 0.6, 0.1]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                  <Text
                    position={[0, 0, 0.06]}
                    fontSize={0.4}
                    color="#000000"
                    font="/fonts/Heavitas.ttf"
                    anchorX="center"
                    anchorY="middle"
                  >
                    E
                  </Text>
                </group>
              </group>
            </Billboard>
          )}
        </group>
        
        {/* Runway lights with poles */}
        <group>
          {/* Front end lights */}
          <group position={[-145, 0, -15]}>
            {/* Light pole */}
            <mesh position={[0, 0.5, 0]} geometry={poleGeometry} material={poleMaterial} />
            {/* Light housing */}
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.2, 8]} />
              <meshStandardMaterial color="#333333" roughness={0.4} metalness={0.8} />
            </mesh>
            {/* Light bulb */}
            <mesh position={[0, 1.2, 0]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial 
                color="#ffffff" 
                emissive="#ffffff"
                emissiveIntensity={1}
                toneMapped={false}
              />
            </mesh>
            {/* Light source */}
            <pointLight 
              position={[0, 1.2, 0]}
              intensity={1} 
              distance={50}
              color="#ffffff"
            />
          </group>

          <group position={[-145, 0, 15]}>
            <mesh position={[0, 0.5, 0]} geometry={poleGeometry} material={poleMaterial} />
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.2, 8]} />
              <meshStandardMaterial color="#333333" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial 
                color="#ff0000" 
                emissive="#ff0000"
                emissiveIntensity={1}
                toneMapped={false}
              />
            </mesh>
            <pointLight 
              position={[0, 1.2, 0]}
              intensity={1} 
              distance={50}
              color="#ff0000"
            />
          </group>
          
          {/* Back end lights */}
          <group position={[145, 0, -15]}>
            <mesh position={[0, 0.5, 0]} geometry={poleGeometry} material={poleMaterial} />
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.2, 8]} />
              <meshStandardMaterial color="#333333" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial 
                color="#ff0000" 
                emissive="#ff0000"
                emissiveIntensity={1}
                toneMapped={false}
              />
            </mesh>
            <pointLight 
              position={[0, 1.2, 0]}
              intensity={1} 
              distance={50}
              color="#ff0000"
            />
          </group>

          <group position={[145, 0, 15]}>
            <mesh position={[0, 0.5, 0]} geometry={poleGeometry} material={poleMaterial} />
            <mesh position={[0, 1, 0]}>
              <cylinderGeometry args={[0.2, 0.2, 0.2, 8]} />
              <meshStandardMaterial color="#333333" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
              <sphereGeometry args={[0.15, 16, 16]} />
              <meshStandardMaterial 
                color="#ffffff" 
                emissive="#ffffff"
                emissiveIntensity={1}
                toneMapped={false}
              />
            </mesh>
            <pointLight 
              position={[0, 1.2, 0]}
              intensity={1} 
              distance={50}
              color="#ffffff"
            />
          </group>
        </group>
        
        {/* Updated CuboidCollider for the extended runway */}
        <CuboidCollider args={[150, 0.5, 15]} position={[0, 0, 0]} />
        
        {/* Control Tower Collider */}
        <CuboidCollider args={[4, 15, 4]} position={[20, 15, -40]} />
      </group>
    </RigidBody>
  )
} 