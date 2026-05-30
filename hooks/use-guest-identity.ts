'use client'

import { useEffect, useState } from 'react'

const GUEST_ID_KEY = 'guest_id'

function readStoredGuestId(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(GUEST_ID_KEY)
    const fallback = (window as any).__guestId
    const value =
      typeof stored === 'string' && stored.trim()
        ? stored
        : typeof fallback === 'string' && fallback.trim()
          ? fallback
          : null

    return value ? value.trim() : null
  } catch {
    try {
      const fallback = (window as any).__guestId
      return typeof fallback === 'string' && fallback.trim() ? fallback.trim() : null
    } catch {
      return null
    }
  }
}

function createGuestId() {
  try {
    return 'guest_' + (window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 12))
  } catch {
    return 'guest_' + Math.random().toString(36).slice(2, 12)
  }
}

function persistGuestId(guestId: string) {
  try {
    ;(window as any).__guestId = guestId
  } catch {}

  try {
    localStorage.setItem(GUEST_ID_KEY, guestId)
  } catch (e) {
    console.warn('Failed to persist guest ID:', e)
  }
}

/**
 * Generate and persist a stable guest identity for wallet-less sessions
 * Pattern from Cock Combat for free lobby access without wallet connection
 */
export function useGuestIdentity() {
  // Synchronously read from localStorage so the ID is available on the very first render.
  const [guestId, setGuestId] = useState<string | null>(() => readStoredGuestId())

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      let existing = readStoredGuestId()

      if (!existing) {
        existing = createGuestId()
      }

      persistGuestId(existing)
      setGuestId(existing)
      console.log('Guest identity:', existing)
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
export function getCurrentPlayerId(
  publicKey?: any,
  guestId?: string | null,
  allowGuest = true,
): string | undefined {
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

    if (!allowGuest) return undefined

    if (typeof guestId === 'string' && guestId.trim()) {
      return guestId.trim()
    }

    // Fallback to guest identity
    const gid = readStoredGuestId()
    if (gid) return gid
  } catch (e) {
    console.warn('Failed to get player ID:', e)
  }

  return undefined
}
