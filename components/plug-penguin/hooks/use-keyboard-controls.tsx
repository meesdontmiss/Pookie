'use client'

import { useState, useEffect, useCallback } from 'react'

export interface KeyState {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
  jump: boolean
  shift: boolean
  trick1: boolean
  trick2: boolean
  action: boolean
}

// Create a global state for chat input focus that can be accessed across components
export let isChatInputFocused = false

// Function to set the chat input focus state
export function setChatInputFocus(focused: boolean) {
  isChatInputFocused = focused
  // Make it globally accessible too
  if (typeof window !== 'undefined') {
    (window as any).isChatInputFocused = focused
  }
  console.log('Chat input focus set to:', focused)
}

export function useKeyboardControls() {
  const [keys, setKeys] = useState<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    shift: false,
    trick1: false,
    trick2: false,
    action: false
  })

  // Listen for chat input state changes
  useEffect(() => {
    const handleChatInputStateChanged = (e: CustomEvent) => {
      const focused = e.detail?.focused || false
      
      // If chat is focused, reset all keys to prevent "stuck" keys
      if (focused) {
        setKeys({
          forward: false,
          backward: false,
          left: false,
          right: false,
          jump: false,
          shift: false,
          trick1: false,
          trick2: false,
          action: false
        })
        
        console.log('Keyboard controls reset due to chat focus')
      }
    }
    
    window.addEventListener('chatInputStateChanged', handleChatInputStateChanged as EventListener)
    return () => {
      window.removeEventListener('chatInputStateChanged', handleChatInputStateChanged as EventListener)
    }
  }, [])

  // Optimized getKeys with useCallback
  const getKeys = useCallback(() => {
    // If chat input is focused, return all keys as false to prevent movement
    if (isChatInputFocused) {
      return {
        forward: false,
        backward: false,
        left: false,
        right: false,
        jump: false,
        shift: false,
        trick1: false,  // Also disable trick keys
        trick2: false,  // Also disable trick keys
        action: false   // Also disable action key
      }
    }
    return keys
  }, [keys])

  // Subscribe to keyboard state changes
  const subscribe = useCallback((callback: (state: KeyState) => void) => {
    const unsubscribe = () => {
      // This would normally remove the callback from a list of subscribers
      // For simplicity, we're just returning a no-op function
    }
    return unsubscribe
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      
      // Skip ALL keyboard shortcuts when chat is focused, not just movement keys
      if (isChatInputFocused) {
        // Don't process any game keys when chat is open
        return
      }
      
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys(prev => ({ ...prev, forward: true }))
          break
        case 'KeyS':
        case 'ArrowDown':
          setKeys(prev => ({ ...prev, backward: true }))
          break
        case 'KeyA':
        case 'ArrowLeft':
          setKeys(prev => ({ ...prev, left: true }))
          break
        case 'KeyD':
        case 'ArrowRight':
          setKeys(prev => ({ ...prev, right: true }))
          break
        case 'Space':
          setKeys(prev => ({ ...prev, jump: true }))
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          setKeys(prev => ({ ...prev, shift: true }))
          break
        case 'KeyQ':
          setKeys(prev => ({ ...prev, trick1: true }))
          break
        case 'KeyE':
          setKeys(prev => ({ ...prev, trick2: true }))
          break
        case 'KeyF':
          setKeys(prev => ({ ...prev, action: true }))
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Always process key up events to ensure keys don't get "stuck"
      // But keep the actual movement disabled via getKeys() when chat is focused
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          setKeys(prev => ({ ...prev, forward: false }))
          break
        case 'KeyS':
        case 'ArrowDown':
          setKeys(prev => ({ ...prev, backward: false }))
          break
        case 'KeyA':
        case 'ArrowLeft':
          setKeys(prev => ({ ...prev, left: false }))
          break
        case 'KeyD':
        case 'ArrowRight':
          setKeys(prev => ({ ...prev, right: false }))
          break
        case 'Space':
          setKeys(prev => ({ ...prev, jump: false }))
          break
        case 'ShiftLeft':
        case 'ShiftRight':
          setKeys(prev => ({ ...prev, shift: false }))
          break
        case 'KeyQ':
          setKeys(prev => ({ ...prev, trick1: false }))
          break
        case 'KeyE':
          setKeys(prev => ({ ...prev, trick2: false }))
          break
        case 'KeyF':
          setKeys(prev => ({ ...prev, action: false }))
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return [subscribe, getKeys] as const
}

export default useKeyboardControls 