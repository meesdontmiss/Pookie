'use client'

import { useState, useEffect } from 'react'
import { ChevronUp, ChevronDown, Gamepad2, ChevronLeft, ChevronRight } from 'lucide-react'

export interface ControlsInfo {
  key: string
  action: string
  icon?: string
}

const DEFAULT_CONTROLS: ControlsInfo[] = [
  { key: 'W, A, S, D', action: 'Move' },
  { key: 'Space', action: 'Jump' },
  { key: 'Shift', action: 'Sprint' },
  { key: 'Mouse', action: 'Look' },
  { key: 'Middle Mouse', action: 'Orbit Camera' },
  { key: 'Enter', action: 'Chat' },
  { key: 'Escape', action: 'Exit Pointer Lock' }
]

interface ControlsPanelProps {
  additionalControls?: ControlsInfo[]
  onSensitivityChange?: (value: number) => void
  initialSensitivity?: number
}

export function ControlsPanel({ 
  additionalControls = [],
  onSensitivityChange,
  initialSensitivity = 1.0
}: ControlsPanelProps) {
  // Combine default and additional controls
  const allControls = [...DEFAULT_CONTROLS, ...additionalControls]
  
  // Sensitivity state
  const [sensitivity, setSensitivity] = useState(initialSensitivity)
  const [showSensitivity, setShowSensitivity] = useState(false)
  
  // Collapsed state
  const [isCollapsed, setIsCollapsed] = useState(true) // Start collapsed
  
  // Update sensitivity when initialSensitivity changes
  useEffect(() => {
    setSensitivity(initialSensitivity)
  }, [initialSensitivity])
  
  // Handle sensitivity change
  const handleSensitivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    setSensitivity(value)
    if (onSensitivityChange) {
      onSensitivityChange(value)
    }
  }
  
  // Toggle sensitivity panel
  const toggleSensitivity = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent toggling the whole panel
    setShowSensitivity(prev => !prev)
  }
  
  // Toggle collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(prev => !prev)
  }
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle panel with 'C' key
      if (e.key === 'c' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        toggleCollapsed()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-20">
      {/* Collapse/Expand button */}
      <button 
        className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-full bg-slate-700/80 hover:bg-slate-600/80 p-2 rounded-l-md z-10 transition-colors duration-150"
        onClick={toggleCollapsed}
        aria-label={isCollapsed ? "Expand controls panel" : "Collapse controls panel"}
      >
        {isCollapsed ? <ChevronLeft className="text-white h-5 w-5" /> : <ChevronRight className="text-white h-5 w-5" />}
      </button>
      
      {/* Controls panel */}
      <div className={`bg-slate-800/80 backdrop-blur-sm text-white p-4 rounded-lg shadow-xl transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-0 opacity-0 overflow-hidden pointer-events-none' : 'w-64 opacity-100 pointer-events-auto'
      }`}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Controls</h2>
          {/* Optional: Close button inside the panel if preferred over side toggle when expanded */} 
          {/* <button onClick={toggleCollapsed} className="text-slate-400 hover:text-white"> <X size={18}/> </button> */}
        </div>
        <div className="space-y-1.5 text-sm">
          {allControls.map((control, index) => (
            <div key={index} className="flex justify-between">
              <span className="font-medium text-slate-300">{control.key}</span>
              <span className="text-slate-100">{control.action}</span>
            </div>
          ))}
          <button
            onClick={toggleSensitivity}
            className="w-full text-left mt-3 mb-1 py-1 text-slate-200 hover:text-sky-400 transition-colors text-sm font-medium"
          >
            Mouse Sensitivity {showSensitivity ? <ChevronDown className="inline h-4 w-4 ml-1" /> : <ChevronUp className="inline h-4 w-4 ml-1" />}
          </button>
          
          {showSensitivity && (
            <div className="p-2 bg-slate-700/60 rounded mt-1">
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={sensitivity}
                onChange={handleSensitivityChange}
                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="text-center text-xs mt-1 text-slate-300">{sensitivity.toFixed(1)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 