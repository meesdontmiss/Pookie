'use client'

import { io, Socket } from 'socket.io-client'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ClientToServer, ServerToClient, UIRoomPlayer } from '@/shared/contracts'

export interface LobbySocketState {
  players: UIRoomPlayer[]
  countdown: number | null
  status: 'open' | 'countdown'
  connected: boolean
  error?: string
}

export function useLobbySocket(lobbyId: string | null, username: string | null, wallet: string | null, isPractice: boolean = false) {
  const [state, setState] = useState<LobbySocketState>({ players: [], countdown: null, status: 'open', connected: false })
  const socketRef = useRef<Socket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const url = useMemo(() => {
    // Prefer explicit env; fallback to current origin on client; dev fallback to localhost
    if (process.env.NEXT_PUBLIC_SOCKET_URL) return process.env.NEXT_PUBLIC_SOCKET_URL
    if (typeof window !== 'undefined') return window.location.origin
    return 'http://localhost:4001'
  }, [])

  useEffect(() => {
    if (!lobbyId) return
    
    const isProd = process.env.NODE_ENV === 'production'
    const primaryPath = process.env.NEXT_PUBLIC_SOCKET_PATH || '/socket.io'
    const fallbackPath = '/socket.io'
    const transports = isProd ? ['websocket'] : ['polling', 'websocket']

    let socketInstance = io(url, {
      path: primaryPath,
      addTrailingSlash: false,
      transports,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 15000,
      withCredentials: true,
      autoConnect: true,
    })

    const setupHandlers = (s: Socket) => {
      s.on('connect', () => {
        console.log('✅ Lobby socket connected:', s.id)
        setState((prev) => ({ ...prev, connected: true }))
        reconnectAttemptsRef.current = 0
        
        // Resolve wallet identity (guest-safe)
        let effectiveWallet = wallet && typeof wallet === 'string' ? wallet : null
        try {
          if (!effectiveWallet && typeof window !== 'undefined') {
            effectiveWallet =
              (localStorage.getItem('guest_id') ||
                (window as any).__guestId ||
                null)
          }
          if (!effectiveWallet) {
            const rnd =
              (typeof window !== 'undefined' &&
                (window.crypto as any)?.randomUUID?.()) ||
              Math.random().toString(36).slice(2, 12)
            effectiveWallet = `guest_${rnd}`
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem('guest_id', effectiveWallet)
                ;(window as any).__guestId = effectiveWallet
              }
            } catch {}
          }
        } catch {}

        // Register identity (ack optional)
        if (effectiveWallet) {
          s.emit('register_identity', String(effectiveWallet).toLowerCase())
        }

        // Join lobby after identity resolution
        const effectiveUsername = username || 'Player'
        if (effectiveWallet && effectiveUsername) {
          const join: ClientToServer = { type: 'join_lobby', lobbyId, username: effectiveUsername, wallet: String(effectiveWallet) }
          s.emit('message', join)
        }
        
        // Request initial state
        s.emit('get_lobby_state', lobbyId)
      })

      s.on('disconnect', () => {
        console.log('❌ Lobby socket disconnected')
        setState((prev) => ({ ...prev, connected: false }))
      })

      let lastErrLog = 0
      s.on('connect_error', (error: any) => {
        const now = Date.now()
        if (now - lastErrLog > 5000) {
          console.error('🚫 Socket connection error:', error?.message || 'Unknown')
          lastErrLog = now
        }
        setState((prev) => ({ ...prev, connected: false }))

        // Fallback to default path if primary fails
        const is404 = (error && (error as any).description === 404) || /404/i.test(String((error as any)?.message || ''))
        const isWsErr = /websocket error/i.test(String((error as any)?.message || ''))
        const usedPrimary = (s.io.opts.path === primaryPath)
        
        if ((is404 || isWsErr) && usedPrimary && reconnectAttemptsRef.current === 0) {
          reconnectAttemptsRef.current++
          console.log('🔁 Retrying with fallback path:', fallbackPath)
          
          try {
            s.off()
            s.close()
          } catch {}

          socketInstance = io(url, {
            path: fallbackPath,
            addTrailingSlash: false,
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 15000,
            withCredentials: true,
            autoConnect: true,
          })

          setupHandlers(socketInstance)
          socketRef.current = socketInstance
        }
      })

      s.on('message', (msg: ServerToClient) => {
        if (msg.type === 'lobby_state') {
          if (msg.lobbyId !== lobbyId) return
          setState((prev) => ({ ...prev, players: msg.players, countdown: msg.countdown ?? null, status: msg.status }))
        } else if (msg.type === 'error') {
          setState((prev) => ({ ...prev, error: msg.message }))
        } else if (msg.type === 'match_start') {
          // Navigate to the arena; prefer matchId from payload, fallback to lobbyId
          try {
            const matchId = (msg as any)?.matchId || lobbyId
            const practiceParam = isPractice ? 'true' : 'false'
            if (typeof window !== 'undefined' && matchId) {
              window.location.href = `/pookiesumoroyale/game/${encodeURIComponent(matchId)}?practice=${practiceParam}`
            }
          } catch (e) {
            console.error('Failed to navigate to match:', e)
          }
        }
      })

      // ACK events
      s.on('identity_registered', () => {
        console.log('✅ Identity registered')
      })

      s.on('wallet_registered', () => {
        console.log('✅ Wallet registered')
      })
    }

    setupHandlers(socketInstance)
    socketRef.current = socketInstance

    return () => {
      if (socketInstance) {
        socketInstance.emit('message', { type: 'leave_lobby', lobbyId } as ClientToServer)
        socketInstance.off()
        socketInstance.disconnect()
      }
      socketRef.current = null
    }
  }, [lobbyId, url, username, wallet])

  const confirmWager = (amount: number, txSignature: string) => {
    if (!socketRef.current || !lobbyId) return
    console.log('📤 Confirming wager:', { lobbyId, amount, txSignature })
    socketRef.current.emit('message', { type: 'confirm_wager', lobbyId, amount, txSignature } as ClientToServer)
  }
  
  const setReady = (ready: boolean) => {
    if (!socketRef.current || !lobbyId) return
    socketRef.current.emit('message', { type: 'set_ready', lobbyId, ready } as ClientToServer)
  }

  const adminEndMatch = (matchId: string, winnerWallet: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('message', { type: 'admin_end_match', matchId, winnerWallet } as any)
  }

  const reportMatchResult = (matchId: string, winnerWallet: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('message', { type: 'match_result', matchId, winnerWallet } as any)
  }

  return { state, confirmWager, setReady, adminEndMatch, reportMatchResult }
}


