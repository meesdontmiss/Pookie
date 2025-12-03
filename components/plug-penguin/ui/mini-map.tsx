'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

interface TerrainFeature {
  position: [number, number]
  radius: number
  color: string
  type: 'mountain' | 'lake' | 'forest' | 'landmark'
}

interface MiniMapProps {
  playerPosition: THREE.Vector3
  mapSize?: number
  zoom?: number
}

export function MiniMap({ 
  playerPosition, 
  mapSize = 120, 
  zoom = 0.1 
}: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const prevPositionRef = useRef<THREE.Vector3>(new THREE.Vector3())
  
  // Sample terrain features - in a real game, these would come from your game world data
  const terrainFeatures: TerrainFeature[] = [
    { position: [50, 50], radius: 20, color: 'rgba(100, 100, 180, 0.5)', type: 'mountain' },
    { position: [-30, 20], radius: 15, color: 'rgba(50, 150, 200, 0.5)', type: 'lake' },
    { position: [20, -40], radius: 25, color: 'rgba(50, 120, 50, 0.5)', type: 'forest' },
    { position: [-60, -60], radius: 10, color: 'rgba(200, 180, 50, 0.5)', type: 'landmark' },
  ]
  
  // Initialize the mini-map
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas dimensions
    canvas.width = mapSize
    canvas.height = mapSize
    
    setIsInitialized(true)
    console.log('Mini-map initialized')
  }, [mapSize])
  
  // Update the mini-map when player position changes
  useEffect(() => {
    if (!isInitialized || !canvasRef.current) return
    
    // Check if position has changed significantly to avoid unnecessary redraws
    if (playerPosition.distanceTo(prevPositionRef.current) < 0.1) return
    
    // Update previous position
    prevPositionRef.current.copy(playerPosition)
    
    console.log('Updating mini-map with player position:', playerPosition.x.toFixed(2), playerPosition.z.toFixed(2))
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw circular background with gradient
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = canvas.width / 2
    
    // Create radial gradient (deep blue theme)
    const gradient = ctx.createRadialGradient(
      centerX, centerY, radius * 0.4,
      centerX, centerY, radius
    )
    gradient.addColorStop(0, 'rgba(10, 30, 70, 0.9)')
    gradient.addColorStop(0.7, 'rgba(5, 20, 50, 0.9)')
    gradient.addColorStop(1, 'rgba(0, 10, 30, 0.9)')
    
    // Draw circular background
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = gradient
    ctx.fill()
    
    // Draw terrain features
    terrainFeatures.forEach(feature => {
      const featureX = centerX + feature.position[0] * zoom
      const featureY = centerY + feature.position[1] * zoom
      
      // Only draw if within the map circle
      const distFromCenter = Math.sqrt(
        Math.pow(featureX - centerX, 2) + 
        Math.pow(featureY - centerY, 2)
      )
      
      if (distFromCenter + feature.radius * zoom < radius) {
        ctx.beginPath()
        ctx.arc(featureX, featureY, feature.radius * zoom, 0, Math.PI * 2)
        ctx.fillStyle = feature.color
        ctx.fill()
        
        // Add texture based on feature type
        if (feature.type === 'mountain') {
          // Mountain texture (triangles)
          ctx.strokeStyle = 'rgba(150, 150, 220, 0.6)'
          ctx.lineWidth = 1
          const mountainSize = feature.radius * zoom * 0.8
          ctx.beginPath()
          ctx.moveTo(featureX, featureY - mountainSize)
          ctx.lineTo(featureX - mountainSize * 0.7, featureY + mountainSize * 0.5)
          ctx.lineTo(featureX + mountainSize * 0.7, featureY + mountainSize * 0.5)
          ctx.closePath()
          ctx.stroke()
        } else if (feature.type === 'lake') {
          // Lake texture (wavy lines)
          ctx.strokeStyle = 'rgba(100, 200, 255, 0.4)'
          ctx.lineWidth = 1
          const waveSize = feature.radius * zoom * 0.15
          for (let i = -1; i <= 1; i += 0.5) {
            ctx.beginPath()
            ctx.moveTo(featureX - feature.radius * zoom * 0.6, featureY + i * waveSize * 2)
            ctx.quadraticCurveTo(
              featureX, featureY + i * waveSize * 4,
              featureX + feature.radius * zoom * 0.6, featureY + i * waveSize * 2
            )
            ctx.stroke()
          }
        } else if (feature.type === 'forest') {
          // Forest texture (small circles)
          ctx.fillStyle = 'rgba(70, 160, 70, 0.5)'
          const treeCount = Math.floor(feature.radius * zoom / 3)
          for (let i = 0; i < treeCount; i++) {
            const angle = Math.random() * Math.PI * 2
            const distance = Math.random() * feature.radius * zoom * 0.8
            const treeX = featureX + Math.cos(angle) * distance
            const treeY = featureY + Math.sin(angle) * distance
            ctx.beginPath()
            ctx.arc(treeX, treeY, 2, 0, Math.PI * 2)
            ctx.fill()
          }
        } else if (feature.type === 'landmark') {
          // Landmark texture (star)
          ctx.fillStyle = 'rgba(255, 220, 100, 0.7)'
          const starSize = feature.radius * zoom * 0.5
      ctx.beginPath()
          for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI / 5) - Math.PI / 2
            const x = featureX + Math.cos(angle) * starSize
            const y = featureY + Math.sin(angle) * starSize
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
            
            const innerAngle = angle + Math.PI / 5
            const innerX = featureX + Math.cos(innerAngle) * (starSize * 0.4)
            const innerY = featureY + Math.sin(innerAngle) * (starSize * 0.4)
            ctx.lineTo(innerX, innerY)
          }
          ctx.closePath()
      ctx.fill()
        }
      }
    })
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.2)'
    ctx.lineWidth = 1
    
    // Draw concentric circles
    for (let r = radius * 0.2; r < radius; r += radius * 0.2) {
      ctx.beginPath()
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    // Draw cardinal direction lines
    ctx.beginPath()
    ctx.moveTo(centerX, 0)
    ctx.lineTo(centerX, canvas.height)
    ctx.moveTo(0, centerY)
    ctx.lineTo(canvas.width, centerY)
    ctx.stroke()
    
    // Draw border
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.8)'
    ctx.stroke()
    
    // Add a subtle glow effect around the border
    const glowGradient = ctx.createRadialGradient(
      centerX, centerY, radius * 0.95,
      centerX, centerY, radius * 1.05
    )
    glowGradient.addColorStop(0, 'rgba(100, 180, 255, 0.3)')
    glowGradient.addColorStop(1, 'rgba(100, 180, 255, 0)')
    
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius * 1.05, 0, Math.PI * 2)
    ctx.fillStyle = glowGradient
    ctx.fill()
    
    // Draw player position (scaled by zoom)
    const playerX = centerX + playerPosition.x * zoom
    const playerZ = centerY + playerPosition.z * zoom
    
    // Draw player marker (blue dot with white border)
    ctx.beginPath()
    ctx.arc(playerX, playerZ, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#00BFFF'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'white'
    ctx.stroke()
    
    // Draw direction indicator (small triangle pointing in player's direction)
    ctx.beginPath()
    ctx.moveTo(playerX, playerZ - 8)
    ctx.lineTo(playerX - 4, playerZ - 3)
    ctx.lineTo(playerX + 4, playerZ - 3)
    ctx.closePath()
    ctx.fillStyle = 'white'
    ctx.fill()
    
    // Draw cardinal direction labels
    ctx.font = '10px monospace'
    ctx.fillStyle = 'rgba(200, 230, 255, 0.9)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('N', centerX, 10)
    ctx.fillText('S', centerX, canvas.height - 10)
    ctx.fillText('W', 10, centerY)
    ctx.fillText('E', canvas.width - 10, centerY)
    
  }, [playerPosition, isInitialized, mapSize, zoom, terrainFeatures])
  
  return (
    <div className="z-10 pointer-events-none">
      <div 
        className="relative rounded-full overflow-hidden border-2 border-blue-400/30"
        style={{ 
          width: mapSize, 
          height: mapSize,
          boxShadow: '0 0 10px rgba(0, 100, 255, 0.3), inset 0 0 20px rgba(0, 50, 100, 0.5)'
        }}
      >
      <canvas 
        ref={canvasRef} 
          width={mapSize} 
          height={mapSize}
          className="pixelated"
        />
        
        {/* Mini-map label */}
        <div className="absolute bottom-1 left-0 right-0 text-center">
          <span className="text-xs text-blue-100 font-mono bg-blue-900/70 px-2 py-0.5 rounded-sm">
            MINI MAP
          </span>
        </div>
      </div>
    </div>
  )
}