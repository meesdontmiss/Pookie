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

const ENABLE_HTTP_FALLBACK = process.env.NEXT_PUBLIC_LOBBY_HTTP_FALLBACK === 'true'
const INITIAL_LOBBY_SOCKET_STATE: LobbySocketState = {
  players: [],
  countdown: null,
  status: 'open',
  connected: false,
}

function toPlayerId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function walletShort(wallet: string) {
  return wallet.length > 8 ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : wallet
}

export function useLobbySocket(
  lobbyId: string | null,
  username: string | null,
  wallet: string | null,
  isPractice: boolean = false,
  guestIdentity: string | null = null,
) {
  const [state, setState] = useState<LobbySocketState>(INITIAL_LOBBY_SOCKET_STATE)
  const [socket, setSocket] = useState<Socket | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const httpPollTimerRef = useRef<number | null>(null)
  const httpJoinedRef = useRef(false)
  const httpPlayerIdRef = useRef<string | null>(null)
  const urlCandidates = useMemo(() => {
    const list: string[] = []
    const envUrl = process.env.NEXT_PUBLIC_SOCKET_URL?.trim()
    if (envUrl) {
      list.push(envUrl)
    } else if (typeof window !== 'undefined') {
      list.push(window.location.origin)
    }
    if (process.env.NODE_ENV !== 'production') {
      list.push('http://localhost:4001')
    }
    // de-dup while preserving order
    return Array.from(new Set(list))
  }, [])
  const currentUrlIdxRef = useRef(0)

  useEffect(() => {
    const walletId = toPlayerId(wallet)
    const guestId = toPlayerId(guestIdentity)
    const playerId = walletId || (isPractice ? guestId : '')
    if (!lobbyId || !playerId) {
      setState(INITIAL_LOBBY_SOCKET_STATE)
      setSocket(null)
      return
    }
    // Reset stale state before connecting with a new lobby or player identity.
    setState(INITIAL_LOBBY_SOCKET_STATE)
    reconnectAttemptsRef.current = 0
    currentUrlIdxRef.current = 0
    httpJoinedRef.current = false
    httpPlayerIdRef.current = null
    
    const isProd = process.env.NODE_ENV === 'production'
    // Use /api/socketio to match working Cock Combat implementation
    const primaryPath = process.env.NEXT_PUBLIC_SOCKET_PATH || '/api/socketio'
    const fallbackPath = '/socket.io'
    const transports: ("websocket" | "polling")[] = isProd ? ['websocket', 'polling'] : ['polling', 'websocket']

    let socketInstance = io(urlCandidates[currentUrlIdxRef.current]!, {
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
    setSocket(socketInstance)

    // Lightweight HTTP fallback when socket cannot connect (join + poll)
    const startHttpFallback = async () => {
      if (!ENABLE_HTTP_FALLBACK || !lobbyId || httpJoinedRef.current) return
      try {
        const effectiveUsername = username || (playerId.startsWith('guest_') ? `Guest ${playerId.slice(-4)}` : 'Player')
        // Join (create/update) player
        const res = await fetch(`/api/lobbies/${encodeURIComponent(lobbyId)}/players`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: playerId, username: effectiveUsername }),
        })
        const data = await res.json().catch(() => null as any)
        if (res.ok && data?.player?.id) {
          httpJoinedRef.current = true
          httpPlayerIdRef.current = String(data.player.id)
        }
      } catch (e) {
        // ignore
      }
      // Begin polling roster
      const poll = async () => {
        try {
          const r = await fetch(`/api/lobbies/${encodeURIComponent(lobbyId)}/players`, { cache: 'no-store' })
          const d = await r.json().catch(() => null as any)
          const rows = Array.isArray(d?.players) ? d.players : []
          const mapped: UIRoomPlayer[] = rows.map((p: any) => {
            const wid = toPlayerId(p.wallet_address || p.id)
            return {
              id: wid,
              username: String(p.username || 'Player'),
              walletShort: walletShort(wid),
              wager: 0,
              wagerConfirmed: Boolean(p.wager_confirmed),
              ready: Boolean(p.is_ready),
            }
          })
          setState(prev => ({ ...prev, players: mapped }))
        } catch {}
      }
      await poll()
      try {
        if (httpPollTimerRef.current) {
          window.clearInterval(httpPollTimerRef.current)
          httpPollTimerRef.current = null
        }
        httpPollTimerRef.current = window.setInterval(poll, 2000)
      } catch {}
    }

    const setupHandlers = (s: Socket) => {
      s.on('connect', () => {
        console.log('✅ Lobby socket connected:', s.id)
        setState((prev) => ({ ...prev, connected: true }))
        reconnectAttemptsRef.current = 0
        // Stop HTTP fallback if running
        try {
          if (httpPollTimerRef.current) {
            window.clearInterval(httpPollTimerRef.current)
            httpPollTimerRef.current = null
          }
        } catch {}
        
        // Register identity (ack optional)
        s.emit('register_identity', playerId)

        // Join lobby after identity resolution
        const effectiveUsername = username || (playerId.startsWith('guest_') ? `Guest ${playerId.slice(-4)}` : 'Player')
        const join: ClientToServer = { type: 'join_lobby', lobbyId, username: effectiveUsername, wallet: playerId }
        s.emit('message', join)
        // Cock Combat compatibility: also join room and request snapshot via classic events
        try { s.emit('join_lobby_room', lobbyId) } catch {}
        
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
          console.error('🚫 Socket connection error:', error?.message || 'Unknown', 'host=', (s.io as any)?.uri || urlCandidates[currentUrlIdxRef.current])
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

          socketInstance = io(urlCandidates[currentUrlIdxRef.current]!, {
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
          setSocket(socketInstance)
          return
        }

        // If still failing, try next HOST candidate
        const hasMoreHosts = currentUrlIdxRef.current < urlCandidates.length - 1
        if (hasMoreHosts) {
          currentUrlIdxRef.current += 1
          const nextHost = urlCandidates[currentUrlIdxRef.current]
          console.log('🌐 Switching socket host to:', nextHost)
          try {
            s.off()
            s.close()
          } catch {}
          socketInstance = io(nextHost!, {
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
          setSocket(socketInstance)
          return
        }

        // As last resort, start HTTP fallback join + polling
        try {
          if (!s.connected) setTimeout(() => { startHttpFallback() }, 500)
        } catch {}
      })

      s.on('message', (msg: ServerToClient) => {
        if (msg.type === 'lobby_state') {
          if (msg.lobbyId !== lobbyId) return
          setState((prev) => ({ ...prev, players: msg.players, countdown: msg.countdown ?? null, status: msg.status }))
        } else if (msg.type === 'error') {
          setState((prev) => ({ ...prev, error: msg.message }))
        } else if (msg.type === 'match_start') {
          // Navigate to the arena; use authoritative matchId from payload
          try {
            const payload = msg.payload as any
            const matchId = payload?.matchId || lobbyId
            const practiceParam = isPractice ? 'true' : 'false'
            if (typeof window !== 'undefined' && matchId) {
              window.location.href = `/pookiesumoroyale/game/${encodeURIComponent(matchId)}?practice=${practiceParam}`
            }
          } catch (e) {
            console.error('Failed to navigate to match:', e)
          }
        }
      })

      // Cock Combat compatibility: roster and status events → map into our UI state
      s.on('roster_full', (payload: any) => {
        try {
          if (!payload || (payload.lobbyId && payload.lobbyId !== lobbyId)) return
          const rows = Array.isArray(payload.players) ? payload.players : []
          const mapped: UIRoomPlayer[] = rows.map((p: any) => {
            const id = toPlayerId(p.playerId)
            return {
              id,
              username: p.username || (id ? id.slice(0, 8) + '...' : 'Player'),
              walletShort: walletShort(id),
              wager: 0,
              wagerConfirmed: Boolean(p.hasWagered || p.isReady),
              ready: Boolean(p.isReady),
            }
          })
          setState(prev => ({ ...prev, players: mapped }))
        } catch {}
      })
      s.on('player_ready_status', (data: any) => {
        try {
          const eventLobbyId = String((data && (data as any).lobbyId) || '')
          if (eventLobbyId && eventLobbyId !== lobbyId) return
          const pid = toPlayerId(data?.playerId)
          if (!pid) return
          const isReady = Boolean(data?.isReady)
          setState(prev => ({
            ...prev,
            players: prev.players.map(p => p.id.toLowerCase() === pid.toLowerCase() ? { ...p, ready: isReady } : p),
          }))
        } catch {}
      })
      s.on('lobby_synced', (payload: any) => {
        try {
          if (!payload || payload.id !== lobbyId) return
          const rows = Array.isArray(payload.players) ? payload.players : []
          const mapped: UIRoomPlayer[] = rows.map((p: any) => {
            const id = toPlayerId(p.playerId)
            return {
              id,
              username: (p.username && p.username.trim()) || (id ? id.slice(0, 8) + '...' : 'Player'),
              walletShort: walletShort(id),
              wager: 0,
              wagerConfirmed: Boolean(p.hasWagered || p.isReady),
              ready: Boolean(p.isReady),
            }
          })
          setState(prev => ({ ...prev, players: mapped }))
        } catch {}
      })
      // Generic CC event carrying the current player list
      s.on('updatePlayerList', (playersArr: any[]) => {
        try {
          const rows = Array.isArray(playersArr) ? playersArr : []
          const mapped: UIRoomPlayer[] = rows.map((p: any) => {
            // server/index.js uses socket.id + optional solanaPublicKey/username
            const raw = toPlayerId(p.solanaPublicKey || p.playerId || p.id)
            const id = raw || toPlayerId(p.id)
            const uname = (p.username && String(p.username).trim()) || (id ? id.slice(0,8)+'...' : 'Player')
            return {
              id,
              username: uname,
              walletShort: walletShort(id),
              wager: 0,
              wagerConfirmed: Boolean(p.isReady), // best-effort
              ready: Boolean(p.isReady),
            }
          })
          setState(prev => ({ ...prev, players: mapped }))
        } catch {}
      })
      s.on('match_starting', (data: any) => {
        try {
          const seconds = Number(data?.countdown)
          if (!Number.isNaN(seconds)) {
            setState(prev => ({ ...prev, countdown: seconds, status: 'countdown' }))
          }
        } catch {}
      })
      s.on('match_started', () => {
        try {
          setState(prev => ({ ...prev, countdown: null, status: 'open' }))
        } catch {}
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
    setSocket(socketInstance)

    return () => {
      // Cleanup HTTP fallback if active
      try {
        if (httpPollTimerRef.current) {
          window.clearInterval(httpPollTimerRef.current)
          httpPollTimerRef.current = null
        }
        if (ENABLE_HTTP_FALLBACK && httpJoinedRef.current && httpPlayerIdRef.current && lobbyId) {
          const pid = httpPlayerIdRef.current
          httpJoinedRef.current = false
          httpPlayerIdRef.current = null
          fetch(`/api/lobbies/${encodeURIComponent(lobbyId)}/players/${encodeURIComponent(pid)}`, { method: 'DELETE' }).catch(() => {})
        }
      } catch {}
      if (socketInstance) {
        socketInstance.emit('message', { type: 'leave_lobby', lobbyId } as ClientToServer)
        socketInstance.off()
        socketInstance.disconnect()
      }
      socketRef.current = null
      setSocket(null)
    }
  }, [lobbyId, urlCandidates, username, wallet, isPractice, guestIdentity])

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
    socketRef.current.emit('message', { type: 'admin_end_match', matchId, winnerWallet } as ClientToServer)
  }

  const reportMatchResult = (matchId: string, winnerWallet: string) => {
    if (!socketRef.current) return
    socketRef.current.emit('message', { type: 'match_result', matchId, winnerWallet } as ClientToServer)
  }

  const selectColor = (color: string) => {
    if (!socketRef.current || !lobbyId) return
    socketRef.current.emit('message', { type: 'select_color', lobbyId, color } as ClientToServer)
  }

  return { state, socket, confirmWager, setReady, adminEndMatch, reportMatchResult, selectColor }
}
