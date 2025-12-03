'use client'

import { useState, useEffect } from 'react'

interface SettingsMenuProps {
  isOpen: boolean
  onClose: () => void
  onSensitivityChange: (value: number) => void
  initialSensitivity?: number
}

export function SettingsMenu({ 
  isOpen, 
  onClose, 
  onSensitivityChange,
  initialSensitivity = 1.0
}: SettingsMenuProps) {
  const [sensitivity, setSensitivity] = useState(initialSensitivity)
  
  // Apply sensitivity change when slider is adjusted
  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    setSensitivity(newValue)
    onSensitivityChange(newValue)
  }
  
  // Handle escape key to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      <div className="bg-black/80 absolute inset-0" onClick={onClose}></div>
      
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg w-80 z-10 border border-blue-400">
        <h2 className="text-2xl font-bold text-blue-300 mb-4">Settings</h2>
        
        <div className="mb-6">
          <label className="block text-blue-200 mb-2">
            Camera Sensitivity: {sensitivity.toFixed(1)}
          </label>
          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={sensitivity}
            onChange={handleSensitivityChange}
            className="w-full h-2 bg-blue-900 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-blue-400 mt-1">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 