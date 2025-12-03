'use client'

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useGLTF, useAnimations, TransformControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Group } from 'three'
import { OrbitControls } from 'three-stdlib'
import { useCollisionShape } from '@/components/game/collision-shape-context'
import { Html } from '@react-three/drei'
import { useCollisionEditor } from '@/components/game/collision-editor-context'
import { supabase } from '@/services/supabase-config'
import { debounce } from 'lodash'

// Define the asset interface
interface PermanentAsset {
  id: string
  name: string
  url: string
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  debug?: boolean
  isPermanent?: boolean
  isLocked?: boolean
}

// Interface for data coming from Supabase
interface SupabaseAssetData {
  id: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  is_locked?: boolean; // Snake case from DB
}

// Custom GLB Asset component that follows the same pattern as the Igloo component
function CustomGLBAsset({ 
  url, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0],
  scale = 1, 
  debug = false,
  id = '',
  isSelected = false,
  isLocked = false,
  onSelect = () => {},
  onPositionChange = () => {},
  onRotationChange = () => {},
  onScaleChange = () => {},
  transformMode = 'translate'
}: { 
  url: string, 
  position?: [number, number, number], 
  rotation?: [number, number, number],
  scale?: number,
  debug?: boolean,
  id?: string,
  isSelected?: boolean,
  isLocked?: boolean,
  onSelect?: () => void,
  onPositionChange?: (position: [number, number, number]) => void,
  onRotationChange?: (rotation: [number, number, number]) => void,
  onScaleChange?: (scale: number) => void,
  transformMode?: 'translate' | 'rotate' | 'scale'
}) {
  const groupRef = useRef<Group>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const { isEditorEnabled } = useCollisionShape()
  
  // Ensure URL is properly formatted
  const formattedUrl = url.startsWith('http') || url.startsWith('/') ? url : `/models/${url}`
  
  // Load the model
  const { scene, animations } = useGLTF(formattedUrl)
  
  // Set up animations if available
  const { actions, mixer } = useAnimations(animations, groupRef)
  
  // Debug animations
  useEffect(() => {
    if (animations && animations.length > 0) {
      console.log(`Available animations for ${id || url}:`, animations.map(a => a.name))
      
      // Try to play each animation
      animations.forEach(animation => {
        const animationName = animation.name
        const action = actions[animationName]
        if (action) {
          action.reset().fadeIn(0.5).play()
          console.log(`Animation ${animationName} started successfully for ${id || url}`)
        }
      })
    }
  }, [animations, actions, id, url])
  
  // Clone the scene to avoid sharing materials between instances
  const clonedScene = scene.clone()
  
  useEffect(() => {
    if (clonedScene && !isLoaded) {
      // Ensure all materials are properly set up
      clonedScene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.material) {
            // Clone materials to avoid sharing
            if (Array.isArray(object.material)) {
              object.material = object.material.map(m => m.clone())
            } else {
              object.material = object.material.clone()
            }
            
            // Enable shadows
            object.castShadow = true
            object.receiveShadow = true
            
            // In debug mode, use a wireframe material
        if (debug) {
              const debugMaterial = new THREE.MeshStandardMaterial({
            color: 0xff3333,
            wireframe: true,
          })
              object.material = debugMaterial
            }
          }
        }
      })
      
      setIsLoaded(true)
      console.log(`Model loaded successfully: ${id || url}`)
    }
    
    return () => {
      // Cleanup animations when component unmounts
      if (mixer) {
        mixer.stopAllAction()
      }
    }
  }, [clonedScene, isLoaded, mixer, debug, id, url])
  
  // Update the animation mixer in each frame
  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta)
    }
  })
  
  // Convert rotation from degrees to radians if needed
  const rotationInRadians = rotation.map(r => typeof r === 'number' ? r * Math.PI / 180 : r) as [number, number, number]
  
  // Handle transform control changes
  const handleTransformChange = () => {
    if (groupRef.current) {
      // Get the new position
      const newPosition: [number, number, number] = [
        groupRef.current.position.x,
        groupRef.current.position.y,
        groupRef.current.position.z
      ]
      
      // Get the new rotation (convert from radians to degrees)
      const newRotation: [number, number, number] = [
        groupRef.current.rotation.x * 180 / Math.PI,
        groupRef.current.rotation.y * 180 / Math.PI,
        groupRef.current.rotation.z * 180 / Math.PI
      ]
      
      // Get the new scale (assuming uniform scale)
      const newScale = groupRef.current.scale.x
      
      // Call the callbacks
      onPositionChange(newPosition)
      onRotationChange(newRotation)
      onScaleChange(newScale)
    }
  }
  
  return (
    <>
      <group 
        ref={groupRef} 
        position={position}
        rotation={rotationInRadians}
        scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
        onClick={(e) => {
          if (isEditorEnabled && !isLocked) {
            e.stopPropagation()
            onSelect()
          } else if (isEditorEnabled && isLocked) {
            // Show a message that the asset is locked
            e.stopPropagation()
            console.log(`Asset ${id} is locked and cannot be edited. Unlock it from the Asset List.`)
          }
        }}
      >
        {isLoaded && <primitive object={clonedScene} />}
        
        {/* Show debug helpers for selected assets or when in debug mode */}
        {(debug || isSelected) && isLoaded && (
          <group>
            <axesHelper args={[1]} />
            <gridHelper args={[2, 10]} rotation={[Math.PI / 2, 0, 0]} />
          </group>
        )}
        
        {/* Show lock indicator for locked assets when editor is enabled */}
        {isEditorEnabled && isLocked && isLoaded && (
          <Html
            position={[0, 2, 0]}
            center
            distanceFactor={10}
          >
            <div className="bg-blue-500/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
              🔒 Locked
            </div>
          </Html>
        )}
      </group>
      
      {isEditorEnabled && isSelected && !isLocked && groupRef.current && (
        <TransformControls 
          object={groupRef.current} 
          mode={transformMode}
          onObjectChange={handleTransformChange}
        />
      )}
    </>
  )
}

