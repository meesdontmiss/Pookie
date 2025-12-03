'use client'

import { useEffect, useState } from 'react'

/**
 * Generate and persist a stable guest identity for wallet-less sessions
 * Pattern from Cock Combat for free lobby access without wallet connection
 */
export function useGuestIdentity() {
  const [guestId, setGuestId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      // Check for existing guest ID
      let existing = localStorage.getItem('guest_id')
      
      if (!existing) {
        // Generate new guest ID
        const gen = (() => {
          try {
            return 'guest_' + (window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 12))
          } catch {
            return 'guest_' + Math.random().toString(36).slice(2, 12)
          }
        })()
        
        existing = gen
        
        try {
          localStorage.setItem('guest_id', existing)
        } catch (e) {
          console.warn('Failed to persist guest ID:', e)
        }
      }
      
      // Store in window for global access
      try {
        (window as any).__guestId = existing
      } catch {}
      
      setGuestId(existing)
      console.log('🎭 Guest identity:', existing)
    } catch (e) {
      console.error('Failed to initialize guest identity:', e)
    }
  }, [])

  return guestId
}

/**
 * Get current player identifier (wallet or guest ID)
 * Matches Cock Combat's getCurrentPlayerId pattern
 */
export function getCurrentPlayerId(publicKey?: any): string | undefined {
  try {
    // Try wallet first
    if (publicKey) {
      if (typeof (publicKey as any).toBase58 === 'function') {
        return (publicKey as any).toBase58()
      }
      if (typeof (publicKey as any).toString === 'function') {
        return (publicKey as any).toString()
      }
    }
    
    // Fallback to guest identity
    if (typeof window !== 'undefined') {
      const gid = localStorage.getItem('guest_id') || (window as any).__guestId
      if (gid && typeof gid === 'string') {
        return gid
      }
    }
  } catch (e) {
    console.warn('Failed to get player ID:', e)
  }
  
  return undefined
}

