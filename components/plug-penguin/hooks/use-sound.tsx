'use client'

import { useState, useEffect, useRef } from 'react'

interface SoundOptions {
  volume?: number
  loop?: boolean
  autoplay?: boolean
}

interface SoundControls {
  play: () => void
  stop: () => void
  pause: () => void
  isPlaying: boolean
}

export function useSound(url: string, options: SoundOptions = {}): SoundControls {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  
  useEffect(() => {
    // Create audio element
    const audio = new Audio(url)
    
    // Set options
    audio.volume = options.volume !== undefined ? options.volume : 1
    audio.loop = options.loop || false
    
    // Store reference
    audioRef.current = audio
    
    // Auto-play if requested
    if (options.autoplay) {
      audio.play().catch(err => {
        console.warn('Auto-play was prevented:', err)
      })
    }
    
    // Clean up on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [url, options.volume, options.loop, options.autoplay])
  
  // Play function with automatic replay support
  const play = () => {
    if (!audioRef.current) return
    
    // If already playing, reset and play again
    if (isPlaying) {
      audioRef.current.currentTime = 0
    } else {
      audioRef.current.play().catch(err => {
        console.warn('Sound play was prevented:', err)
      })
      setIsPlaying(true)
    }
    
    // Add ended event listener to update playing state
    audioRef.current.onended = () => {
      setIsPlaying(false)
    }
  }
  
  // Stop function
  const stop = () => {
    if (!audioRef.current) return
    
    audioRef.current.pause()
    audioRef.current.currentTime = 0
    setIsPlaying(false)
  }
  
  // Pause function
  const pause = () => {
    if (!audioRef.current) return
    
    audioRef.current.pause()
    setIsPlaying(false)
  }
  
  return {
    play,
    stop,
    pause,
    isPlaying
  }
} 