// Main component to render all custom GLB assets
export function CustomGLBAssets() {
  const [assets, setAssets] = useState<PermanentAsset[]>([])
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)
  const { isEditorMode } = useCollisionEditor()
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate' | 'scale'>('translate')
  const [lockedAssets, setLockedAssets] = useState<Record<string, boolean>>({})

  // Load assets from the API
  const loadAssets = useCallback(async () => {
    try {
      // Fetch initial asset data
      const response = await fetch('/data/permanent-assets.json')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      let data: PermanentAsset[] = await response.json()
      
      // Filter out the fishing pier asset BEFORE any other processing
      data = data.filter(asset => asset.url !== '/models/fishing pier.glb');

      // Fetch positions, rotations, scales, and locked states from Supabase
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('permanent_assets')
        .select('id, position, rotation, scale, is_locked')

      if (supabaseError) {
        console.error("Error fetching from Supabase:", supabaseError)
      } else if (supabaseData) {
        const newLockedStates: Record<string, boolean> = {}
        data = data.map(asset => {
          const dbAsset = supabaseData.find((sa: SupabaseAssetData) => sa.id === asset.id)
          if (dbAsset) {
            newLockedStates[asset.id] = !!dbAsset.is_locked // Store locked state
            return { 
              ...asset, 
              position: dbAsset.position || asset.position || [0,0,0], 
              rotation: dbAsset.rotation || asset.rotation || [0,0,0],
              scale: dbAsset.scale || asset.scale || 1,
              isLocked: !!dbAsset.is_locked // Map to isLocked
            }
          }
          newLockedStates[asset.id] = false // Default to not locked if not in DB
          return {...asset, isLocked: false} // Ensure isLocked is set
        })
        setLockedAssets(newLockedStates)
      }
      
      setAssets(data)
      
      // Preload all GLTF models (fishing pier will be excluded due to filter above)
      data.forEach(asset => {
        if (asset.url) {
          useGLTF.preload(asset.url)
        }
      })

    } catch (error) {
      console.error("Failed to load permanent assets:", error)
    }
  }, [])

  // Load assets when component mounts
  useEffect(() => {
    loadAssets()
  }, [loadAssets])

  // Handle asset selection
  const handleSelectAsset = (assetId: string | null) => {
    setSelectedAssetId(assetId)
  }

  // Handle position change
  const handlePositionChange = (id: string, newPosition: [number, number, number]) => {
    // Update local state
    setAssets(prev => 
      prev.map(asset => 
        asset.id === id 
          ? { ...asset, position: newPosition } 
          : asset
      )
    )
  }

  // Handle rotation change
  const handleRotationChange = (id: string, newRotation: [number, number, number]) => {
    // Update local state
    setAssets(prev => 
      prev.map(asset => 
        asset.id === id 
          ? { ...asset, rotation: newRotation } 
          : asset
      )
    )
  }

  // Handle scale change
  const handleScaleChange = (id: string, newScale: number) => {
    // Update local state
    setAssets(prev => 
      prev.map(asset => 
        asset.id === id 
          ? { ...asset, scale: newScale } 
          : asset
      )
    )
  }

  // Save asset changes to the server
  const debouncedSaveAsset = useCallback(
    debounce(async (assetId: string, newPosition, newRotation, newScale) => {
      try {
        // General save logic for any asset (if needed, or can be restricted)
        const { data, error } = await supabase
          .from('permanent_assets')
          .update({ 
            position: newPosition, 
            rotation: newRotation, 
            scale: newScale 
          })
          .eq('id', assetId)
        if (error) {
          console.error('Error saving asset position:', error)
        } else {
          console.log('Successfully saved asset position:', data)
        }
      } catch (error) {
        console.error('Error saving asset position:', error)
      }
    }, 1000),
    [assets]
  )

  // Toggle asset lock state
  const handleToggleLock = async (assetId: string) => {
    const currentAsset = assets.find(a => a.id === assetId)
    if (!currentAsset) return

    const newLockedState = !(currentAsset.isLocked)

    // General lock toggle logic
    try {
      const { data, error } = await supabase
        .from('permanent_assets')
        .update({ is_locked: newLockedState })
        .eq('id', assetId)
        .select() // Important to get the updated row back if needed

      if (error) {
        console.error(`Failed to ${newLockedState ? 'lock' : 'unlock'} asset:`, error)
      } else {
        console.log(`Successfully ${newLockedState ? 'locked' : 'unlocked'} asset:`, data)
        setLockedAssets(prev => ({ ...prev, [assetId]: newLockedState }))
        // Update the asset in the main 'assets' state as well
        setAssets(prevAssets => prevAssets.map(a => 
          a.id === assetId ? { ...a, isLocked: newLockedState } : a
        ))
      }
    } catch (error) {
      console.error(`Error ${newLockedState ? 'locking' : 'unlocking'} asset:`, error)
    }
  }

  // Cycle through transform modes when the user presses the 'T' key
  useEffect(() => {
    if (!isEditorMode || !selectedAssetId) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the target is an input field or textarea
      const targetElement = e.target as HTMLElement;
      if (targetElement.tagName === 'INPUT' || targetElement.tagName === 'TEXTAREA' || targetElement.isContentEditable) {
        return; // Don't interfere with text input
      }

      // No specific key handling for fishing pier needed as it's filtered out

      if (e.key === 'l' || e.key === 'L') {
        if (selectedAssetId) {
          handleToggleLock(selectedAssetId)
        }
      } else if (e.key === 't' || e.key === 'T') {
        setTransformMode(prev => {
          if (prev === 'translate') return 'rotate';
          if (prev === 'rotate') return 'scale';
          return 'translate';
        });
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditorMode, selectedAssetId, handleToggleLock, assets])

  return (
    <>
      {/* Render all dynamic assets */}
      {assets.map(asset => (
        <CustomGLBAsset
          key={asset.id}
          id={asset.id}
          url={asset.url}
          position={asset.position}
          rotation={asset.rotation}
          scale={asset.scale}
          debug={asset.debug}
          isSelected={selectedAssetId === asset.id}
          isLocked={!!asset.isLocked}
          transformMode={transformMode}
          onSelect={() => handleSelectAsset(asset.id)}
          onPositionChange={(position) => {
            handlePositionChange(asset.id, position)
            debouncedSaveAsset(asset.id, position, asset.rotation, asset.scale)
          }}
          onRotationChange={(rotation) => {
            handleRotationChange(asset.id, rotation)
            debouncedSaveAsset(asset.id, asset.position, rotation, asset.scale)
          }}
          onScaleChange={(scale) => {
            handleScaleChange(asset.id, scale)
            debouncedSaveAsset(asset.id, asset.position, asset.rotation, scale)
          }}
        />
      ))}
      
      {/* Transform mode indicator for selected asset */}
      {isEditorMode && selectedAssetId && (() => {
        const selectedAsset = assets.find(asset => asset.id === selectedAssetId)
        if (!selectedAsset) return null
        
        return (
          <Html
            position={[selectedAsset.position[0], selectedAsset.position[1] + (selectedAsset.scale * 2) + 2, selectedAsset.position[2]]}
            center
            distanceFactor={20}
          >
            <div className="bg-gray-800 bg-opacity-70 text-white px-3 py-1.5 rounded text-xs whitespace-nowrap select-none">
              {selectedAsset.name} - Mode: {transformMode} (T)
              <br />
              {selectedAsset.isLocked ? '🔒 Locked' : '🔓 Unlocked'} (L)
            </div>
          </Html>
        )
      })()}
    </>
  )
}

export default CustomGLBAssets 