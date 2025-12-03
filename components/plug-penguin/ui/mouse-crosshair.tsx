'use client'

import { useState, useEffect } from 'react'

interface MouseCrosshairProps {
  // Removed charging props
}

export function MouseCrosshair({}: MouseCrosshairProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  
  // Track mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])
  
  return (
    <div 
      className="fixed pointer-events-none z-50"
      style={{ 
        left: `${mousePosition.x}px`, 
        top: `${mousePosition.y}px`,
        transform: 'translate(-50%, -50%)' // Center on mouse cursor
      }}
    >
      {/* Crosshair */}
      <div className="flex flex-col items-center gap-1">
        {/* Crosshair elements */}
        <div className="h-4 w-0.5 bg-white opacity-80" />
        <div className="flex items-center gap-1">
          <div className="w-4 h-0.5 bg-white opacity-80" />
          <div className="w-2 h-2 rounded-full border-2 border-white bg-transparent" />
          <div className="w-4 h-0.5 bg-white opacity-80" />
        </div>
        <div className="h-4 w-0.5 bg-white opacity-80" />
      </div>
    </div>
  )
} 