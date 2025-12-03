"use client"

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'

// Define audio types
export type AudioType = 'backgroundMusic' | 'gameMusic' | 'notification' | 'buttonClick' | 'connectWallet' | 'playerJoin'

// Define audio state interface
export interface AudioState {
  isPlaying: boolean
  volume: number
  isMuted: boolean
}

interface AudioContextType {
  playSound: (type: AudioType) => void
  stopSound: (type: AudioType) => void
  setVolume: (type: AudioType, volume: number) => void
  toggleMute: (type?: AudioType) => void
  isMuted: boolean
}

const AudioContext = createContext<AudioContextType | null>(null)

// Map audio types to file paths
const audioFiles: Record<AudioType, string> = {
  backgroundMusic: '/audio/background-music.mp3',
  gameMusic: '/audio/game-music.mp3',
  notification: '/audio/notification.mp3',
  buttonClick: '/audio/button-click.mp3',
  connectWallet: '/audio/connect-wallet.mp3',
  playerJoin: '/audio/player-join.mp3'
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const audioRefs = useRef<Record<AudioType, HTMLAudioElement | null>>({
    backgroundMusic: null,
    gameMusic: null,
    notification: null,
    buttonClick: null,
    connectWallet: null,
    playerJoin: null
  })
  
  // Initialize audio elements
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Create audio elements for each type
    Object.keys(audioFiles).forEach((type) => {
      const audio = new Audio()
      audio.volume = type.includes('Music') ? 0.5 : 0.7
      audio.loop = type.includes('Music')
      audioRefs.current[type as AudioType] = audio
    })
    
    setIsInitialized(true)
    
    // Cleanup function
    return () => {
      Object.keys(audioRefs.current).forEach((type) => {
        if (audioRefs.current[type as AudioType]) {
          audioRefs.current[type as AudioType]!.pause()
          audioRefs.current[type as AudioType] = null
        }
      })
    }
  }, [])
  
  // Handle mute state changes
  useEffect(() => {
    if (!isInitialized) return
    
    Object.keys(audioRefs.current).forEach((type) => {
      if (audioRefs.current[type as AudioType]) {
        audioRefs.current[type as AudioType]!.muted = isMuted
      }
    })
  }, [isMuted, isInitialized])
  
  const playSound = (type: AudioType) => {
    if (!isInitialized || !audioRefs.current[type]) return
    
    try {
      const audio = audioRefs.current[type]!
      
      // For background music, stop other music first
      if (type.includes('Music')) {
        Object.keys(audioRefs.current).forEach((key) => {
          if (key.includes('Music') && key !== type && audioRefs.current[key as AudioType]) {
            audioRefs.current[key as AudioType]!.pause()
          }
        })
      }
      
      // Reset the audio to start
      audio.pause()
      audio.currentTime = 0
      
      // Set the source if not already set
      if (!audio.src || !audio.src.includes(audioFiles[type])) {
        audio.src = audioFiles[type]
        audio.load()
      }
      
      // Play the sound
      const playPromise = audio.play()
      
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.log(`Sound playback failed: ${error}`)
        })
      }
    } catch (error) {
      console.error(`Error playing ${type} sound:`, error)
    }
  }
  
  const stopSound = (type: AudioType) => {
    if (!isInitialized || !audioRefs.current[type]) return
    audioRefs.current[type]!.pause()
  }
  
  const setVolume = (type: AudioType, volume: number) => {
    if (!isInitialized || !audioRefs.current[type]) return
    audioRefs.current[type]!.volume = Math.max(0, Math.min(1, volume))
  }
  
  const toggleMute = (type?: AudioType) => {
    if (type) {
      // Toggle mute for specific sound
      if (!isInitialized || !audioRefs.current[type]) return
      audioRefs.current[type]!.muted = !audioRefs.current[type]!.muted
    } else {
      // Toggle global mute
      setIsMuted((prev) => !prev)
    }
  }
  
  return (
    <AudioContext.Provider value={{ playSound, stopSound, setVolume, toggleMute, isMuted }}>
      {children}
    </AudioContext.Provider>
  )
}

export function useAudioContext() {
  const context = useContext(AudioContext)
  if (!context) {
    throw new Error('useAudioContext must be used within an AudioProvider')
  }
  return context
} 