'use client'

import { useState, useEffect } from 'react'

interface CrosshairProps {
  isCharging?: boolean
  power?: number
  forceShow?: boolean
}

export function Crosshair({ isCharging = false, power = 0, forceShow = true }: CrosshairProps) {
  // Always visible now, no need for isVisible state
  
  // Calculate power meter color and width
  const powerColor = power < 0.33 ? '#3b82f6' : power < 0.66 ? '#ffb74d' : '#ef4444'
  const powerWidth = `${Math.min(100, power * 100)}%`
  
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
      {/* Crosshair */}
      <div className="flex flex-col items-center gap-1">
        {/* Crosshair elements - increased opacity and size for better visibility */}
        <div className={`h-4 w-0.5 bg-white ${isCharging ? 'opacity-90' : 'opacity-80'}`} />
        <div className="flex items-center gap-1">
          <div className={`w-4 h-0.5 bg-white ${isCharging ? 'opacity-90' : 'opacity-80'}`} />
          <div className={`w-2 h-2 rounded-full border-2 border-white ${isCharging ? 'bg-white bg-opacity-30' : 'bg-transparent'}`} />
          <div className={`w-4 h-0.5 bg-white ${isCharging ? 'opacity-90' : 'opacity-80'}`} />
        </div>
        <div className={`h-4 w-0.5 bg-white ${isCharging ? 'opacity-90' : 'opacity-80'}`} />
        
        {/* Power meter (only visible when charging) */}
        {isCharging && (
          <div className="mt-2 w-24 h-2 bg-white bg-opacity-30 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-100"
              style={{ 
                width: powerWidth, 
                backgroundColor: powerColor 
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
} 