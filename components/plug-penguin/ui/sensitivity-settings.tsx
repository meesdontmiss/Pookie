'use client'

import { useState, useEffect } from 'react'
import { useLocalStorage } from '../hooks/use-local-storage'

interface SensitivitySettingsProps {
  onSensitivityChange: (horizontal: number, vertical: number) => void
  defaultHorizontal?: number
  defaultVertical?: number
}

export function SensitivitySettings({
  onSensitivityChange,
  defaultHorizontal = 2.0,
  defaultVertical = 2.0
}: SensitivitySettingsProps) {
  // Use local storage to persist settings
  const [storedSettings, setStoredSettings] = useLocalStorage('sensitivity-settings', {
    horizontal: defaultHorizontal,
    vertical: defaultVertical,
    showSettings: false
  })
  
  // Local state
  const [horizontalSensitivity, setHorizontalSensitivity] = useState(storedSettings.horizontal)
  const [verticalSensitivity, setVerticalSensitivity] = useState(storedSettings.vertical)
  const [showSettings, setShowSettings] = useState(storedSettings.showSettings)
  
  // Apply settings when they change
  useEffect(() => {
    onSensitivityChange(horizontalSensitivity, verticalSensitivity)
    
    // Save to local storage
    setStoredSettings({
      horizontal: horizontalSensitivity,
      vertical: verticalSensitivity,
      showSettings
    })
  }, [horizontalSensitivity, verticalSensitivity, onSensitivityChange, setStoredSettings, showSettings])
  
  // Handle sensitivity change
  const handleSensitivityChange = (type: 'horizontal' | 'vertical', value: number) => {
    if (type === 'horizontal') {
      setHorizontalSensitivity(value)
    } else {
      setVerticalSensitivity(value)
    }
  }
  
  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(prev => !prev)
  }
  
  return (
    <div className="fixed bottom-20 right-4 z-20">
      {/* Settings button */}
      <button 
        onClick={toggleSettings}
        className="bg-black/70 hover:bg-black/90 text-white px-3 py-2 rounded shadow-lg"
        title="Mouse Sensitivity"
      >
        Mouse Sensitivity
      </button>
      
      {/* Settings panel */}
      {showSettings && (
        <div className="absolute bottom-12 right-0 bg-black/80 rounded shadow-lg p-3 w-64">
          <h3 className="text-white font-bold mb-2 text-center">Mouse Sensitivity</h3>
          
          {/* Horizontal sensitivity */}
          <div className="mb-3">
            <label className="block text-white text-sm mb-1">
              Look Speed: {horizontalSensitivity.toFixed(1)}
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="5.0" 
              step="0.1" 
              value={horizontalSensitivity}
              onChange={(e) => handleSensitivityChange('horizontal', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          {/* Vertical sensitivity */}
          <div className="mb-3">
            <label className="block text-white text-sm mb-1">
              Vertical Look: {verticalSensitivity.toFixed(1)}
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="5.0" 
              step="0.1" 
              value={verticalSensitivity}
              onChange={(e) => handleSensitivityChange('vertical', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          {/* Reset button */}
          <button 
            onClick={() => {
              setHorizontalSensitivity(defaultHorizontal)
              setVerticalSensitivity(defaultVertical)
            }}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-1 px-2 rounded text-sm"
          >
            Reset to Default
          </button>
        </div>
      )}
    </div>
  )
} 