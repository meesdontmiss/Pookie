import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { Level, LevelObject } from './levels';
import { useGLTF, useTexture, Box, Sphere, Cylinder, Cone } from '@react-three/drei';
import { Group } from 'three';
import { CircularSpawnPlatform } from './CircularSpawnPlatform';

// Consumable models for collectibles
const CONSUMABLE_TYPES = ['lean_cup', 'fat_joint', 'promethazine_lean'] as const;
type ConsumableType = typeof CONSUMABLE_TYPES[number];

interface LevelRendererProps {
  level: Level;
  onCollectItem?: (id: number) => void;
  onReachGoal?: () => void;
}

export const LevelRenderer: React.FC<LevelRendererProps> = ({ 
  level, 
  onCollectItem, 
  onReachGoal 
}) => {
  // References
  const groundRef = useRef<THREE.Mesh>(null);
  const goalRef = useRef<THREE.Group>(null);
  const collectiblesRef = useRef<{ [key: number]: THREE.Group }>({});
  const { scene } = useThree();
  
  // Load consumable models
  const leanCup = useGLTF('/models/consumables/lean_cup.glb');
  const fatJoint = useGLTF('/models/consumables/fat_joint.glb');
  const promethazineLean = useGLTF('/models/consumables/promethazine_lean.glb');
  
  // Store models in a map for easy access
  const consumableModels = useMemo(() => ({
    'lean_cup': leanCup.scene.clone(),
    'fat_joint': fatJoint.scene.clone(),
    'promethazine_lean': promethazineLean.scene.clone()
  }), [leanCup, fatJoint, promethazineLean]);
  
  // Prepare consumable models
  useEffect(() => {
    Object.values(consumableModels).forEach(model => {
      model.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    });
  }, [consumableModels]);
  
  // Animate collectibles for a floating effect
  useFrame(({ clock }) => {
    // Animate each collectible with a floating effect
    Object.values(collectiblesRef.current).forEach((collectible, index) => {
      if (collectible) {
        const t = clock.getElapsedTime();
        collectible.position.y += Math.sin(t * 2 + index * 0.5) * 0.0015;
        collectible.rotation.y += 0.01;
      }
    });
    
    // Animate goal marker
    if (goalRef.current) {
      const t = clock.getElapsedTime();
      goalRef.current.rotation.y += 0.01;
      
      // Find goal flag or pole and animate it
      goalRef.current.children.forEach(child => {
        if (child.name === 'goalFlag') {
          child.position.y = Math.sin(t * 3) * 0.05 + 4.5;
        }
      });
    }
  });
  
  // Check for collectible collections
  useEffect(() => {
    // Set up a collision detection system to detect when the player collects an item
    const checkCollisions = () => {
      Object.entries(collectiblesRef.current).forEach(([indexStr, collectible]) => {
        if (collectible && collectible.userData.active) {
          const playerBall = scene.getObjectByName('player-ball');
          if (playerBall) {
            const ballPos = new THREE.Vector3();
            playerBall.getWorldPosition(ballPos);
            
            const collectiblePos = new THREE.Vector3();
            collectible.getWorldPosition(collectiblePos);
            
            const distance = ballPos.distanceTo(collectiblePos);
            if (distance < 1.5) { // Collection distance radius
              // Mark as collected
              collectible.userData.active = false;
              
              // Hide the collectible
              collectible.visible = false;
              
              // Call the collection callback
              if (onCollectItem) {
                onCollectItem(parseInt(indexStr));
              }
            }
          }
        }
      });
      
      // Check if player reached the goal
      if (goalRef.current) {
        const playerBall = scene.getObjectByName('player-ball');
        if (playerBall) {
          const ballPos = new THREE.Vector3();
          playerBall.getWorldPosition(ballPos);
          
          const goalPos = new THREE.Vector3();
          goalRef.current.getWorldPosition(goalPos);
          
          const distance = Math.sqrt(
            Math.pow(ballPos.x - goalPos.x, 2) + 
            Math.pow(ballPos.z - goalPos.z, 2)
          );
          
          if (distance < 3) { // Distance to trigger goal
            if (onReachGoal) {
              onReachGoal();
            }
          }
        }
      }
    };
    
    // Set up the interval to check for collisions
    const interval = setInterval(checkCollisions, 100);
    
    return () => {
      clearInterval(interval);
    };
  }, [scene, onCollectItem, onReachGoal]);
  
  // Render the ground
  const renderGround = () => {
    const { groundColor, skyColor } = level.theme;
    const [width, depth] = level.groundSize;
    
    return (
      <group>
        {/* Main ground */}
        <RigidBody type="fixed" colliders="cuboid">
          <mesh 
            ref={groundRef} 
            position={[0, -0.5, 0]} 
            receiveShadow
          >
            <boxGeometry args={[width, 1, depth]} />
            <meshStandardMaterial color={groundColor} />
          </mesh>
        </RigidBody>
        
        {/* Sky dome */}
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[200, 32, 32]} />
          <meshBasicMaterial color={skyColor} side={THREE.BackSide} />
        </mesh>
      </group>
    );
  };

  // Render a level object
  const renderObject = (object: LevelObject, index: number) => {
    const { type, position, scale = [1, 1, 1], rotation = [0, 0, 0], color = '#ffffff', properties } = object;
    
    switch (type) {
      case 'start':
        return (
          <RigidBody key={`start-${index}`} type="fixed" colliders="cuboid">
            <mesh 
              position={position as [number, number, number]} 
              rotation={rotation as [number, number, number]}
              receiveShadow
              castShadow
            >
              <boxGeometry args={scale} />
              <meshStandardMaterial color={color} />
            </mesh>
            
            {/* Striped arrow on start platform */}
            <mesh position={[position[0], position[1] + 0.01, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[scale[0] * 0.8, scale[2] * 0.8]} />
              <meshStandardMaterial 
                map={(() => {
                  const size = 256;
                  const data = new Uint8Array(size * size * 4);
                  
                  for (let i = 0; i < size; i++) {
                    for (let j = 0; j < size; j++) {
                      const index = (i * size + j) * 4;
                      
                      // Create arrow pattern pointing down the course
                      const arrowPattern = Math.floor(j / (size / 8)) % 2 === 0;
                      const arrowStripe = (i > size * 0.3 && i < size * 0.7) && arrowPattern;
                      
                      data[index] = arrowStripe ? 0 : 255;     // R
                      data[index + 1] = arrowStripe ? 0 : 255; // G
                      data[index + 2] = arrowStripe ? 255 : 0; // B
                      data[index + 3] = 255;                  // A
                    }
                  }
                  
                  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
                  texture.needsUpdate = true;
                  return texture;
                })()}
              />
            </mesh>
          </RigidBody>
        );
      
      case 'spawn_platform':
        const platformProps = properties || {};
        return (
          <RigidBody key={`spawn_platform-${index}`} type="fixed" position={position} rotation={rotation} colliders="trimesh">
            <CircularSpawnPlatform 
              position={[0,0,0]}
              radius={platformProps.radius || 10}
              thickness={platformProps.thickness || 0.5}
              color={platformProps.color || '#888888'}
            />
          </RigidBody>
        );
      
      case 'goal':
        // Super Monkey Ball style goal with checker pattern and flag
        return (
          <group key={`goal-${index}`} position={position as [number, number, number]} ref={goalRef}>
            <RigidBody type="fixed" colliders="cuboid" sensor>
              <mesh 
                position={[0, 0, 0]} 
                rotation={rotation as [number, number, number]}
                receiveShadow
                castShadow
              >
                <boxGeometry args={scale} />
                <meshStandardMaterial color={color} transparent opacity={0.7} />
              </mesh>
              
              {/* Checkered pattern like in Super Monkey Ball */}
              <mesh position={[0, scale[1] / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[scale[0], scale[2]]} />
                <meshStandardMaterial 
                  map={(() => {
                    const size = 256;
                    const data = new Uint8Array(size * size * 4);
                    
                    for (let i = 0; i < size; i++) {
                      for (let j = 0; j < size; j++) {
                        const index = (i * size + j) * 4;
                        
                        // Create checkered finish line pattern
                        const checkSize = size / 8;
                        const isEvenI = Math.floor(i / checkSize) % 2 === 0;
                        const isEvenJ = Math.floor(j / checkSize) % 2 === 0;
                        const isBlack = isEvenI !== isEvenJ;
                        
                        data[index] = isBlack ? 0 : 255;     // R
                        data[index + 1] = isBlack ? 0 : 255; // G
                        data[index + 2] = isBlack ? 0 : 255; // B
                        data[index + 3] = 255;              // A
                      }
                    }
                    
                    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
                    texture.needsUpdate = true;
                    return texture;
                  })()}
                />
              </mesh>
            </RigidBody>
            
            {/* Goal markers - flag pole */}
            <group position={[0, 0, 0]}>
              {/* Flag pole */}
              <mesh position={[0, 2, 0]}>
                <cylinderGeometry args={[0.1, 0.1, 4, 8]} />
                <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.3} />
              </mesh>
              
              {/* Flag */}
              <mesh position={[0.5, 4.5, 0]} name="goalFlag">
                <boxGeometry args={[1, 0.7, 0.05]} />
                <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={0.2} />
              </mesh>
              
              {/* Base */}
              <mesh position={[0, 0.1, 0]}>
                <cylinderGeometry args={[0.5, 0.7, 0.2, 16]} />
                <meshStandardMaterial color="#666666" metalness={0.5} roughness={0.5} />
              </mesh>
            </group>
          </group>
        );
      
      case 'collectible':
        // Get a random consumable type based on the index
        const consumableType = CONSUMABLE_TYPES[index % CONSUMABLE_TYPES.length] as ConsumableType;
        const model = consumableModels[consumableType];
        
        if (!model) {
          console.error(`Missing model for consumable type: ${consumableType}`);
          return null;
        }
        
        // Scale and adjust based on the consumable type
        let modelScale: [number, number, number] = [0.7, 0.7, 0.7];
        let yOffset = 0;
        
        switch (consumableType) {
          case 'lean_cup':
            modelScale = [0.5, 0.5, 0.5];
            yOffset = 0;
            break;
          case 'fat_joint':
            modelScale = [1, 1, 1];
            yOffset = 0;
            break;
          case 'promethazine_lean':
            modelScale = [0.5, 0.5, 0.5];
            yOffset = 0;
            break;
        }
        
        return (
          <group 
            key={`collectible-${index}`} 
            position={position as [number, number, number]} 
            ref={el => {
              if (el) {
                collectiblesRef.current[index] = el;
                el.userData = { active: true, type: consumableType };
              }
            }}
          >
            <RigidBody type="fixed" colliders="ball" sensor userData={{ type: 'collectible', id: index }}>
              {/* Point light to make collectibles glow */}
              <pointLight 
                position={[0, 0, 0]} 
                color="#ffcc00" 
                intensity={1} 
                distance={2} 
                decay={2} 
              />
              
              {/* Consumable model */}
              <group position={[0, yOffset, 0]} scale={modelScale}>
                <primitive object={model.clone()} />
              </group>
              
              {/* Ring or glow effect */}
              <mesh position={[0, -0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.3, 0.6, 16]} />
                <meshBasicMaterial 
                  color="#ffcc00" 
                  transparent 
                  opacity={0.6} 
                  side={THREE.DoubleSide} 
                />
              </mesh>
            </RigidBody>
          </group>
        );
      
      case 'obstacle':
        // Different obstacle types
        if (properties?.shape === 'cone') {
          return (
            <RigidBody key={`obstacle-${index}`} type="fixed" colliders="hull">
              <mesh 
                position={position as [number, number, number]} 
                rotation={rotation as [number, number, number]}
                castShadow
              >
                <coneGeometry args={[scale[0] / 2, scale[1], 16]} />
                <meshStandardMaterial color={color} />
              </mesh>
            </RigidBody>
          );
        } else if (properties?.shape === 'penguin') {
          return (
            <RigidBody key={`obstacle-${index}`} type="fixed" colliders="cuboid">
              <group position={position as [number, number, number]}>
                {/* Body */}
                <mesh position={[0, scale[1] / 2, 0]} castShadow>
                  <capsuleGeometry args={[scale[0] / 2, scale[1] / 2, 8, 16]} />
                  <meshStandardMaterial color={color} />
                </mesh>
                
                {/* Head */}
                <mesh position={[0, scale[1] + scale[0] / 2, 0]} castShadow>
                  <sphereGeometry args={[scale[0] / 1.5, 16, 16]} />
                  <meshStandardMaterial color={color} />
                </mesh>
                
                {/* Eyes */}
                <mesh position={[scale[0] / 4, scale[1] + scale[0] / 1.8, scale[0] / 1.5]} castShadow>
                  <sphereGeometry args={[scale[0] / 10, 8, 8]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
                <mesh position={[-scale[0] / 4, scale[1] + scale[0] / 1.8, scale[0] / 1.5]} castShadow>
                  <sphereGeometry args={[scale[0] / 10, 8, 8]} />
                  <meshStandardMaterial color="#ffffff" />
                </mesh>
                
                {/* Beak */}
                <mesh position={[0, scale[1] + scale[0] / 2.2, scale[0] / 1.3]} castShadow rotation={[Math.PI / 10, 0, 0]}>
                  <coneGeometry args={[scale[0] / 6, scale[0] / 3, 16]} />
                  <meshStandardMaterial color="#ff9900" />
                </mesh>
              </group>
            </RigidBody>
          );
        } else if (properties?.shape === 'sculpture') {
          return (
            <RigidBody key={`obstacle-${index}`} type="fixed" colliders="cuboid">
              <mesh 
                position={position as [number, number, number]} 
                rotation={rotation as [number, number, number]}
                castShadow
              >
                <boxGeometry args={[scale[0], scale[1], scale[2]]} />
                <meshStandardMaterial color={color} transparent opacity={0.8} />
              </mesh>
            </RigidBody>
          );
        } else {
          // Standard obstacle (platform)
          return (
            <RigidBody key={`obstacle-${index}`} type="fixed" colliders="cuboid" friction={properties?.slippery ? 0.1 : 0.8}>
              <mesh 
                position={position as [number, number, number]} 
                rotation={rotation as [number, number, number]}
                receiveShadow
                castShadow
              >
                <boxGeometry args={scale} />
                <meshStandardMaterial color={color} />
              </mesh>
            </RigidBody>
          );
        }
        
      case 'wall':
        return (
          <RigidBody key={`wall-${index}`} type="fixed" colliders="cuboid">
            <mesh 
              position={position as [number, number, number]} 
              rotation={rotation as [number, number, number]}
              receiveShadow
              castShadow
            >
              <boxGeometry args={scale} />
              <meshStandardMaterial color={color} />
            </mesh>
          </RigidBody>
        );
      
      default:
        return null;
    }
  };

  // Set up scene lighting
  const setupLighting = () => {
    const { ambientLightColor, directionalLightColor, fogColor } = level.theme;
    
    return (
      <>
        {/* Ambient light */}
        <ambientLight intensity={0.5} color={ambientLightColor} />
        
        {/* Main directional light with shadows */}
        <directionalLight 
          position={[50, 50, 20]} 
          intensity={1} 
          castShadow 
          color={directionalLightColor}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-camera-far={100}
        />
        
        {/* Secondary fill light */}
        <directionalLight 
          position={[-30, 20, -10]} 
          intensity={0.3} 
          color="#ffffff" 
        />
        
        {/* Fog */}
        <fog attach="fog" color={fogColor} near={30} far={100} />
      </>
    );
  };

  return (
    <group>
      {/* Ground and sky */}
      {renderGround()}
      
      {/* All level objects */}
      {level.objects.map(renderObject)}
      
      {/* Lighting */}
      {setupLighting()}
    </group>
  );
};

export default LevelRenderer; 