'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface LobbyCounts {
  [lobbyId: string]: {
    liveHumans: number
    liveTotal: number
  }
}

/**
 * Subscribe to live lobby player counts from socket server
 * Pattern from Cock Combat for real-time lobby occupancy display
 */
export function useLobbyCounts() {
  const [counts, setCounts] = useState<LobbyCounts>({})
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4001'
    const isProd = process.env.NODE_ENV === 'production'
    const transports = isProd ? ['websocket'] : ['polling', 'websocket']

    const s = io(socketUrl, {
      path: process.env.NEXT_PUBLIC_SOCKET_PATH || '/socket.io',
      transports,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    })

    s.on('connect', () => {
      console.log('✅ Lobby counts socket connected')
      // Request initial snapshot
      s.emit('get_lobby_counts')
    })

    // Incremental update for single lobby
    s.on('lobby_counts', (payload: { id: string; liveHumans: number; liveTotal: number }) => {
      try {
        const { id, liveHumans, liveTotal } = payload || {}
        if (!id) return
        setCounts(prev => ({
          ...prev,
          [id]: {
            liveHumans: Number(liveHumans) || 0,
            liveTotal: Number(liveTotal) || 0,
          },
        }))
      } catch (e) {
        console.warn('Failed to process lobby_counts:', e)
      }
    })

    // Full snapshot of all lobbies
    s.on('lobby_counts_snapshot', (payload: { counts: LobbyCounts }) => {
      try {
        const map = (payload && payload.counts) || {}
        setCounts(map)
      } catch (e) {
        console.warn('Failed to process lobby_counts_snapshot:', e)
      }
    })

    s.on('disconnect', () => {
      console.log('❌ Lobby counts socket disconnected')
    })

    setSocket(s)

    return () => {
      s.off('lobby_counts')
      s.off('lobby_counts_snapshot')
      s.disconnect()
    }
  }, [])

  return counts
}

