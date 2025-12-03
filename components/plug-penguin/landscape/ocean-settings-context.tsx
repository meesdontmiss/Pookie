'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Define the ocean settings interface
export interface OceanSettings {
  waterColor: string
  distortionScale: number
  waveSpeed: number
  depth: number
  size: number
  position: [number, number, number]
}

// Default ocean settings
export const defaultOceanSettings: OceanSettings = {
  waterColor: '#a3d9ff',
  distortionScale: 1.2,
  waveSpeed: 0.2,
  depth: 15,
  size: 600,
  position: [0, -0.6, 0]
}

// Create the context
interface OceanSettingsContextType {
  settings: OceanSettings
  updateSettings: (newSettings: Partial<OceanSettings>) => void
  resetSettings: () => void
  saveSettings: () => void
  isInitialized: boolean
}

const OceanSettingsContext = createContext<OceanSettingsContextType | null>(null)

// Provider component
export function OceanSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<OceanSettings>(defaultOceanSettings)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('arctic-ocean-settings')
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings)
        console.log('Loaded ocean settings from localStorage:', parsedSettings)
        
        // Validate the loaded settings to ensure they have all required properties
        const validatedSettings = {
          ...defaultOceanSettings, // Start with defaults
          ...parsedSettings, // Override with saved values
          // Ensure position is an array with 3 elements
          position: Array.isArray(parsedSettings.position) && parsedSettings.position.length === 3
            ? parsedSettings.position
            : defaultOceanSettings.position
        }
        
        setSettings(validatedSettings)
      } else {
        console.log('No saved ocean settings found, using defaults')
      }
    } catch (error) {
      console.error('Failed to load ocean settings:', error)
      // Use defaults on error
      setSettings(defaultOceanSettings)
    } finally {
      setIsInitialized(true)
    }
  }, [])
  
  // Update settings
  const updateSettings = (newSettings: Partial<OceanSettings>) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        ...newSettings
      }
      console.log('Updated ocean settings:', updated)
      return updated
    })
  }
  
  // Reset to defaults
  const resetSettings = () => {
    setSettings(defaultOceanSettings)
    console.log('Reset ocean settings to defaults')
    
    // Also save the defaults to localStorage
    try {
      localStorage.setItem('arctic-ocean-settings', JSON.stringify(defaultOceanSettings))
    } catch (error) {
      console.error('Failed to save default ocean settings:', error)
    }
  }
  
  // Save settings to localStorage
  const saveSettings = () => {
    try {
      localStorage.setItem('arctic-ocean-settings', JSON.stringify(settings))
      console.log('Ocean settings saved successfully:', settings)
    } catch (error) {
      console.error('Failed to save ocean settings:', error)
    }
  }
  
  return (
    <OceanSettingsContext.Provider value={{ 
      settings, 
      updateSettings, 
      resetSettings, 
      saveSettings,
      isInitialized
    }}>
      {children}
    </OceanSettingsContext.Provider>
  )
}

// Custom hook to use the context
export function useOceanSettings() {
  const context = useContext(OceanSettingsContext)
  if (!context) {
    throw new Error('useOceanSettings must be used within an OceanSettingsProvider')
  }
  return context
} 