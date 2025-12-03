'use client'

import { useState, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Text } from '@react-three/drei'
import * as THREE from 'three'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useGameStore } from '@/lib/store'
import { useInventoryStore } from '@/stores/inventory-store'
import { useNotificationStore } from '@/stores/notification-store'
import { Backpack, Coffee, Shirt, Car, Gem, Package } from 'lucide-react'

export interface CollectibleItemProps {
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  itemId: string
  name: string
  modelPath: string
  itemData: any
  glowColor?: string
  hoverDistance?: number
  rotationSpeed?: number
}

export function CollectibleItem({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  itemId,
  name,
  modelPath,
  itemData,
  glowColor = '#4dabf7',
  hoverDistance = 0.3,
  rotationSpeed = 0.5
}: CollectibleItemProps) {
  const { scene } = useGLTF(modelPath)
  const model = useRef<THREE.Group>(null)
  const [playerNearby, setPlayerNearby] = useState(false)
  const [collected, setCollected] = useState(false)
  const { addInventoryItem } = useInventoryStore.getState().actions
  const { addNotification } = useNotificationStore.getState().actions
  
  // Clone the model to avoid sharing materials
  const clonedScene = useRef<THREE.Group>()
  
  useEffect(() => {
    if (!clonedScene.current) {
      clonedScene.current = scene.clone()
      
      // Apply custom material settings to make it stand out
      clonedScene.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material) {
            // Create a new material to avoid modifying the original
            const newMaterial = child.material.clone()
            
            // Enhance the material properties
            if (newMaterial instanceof THREE.MeshStandardMaterial) {
              newMaterial.emissive = new THREE.Color(0x222222)
              newMaterial.emissiveIntensity = 0.2
              newMaterial.envMapIntensity = 1.5
            }
            
            child.material = newMaterial
          }
        }
      })
    }
  }, [scene])
  
  // Floating animation
  useFrame(({ clock }) => {
    if (collected || !model.current) return
    
    const time = clock.getElapsedTime()
    
    // Gentle floating motion
    model.current.position.y = Math.sin(time * 1.5) * 0.05 + hoverDistance
    
    // Slow rotation
    model.current.rotation.y += rotationSpeed * 0.01
  })
  
  // Check for player proximity
  useEffect(() => {
    const checkPlayerProximity = () => {
      try { 
        // Call getState() directly on the imported store hook
        const { currentPlayer } = useGameStore.getState(); 
        
        if (!currentPlayer || collected || !currentPlayer.position) { 
          setPlayerNearby(false); 
          return;
        }

        const playerPos = new THREE.Vector3(...currentPlayer.position);
        const itemPos = new THREE.Vector3(...position);
        const distance = playerPos.distanceTo(itemPos);
        setPlayerNearby(distance < 3);

      } catch (error) {
        console.error("Error in checkPlayerProximity for CollectibleItem:", error);
        setPlayerNearby(false);
      }
    };

    const interval = setInterval(checkPlayerProximity, 200);
    return () => clearInterval(interval);
  }, [position, collected]);
  
  // Get icon based on item type
  const getItemIcon = () => {
    switch (itemData.type) {
      case 'equipment':
        return <Shirt className="w-5 h-5" />;
      case 'consumable':
        return <Coffee className="w-5 h-5" />;
      case 'vehicle':
        return <Car className="w-5 h-5" />;
      case 'resource':
        return <Gem className="w-5 h-5" />;
      case 'collectible':
        return <Backpack className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };
  
  // Handle collection
  const handleCollect = () => {
    if (collected) return
    
    // Add to inventory
    addInventoryItem({
      id: itemId,
      name: name,
      description: itemData.description || `A ${name} you found in the world.`,
      value: itemData.value || 0,
      quantity: 1,
      type: itemData.type || 'collectible',
      rarity: itemData.rarity || 'common',
      image: itemData.image || modelPath,
      ...itemData
    })
    
    // Mark as collected
    setCollected(true)
    
    // Play collection sound
    const collectSound = new Audio('/sounds/collect.mp3')
    collectSound.volume = 0.5
    collectSound.play().catch(e => console.log('Error playing sound:', e))
    
    // Show notification
    addNotification({
      message: `Collected ${name}!`,
      type: 'success',
      duration: 3000,
      icon: getItemIcon()
    })
    
    // Show collection message
    console.log(`Collected ${name}!`)
  }
  
  // Handle key press for collection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        if (playerNearby && !collected) {
          handleCollect()
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [playerNearby, collected])
  
  if (collected) return null
  
  return (
    <group position={position} rotation={rotation as any}>
      {/* Invisible collider for interaction */}
      <RigidBody type="fixed" colliders={false} sensor>
        <CuboidCollider args={[0.5, 0.5, 0.5]} />
      </RigidBody>
      
      {/* Item model */}
      <group ref={model} position={[0, hoverDistance, 0]} scale={scale}>
        {clonedScene.current && <primitive object={clonedScene.current} />}
      </group>
      
      {/* Floating label when player is nearby */}
      {playerNearby && (
        <group position={[0, 1.5, 0]}>
          <Text
            position={[0, 0, 0]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="black"
          >
            {name}
          </Text>
          <Text
            position={[0, -0.25, 0]}
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="black"
          >
            Press E to collect
          </Text>
        </group>
      )}
    </group>
  )
} 