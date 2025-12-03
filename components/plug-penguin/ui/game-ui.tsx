'use client'

import { useState, useEffect } from 'react'
import { UI_CONSTANTS } from '../utils/constants'
import { SettingsMenu } from './settings-menu'
import { WinterChat } from './winter-chat'
import { ControlsPanel, ControlsInfo } from './controls-panel'

// Create a global event system for sensitivity changes
export const SensitivityEvent = {
  emit: (value: number) => {
    window.dispatchEvent(new CustomEvent('sensitivityChange', { detail: value }))
  }
}

interface GameUIProps {
  onSensitivityChange?: (value: number) => void
  initialSensitivity?: number
  additionalControls?: ControlsInfo[]
}

export function GameUI({
  onSensitivityChange,
  initialSensitivity = 1.0,
  additionalControls
}: GameUIProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fps, setFps] = useState(0)
  const [showDebug, setShowDebug] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [sensitivity, setSensitivity] = useState(initialSensitivity)
  const [isInstructionsHovered, setIsInstructionsHovered] = useState(false)
  const [isInstructionsVisible, setIsInstructionsVisible] = useState(true)

  // Show instructions when user presses H key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') {
        setShowInstructions(true)
        setTimeout(() => {
          setShowInstructions(false)
        }, UI_CONSTANTS?.CONTROLS_HELP_TIMEOUT || 5000)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Add fade-out effect for instructions
  useEffect(() => {
    if (!isInstructionsHovered && showInstructions) {
      const timer = setTimeout(() => {
        setShowInstructions(false)
        setIsInstructionsVisible(false)
      }, UI_CONSTANTS.CONTROLS_HELP_TIMEOUT)
      
      return () => clearTimeout(timer)
    }
  }, [isInstructionsHovered])

  // Handle H key press to toggle instructions
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        setShowInstructions(true)
        setIsInstructionsVisible(true)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Handle sensitivity change
  const handleSensitivityChange = (value: number) => {
    setSensitivity(value)
    SensitivityEvent.emit(value)
    if (onSensitivityChange) {
      onSensitivityChange(value)
    }
  }

  // Calculate FPS
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    
    const calculateFps = () => {
      const now = performance.now()
      const delta = now - lastTime
      
      if (delta >= 1000) {
        setFps(Math.round((frameCount * 1000) / delta))
        frameCount = 0
        lastTime = now
      }
      
      frameCount++
      requestAnimationFrame(calculateFps)
    }
    
    const animationId = requestAnimationFrame(calculateFps)
    
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  // Toggle debug info with F3 key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        setShowDebug(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <>
      {/* Crosshair */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
        <div className="w-2 h-2 rounded-full bg-white opacity-70 shadow-[0_0_4px_rgba(0,0,0,0.5)]" />
      </div>

      {/* Game instructions overlay */}
      {showInstructions && (
        <div 
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white p-6 rounded-lg max-w-md text-center transition-opacity duration-300 z-20 ${isInstructionsVisible ? 'opacity-100' : 'opacity-0'}`}
          onMouseEnter={() => setIsInstructionsHovered(true)}
          onMouseLeave={() => setIsInstructionsHovered(false)}
          style={{ pointerEvents: isInstructionsVisible ? 'auto' : 'none' }}
        >
          <h2 className="text-xl font-bold mb-2">Welcome to Plug Penguin!</h2>
          <p className="mb-4">Click on the game to lock your cursor and enable full 3D controls.</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-bold">Movement</p>
              <p>W, A, S, D keys</p>
            </div>
            <div>
              <p className="font-bold">Sprint</p>
              <p>Hold Shift key</p>
            </div>
            <div>
              <p className="font-bold">Look Around</p>
              <p>Move your mouse</p>
            </div>
            <div>
              <p className="font-bold">Jump</p>
              <p>Press Spacebar</p>
            </div>
            <div>
              <p className="font-bold">Debug Info</p>
              <p>Press F3</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-300">Press H to show these instructions again</p>
        </div>
      )}

      {/* Debug info */}
      {showDebug && (
        <div className="absolute top-2 left-2 bg-black/50 text-white p-2 rounded text-sm z-10">
          <p>FPS: {fps}</p>
        </div>
      )}

      {/* Game Chat */}
      <div className="absolute bottom-20 left-4 right-4 max-w-md mx-auto">
        <WinterChat username={`Penguin_${Math.floor(Math.random() * 1000)}`} maxMessages={5} />
      </div>

      {/* Bottom UI container */}
      <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-10">
        <div className="flex items-center gap-4">
          {/* Left side elements */}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Center elements */}
        </div>
        
        <div className="flex items-center gap-12">
          {/* Controls Panel */}
          <div>
            <ControlsPanel 
              onSensitivityChange={handleSensitivityChange}
              initialSensitivity={sensitivity}
              additionalControls={additionalControls}
            />
          </div>
        </div>
      </div>

      {/* Settings Menu */}
      <SettingsMenu 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSensitivityChange={handleSensitivityChange}
        initialSensitivity={sensitivity}
      />
    </>
  )
}