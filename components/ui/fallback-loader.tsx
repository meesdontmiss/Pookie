'use client'

import React, { useEffect, useRef } from 'react'

interface FallbackLoaderProps {
  size?: number
  color?: string
  backgroundColor?: string
}

/**
 * Creates a canvas-based animated loading spinner as a fallback
 * in case the GIF file is not available
 */
export function FallbackLoader({
  size = 120,
  color = '#ff3333',
  backgroundColor = 'transparent'
}: FallbackLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Set canvas size
    canvas.width = size
    canvas.height = size
    
    // Center of the canvas
    const centerX = size / 2
    const centerY = size / 2
    
    // Outer radius of the spinner
    const outerRadius = (size / 2) * 0.8
    
    // Animation variables
    let rotation = 0
    const rotationSpeed = 0.1
    
    // Function to draw a frame of the spinner
    const drawSpinner = () => {
      // Clear canvas
      ctx.clearRect(0, 0, size, size)
      
      // Draw background if needed
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, size, size)
      }
      
      // Draw spinner segments
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12 + rotation
        const x = centerX + Math.cos(angle) * outerRadius
        const y = centerY + Math.sin(angle) * outerRadius
        
        // Calculate opacity based on position (makes it look like it's spinning)
        const opacity = (i / 12)
        
        // Draw segment
        ctx.beginPath()
        ctx.arc(x, y, size * 0.06, 0, Math.PI * 2)
        ctx.fillStyle = `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`
        ctx.fill()
      }
      
      // Update rotation for animation
      rotation += rotationSpeed
      if (rotation >= Math.PI * 2) {
        rotation = 0
      }
      
      // Request next frame
      requestAnimationFrame(drawSpinner)
    }
    
    // Start animation
    const animationId = requestAnimationFrame(drawSpinner)
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [size, color, backgroundColor])
  
  return <canvas ref={canvasRef} width={size} height={size} style={{ width: size, height: size }} />
} 