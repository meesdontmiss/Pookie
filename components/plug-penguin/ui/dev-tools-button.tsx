'use client'

import { useState, useEffect } from 'react'
import { Settings2, X, Eye, Box, Layers, Map, MousePointer, Edit3, Grid, Camera } from 'lucide-react'
import Link from 'next/link'
import * as THREE from 'three'

// Import the collision visualization context
import { useCollisionVisualization } from '@/components/game/collision-visualization-context'
import { useCollisionEditor } from '@/components/game/collision-editor-context'

interface DevToolsButtonProps {
  className?: string
  onSensitivityChange?: (value: number) => void
  initialSensitivity?: number
  playerPosition?: THREE.Vector3
  isEditorMode?: boolean
  onEditorModeToggle?: () => void
  onFreeCameraModeChange?: (enabled: boolean) => void
}

export function DevToolsButton({ 
  className,
  onSensitivityChange,
  initialSensitivity = 1.0,
  playerPosition = new THREE.Vector3(),
  isEditorMode = false,
  onEditorModeToggle,
  onFreeCameraModeChange
}: DevToolsButtonProps) {
  const [showDevTools, setShowDevTools] = useState(false)
  const [sensitivity, setSensitivity] = useState(initialSensitivity)
  const [showSensitivitySettings, setShowSensitivitySettings] = useState(false)
  const [isFreeCameraMode, setIsFreeCameraMode] = useState(false)
  
  // Use the collision visualization context
  const { 
    isEnabled, 
    setEnabled, 
    showDebug, 
    toggleDebug
  } = useCollisionVisualization()
  
  // Use the collision editor context
  const {
    showGrid,
    setShowGrid,
    gridSize,
    setGridSize
  } = useCollisionEditor()
  
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
  
  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Toggle debug mode with 'F3' key
      if (e.key === 'F3') {
        toggleDebug()
      }
      // Toggle visualization with 'F4' key
      if (e.key === 'F4') {
        setEnabled(!isEnabled)
      }
      // Toggle dev tools with backtick key
      if (e.key === '`') {
        setShowDevTools(prev => !prev)
      }
      // Toggle editor mode with 'F6' key
      if (e.key === 'F6' && onEditorModeToggle) {
        onEditorModeToggle()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [toggleDebug, setEnabled, isEnabled, onEditorModeToggle])

  // Update free camera mode
  useEffect(() => {
    if (onFreeCameraModeChange) {
      onFreeCameraModeChange(isFreeCameraMode)
    }
  }, [isFreeCameraMode, onFreeCameraModeChange])

  return (
    <div 
      className="ui-element dev-tools-button"
      data-no-engage="true"
    >
      {/* Floating button - removed fixed positioning */}
      <button
        onClick={() => setShowDevTools(!showDevTools)}
        className={`p-3 rounded-full shadow-lg transition-all duration-200 z-50 ${
          showDevTools ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-900 hover:bg-blue-800'
        } text-white`}
        style={{
          boxShadow: '0 0 10px rgba(0, 100, 255, 0.5)'
        }}
        data-no-engage="true"
      >
        {showDevTools ? (
          <X className="w-5 h-5" />
        ) : (
          <Settings2 className="w-5 h-5" />
        )}
      </button>

      {/* Status indicators (only shown when panel is closed) */}
      {!showDevTools && (
        <div className="absolute top-16 left-0 flex flex-col gap-2 z-50" data-no-engage="true">
          {isEnabled && (
            <div className="bg-blue-900 text-white px-2 py-1 rounded-md text-sm flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              Collision View
            </div>
          )}
          {showDebug && (
            <div className="bg-blue-900 text-white px-2 py-1 rounded-md text-sm flex items-center">
              <Box className="w-4 h-4 mr-1" />
              Debug Mode
            </div>
          )}
          {isEditorMode && (
            <div className="bg-yellow-600 text-white px-2 py-1 rounded-md text-sm flex items-center">
              <Edit3 className="w-4 h-4 mr-1" />
              Editor Mode
            </div>
          )}
        </div>
      )}

      {/* Dev Tools Panel */}
      {showDevTools && (
        <div className="absolute top-0 left-0 bg-black/80 text-white p-4 rounded-lg shadow-lg w-64 z-50 dev-tools" data-no-engage="true">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Dev Tools</h2>
            <button 
              onClick={() => setShowDevTools(false)}
              className="text-gray-400 hover:text-white"
              data-no-engage="true"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Camera Controls Section */}
            <div className="border-b border-gray-700 pb-4">
              <h3 className="text-md font-semibold mb-2 flex items-center">
                <Camera size={16} className="mr-2" />
                Camera Controls
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    const newMode = !isFreeCameraMode
                    setIsFreeCameraMode(newMode)
                    if (onFreeCameraModeChange) onFreeCameraModeChange(newMode)
                  }}
                  className={`w-full px-3 py-2 rounded-md flex items-center justify-between ${
                    isFreeCameraMode ? 'bg-blue-600' : 'bg-gray-700'
                  } hover:bg-blue-500 transition-colors`}
                  data-no-engage="true"
                >
                  <span className="flex items-center">
                    <Camera size={16} className="mr-2" />
                    Free Camera
                  </span>
                  <span className={`text-xs ${isFreeCameraMode ? 'text-blue-200' : 'text-gray-400'}`}>
                    {isFreeCameraMode ? 'Enabled' : 'Disabled'}
                  </span>
                </button>
                
                {isFreeCameraMode && (
                  <div className="text-xs text-gray-400 pl-2 border-l-2 border-gray-700">
                    WASD - Move<br />
                    Space/C - Up/Down<br />
                    Left Click + Drag - Rotate (horizontal or vertical)<br />
                    Shift + Left Click + Drag - Move Camera (horizontal or vertical)<br />
                    Scroll Wheel - Zoom In/Out<br />
                    Shift - Speed Boost
                  </div>
                )}
              </div>
            </div>

            {/* Collision Visualization Section */}
            <div className="border-b border-gray-700 pb-4">
              <h3 className="text-md font-semibold mb-2 flex items-center">
                <Box size={16} className="mr-2" />
                Collision Visualization
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm">Show Colliders</label>
                  <div 
                    className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${isEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
                    onClick={() => setEnabled(!isEnabled)}
                    data-no-engage="true"
                  >
                    <div 
                      className={`w-4 h-4 bg-white rounded-full transform transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                      style={{ marginTop: '2px' }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm">Debug Mode</label>
                  <div 
                    className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${showDebug ? 'bg-red-500' : 'bg-gray-600'}`}
                    onClick={toggleDebug}
                    data-no-engage="true"
                  >
                    <div 
                      className={`w-4 h-4 bg-white rounded-full transform transition-transform ${showDebug ? 'translate-x-5' : 'translate-x-1'}`}
                      style={{ marginTop: '2px' }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sensitivity Settings Section */}
            <div className="border-b border-gray-700 pb-4">
              <h3 
                className="text-md font-semibold mb-2 flex items-center cursor-pointer"
                onClick={() => setShowSensitivitySettings(!showSensitivitySettings)}
                data-no-engage="true"
              >
                <MousePointer size={16} className="mr-2" />
                Mouse Sensitivity
                <span className="ml-2 text-xs">{showSensitivitySettings ? '▼' : '►'}</span>
              </h3>
              
              {showSensitivitySettings && (
                <div className="mt-3 p-2 bg-gray-800 rounded">
                  <label className="block text-sm mb-2 font-bold text-center">
                    Sensitivity: {sensitivity.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={sensitivity}
                    onChange={handleSensitivityChange}
                    className="w-full h-3 bg-blue-600 rounded-lg appearance-none cursor-pointer"
                    data-no-engage="true"
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span>Slower (0.5)</span>
                    <span>Default (1.0)</span>
                    <span>Faster (3.0)</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Collision Editor Section */}
            <div className="border-b border-gray-700 pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-semibold flex items-center">
                  <Edit3 size={16} className="mr-2" />
                  Collision Editor
                </h3>
                <div 
                  className={`w-10 h-5 rounded-full cursor-pointer transition-colors ${isEditorMode ? 'bg-yellow-500' : 'bg-gray-600'}`}
                  onClick={onEditorModeToggle}
                  data-no-engage="true"
                >
                  <div 
                    className={`w-4 h-4 bg-white rounded-full transform transition-transform ${isEditorMode ? 'translate-x-5' : 'translate-x-1'}`}
                    style={{ marginTop: '2px' }}
                  />
                </div>
              </div>
              
              {isEditorMode && (
                <div className="mt-3 space-y-3">
                  {/* Grid Controls */}
                  <div className="p-2 bg-gray-800 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm flex items-center">
                        <Grid size={14} className="mr-1" />
                        Show Grid
                      </label>
                      <div 
                        className={`w-8 h-4 rounded-full cursor-pointer transition-colors ${showGrid ? 'bg-blue-500' : 'bg-gray-600'}`}
                        onClick={() => setShowGrid(!showGrid)}
                        data-no-engage="true"
                      >
                        <div 
                          className={`w-3 h-3 bg-white rounded-full transform transition-transform ${showGrid ? 'translate-x-4' : 'translate-x-1'}`}
                          style={{ marginTop: '2px' }}
                        />
                      </div>
                    </div>

                    {showGrid && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs mb-1">Grid Size: {gridSize}</label>
                          <input
                            type="range"
                            min="20"
                            max="200"
                            step="20"
                            value={gridSize}
                            onChange={(e) => setGridSize(Number(e.target.value))}
                            className="w-full h-2 bg-blue-600 rounded-lg appearance-none cursor-pointer"
                            data-no-engage="true"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Collision Testing Link */}
            <div className="border-b border-gray-700 pb-4">
              <h3 className="text-md font-semibold mb-2 flex items-center">
                <Map size={16} className="mr-2" />
                Collision Testing
              </h3>
              
              <div className="space-y-2">
                <Link href="/collision-testing" className="block" data-no-engage="true">
                  <button 
                    className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    data-no-engage="true"
                  >
                    Collision Testing Page
                  </button>
                </Link>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div>
              <h3 className="text-md font-semibold mb-2 flex items-center">
                <Settings2 size={16} className="mr-2" />
                Keyboard Shortcuts
              </h3>
              
              <ul className="text-xs space-y-1">
                <li className="flex justify-between">
                  <span>Toggle Dev Tools</span>
                  <kbd className="bg-gray-700 px-2 rounded">` (Backtick)</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Toggle Debug Mode</span>
                  <kbd className="bg-gray-700 px-2 rounded">F3</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Toggle Visualization</span>
                  <kbd className="bg-gray-700 px-2 rounded">F4</kbd>
                </li>
                <li className="flex justify-between">
                  <span>Toggle Editor Mode</span>
                  <kbd className="bg-gray-700 px-2 rounded">F6</kbd>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 