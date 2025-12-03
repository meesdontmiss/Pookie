'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { HardLobby } from '@/shared/hardcoded-lobbies'
import { useWallet } from '@solana/wallet-adapter-react'
import { useLobbySocket } from '@/lib/lobby-socket'
import { useGuestIdentity, getCurrentPlayerId } from '@/hooks/use-guest-identity'
import { useWager } from '@/hooks/use-wager'
import { Check, Clock, X, Loader2, ArrowLeft, Users, Trophy, Crown, Wallet } from 'lucide-react'

interface PlayerRow {
  id: string
  username: string
  walletShort: string
  wager: number
  wagerConfirmed: boolean
  ready: boolean
}

export default function LobbyPanel({
  lobby,
  open,
  onClose,
  inline = false,
}: {
  lobby: HardLobby | null
  open: boolean
  onClose: () => void
  inline?: boolean
}) {
  const { publicKey } = useWallet()
  const guestId = useGuestIdentity()
  const walletAddress = publicKey?.toBase58() ?? guestId
  const myName = 'Player'
  const { state, confirmWager, setReady, adminEndMatch } = useLobbySocket(lobby?.id ?? null, myName, walletAddress, (lobby?.wager ?? 0) === 0)
  const { executeWager, isLoading: isWagerLoading, error: wagerError, reset: resetWager } = useWager()
  
  const [myReady, setMyReady] = useState(false)
  const [myWagerConfirmed, setMyWagerConfirmed] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('admin') === '1') setIsAdmin(true)
      const adminWallet = (process.env.NEXT_PUBLIC_ADMIN_WALLET || '').toLowerCase()
      if (publicKey && adminWallet && publicKey.toBase58().toLowerCase() === adminWallet) setIsAdmin(true)
    } catch {}
  }, [publicKey])
  
  const rootRef = useRef<HTMLDivElement | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)
  const bottomActionsRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [bottomPadding, setBottomPadding] = useState<number>(56)
  const [scrollMaxHeight, setScrollMaxHeight] = useState<number>(0)

  const currentPlayerId = getCurrentPlayerId(publicKey)
  const missingIdentity = !currentPlayerId

  // Measure layout for responsive scroll area
  useEffect(() => {
    const measure = () => {
      try {
        const bottomH = bottomActionsRef.current?.offsetHeight || 56
        const scrollTop = scrollRef.current?.getBoundingClientRect().top || 0
        const avail = window.innerHeight - scrollTop - bottomH - 8
        setBottomPadding(Math.max(bottomH + 12, 96))
        setScrollMaxHeight(Math.max(260, avail))
      } catch {}
    }
    measure()
    window.addEventListener('resize', measure)
    const id = window.setInterval(measure, 500)
    return () => {
      window.removeEventListener('resize', measure)
      window.clearInterval(id)
    }
  }, [open])

  const players: PlayerRow[] = useMemo(() => {
    if (!lobby) return []
    if (state.players.length > 0) {
      return state.players.map((p) => ({
        id: p.id,
        username: p.username,
        walletShort: p.walletShort,
        wager: p.wager,
        wagerConfirmed: p.wagerConfirmed,
        ready: p.ready,
      }))
    }
    return []
  }, [lobby, state.players])

  const minRequired = lobby?.wager === 0 ? 2 : 4
  const paidPlayers = players.filter(p => p.ready).length
  const allPlayersReady = (players.length >= minRequired) && players.every(p => p.ready)
  const currentPlayer = players.find(p => p.id === currentPlayerId)

  const handleReadyToggle = async () => {
    if (missingIdentity) return

    const isPaidLobby = (lobby?.wager ?? 0) > 0
    
    // If trying to ready in paid lobby without wager, process wager first
    if (!myReady && isPaidLobby && !myWagerConfirmed) {
      if (!publicKey) {
        alert('Connect your wallet to ready in ranked lobbies')
        return
      }
      await handleWagerTransaction()
      return
    }

    const newReadyState = !myReady
    setMyReady(newReadyState)
    setReady(newReadyState)
  }

  const handleWagerTransaction = async () => {
    if (!publicKey || !lobby) {
      alert('Connect your wallet first')
      return
    }

    try {
      console.log('💰 Starting wager transaction for lobby:', lobby.id)
      
      // Execute wager: request + sign + send
      const result = await executeWager(lobby.id)
      
      if (!result) {
        throw new Error(wagerError || 'Failed to process wager')
      }

      // Free lobby - no transaction needed
      if (result.isFree) {
        console.log('✅ Free lobby - no wager required')
        setMyWagerConfirmed(true)
        confirmWager(lobby.wager, 'FREE_LOBBY')
        return
      }

      console.log('✅ Wager transaction confirmed:', result.signature)
      
      // Update local state
      setMyWagerConfirmed(true)
      
      // Notify server with transaction signature
      confirmWager(result.amount || lobby.wager, result.signature)
      
      // Auto-ready after successful wager
      setMyReady(true)
      setReady(true)
      
    } catch (error: any) {
      console.error('❌ Failed to process wager:', error)
      alert(`Failed to submit wager: ${error.message || 'Unknown error'}`)
      resetWager()
    }
  }

  if (!open || !lobby) return null

  const containerClass = inline 
    ? "relative h-full w-full flex flex-col bg-blue-900/25 backdrop-blur-md border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl pointer-events-auto"
    : "fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"

  const cardClass = inline
    ? "relative h-full w-full flex flex-col"
    : "relative w-full max-w-md max-h-[90vh] flex flex-col bg-white/6 backdrop-blur-md border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl"

  return (
    <div className={containerClass}>
      <div ref={rootRef} className={cardClass}>
        {/* Countdown Overlay */}
        <AnimatePresence>
          {state.countdown !== null && state.countdown > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl"
            >
              <div className="flex flex-col items-center">
                <div className="text-base sm:text-xl md:text-2xl font-extrabold text-white drop-shadow-[4px_4px_0_rgba(0,0,0,0.85)] whitespace-nowrap text-center mb-1">
                  MATCH STARTING
                </div>
                <motion.div
                  key={state.countdown}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.1, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="text-7xl sm:text-9xl font-bold text-yellow-400 drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)]"
                >
                  {state.countdown}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* All Ready Banner */}
        <AnimatePresence>
          {allPlayersReady && state.countdown === null && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="absolute top-0 left-0 right-0 bg-green-600/90 backdrop-blur-md p-3 z-40 rounded-t-2xl"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-white">
                  <Check className="h-5 w-5" />
                  <span className="text-base font-bold">ALL PLAYERS READY!</span>
                </div>
                <p className="text-xs text-green-100 mt-1">Waiting for match to start...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Match Details - Ultra Compact */}
        <div className="flex-shrink-0 p-2 bg-white/5 backdrop-blur-sm border-b border-white/10 rounded-t-2xl">
          <div className="space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-white">Entry:</span>
              <span className="font-bold text-yellow-400">
                {lobby.wager === 0 ? 'FREE' : `${lobby.wager} SOL`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white">Active players:</span>
              <span className="font-bold text-emerald-400">{players.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white">Prize:</span>
              <span className="font-bold text-green-400">
                {lobby.wager === 0 ? 'Practice' : `${(lobby.wager * Math.max(paidPlayers, minRequired)).toFixed(2)} SOL`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white">Players:</span>
              <span className="font-bold">
                {paidPlayers} paid / {players.length} joined / {lobby.capacity} cap
              </span>
            </div>
          </div>
        </div>

        {/* Players List - Scrollable (pad for bottom bar) */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 pointer-events-auto min-h-0" style={{ paddingBottom: Math.max(bottomPadding, 96), maxHeight: scrollMaxHeight }}>
          <div className="space-y-1.5">
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between p-2 rounded-xl border backdrop-blur-sm transition-all ${
                  player.ready 
                    ? 'bg-green-500/10 border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-blue-600">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold truncate">
                        {player.username}
                      </span>
                      {player.id === currentPlayerId && (
                        <span className="text-[9px] px-1 py-0 bg-cyan-600 text-white rounded">You</span>
                      )}
                    </div>
                    <p className="text-[10px] text-white truncate">
                      {player.walletShort}
                    </p>
                  </div>
                </div>
                
                <div className="flex-shrink-0 flex items-center gap-1">
                  {/* Wager Status (for paid lobbies) */}
                  {lobby.wager > 0 && (
                    player.wagerConfirmed ? (
                      <span className="inline-flex items-center gap-0.5 bg-yellow-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                        <Wallet className="h-2.5 w-2.5" />
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 border border-yellow-500 text-yellow-300 text-[10px] px-1.5 py-0.5 rounded">
                        <Wallet className="h-2.5 w-2.5" />
                        Unpaid
                      </span>
                    )
                  )}
                  
                  {/* Ready Status */}
                  {player.ready ? (
                    <span className="inline-flex items-center gap-0.5 bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                      <Check className="h-2.5 w-2.5" />
                      Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 border border-gray-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                      <Clock className="h-2.5 w-2.5" />
                      Wait
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
            
            {/* Placeholder slots */}
            {Array.from({ length: Math.max(0, lobby.capacity - players.length) }).map((_, i) => (
              <div key={`slot-${i}`} className="flex items-center justify-between p-2 rounded-xl border border-dashed border-white/10 bg-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-gray-600">?</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold truncate text-white">Empty Slot</span>
                    </div>
                    <p className="text-[10px] text-white truncate">Waiting for player...</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-0.5 border border-gray-600 text-white text-[10px] px-1.5 py-0.5 rounded">
                    <Clock className="h-2.5 w-2.5" />
                    Open
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions - Fixed to bottom */}
        <div ref={bottomActionsRef} className="flex-shrink-0 sticky bottom-0 z-10 space-y-1 p-2 bg-white/5 backdrop-blur-md border-t border-white/10 rounded-b-2xl">
          {/* Admin tools (temporary) */}
          {isAdmin && (
            <div className="flex gap-2 mb-1">
              <button
                onClick={() => {
                  const matchId = prompt('Enter matchId to payout (leave blank for latest in this lobby):', '') || ''
                  const winner = prompt('Enter winner wallet (base58):', walletAddress) || walletAddress
                  const finalMatchId = matchId // server will validate
                  if (finalMatchId && winner) {
                    adminEndMatch(finalMatchId, winner)
                  } else {
                    alert('Missing matchId or winner')
                  }
                }}
                className="px-2 py-1 text-[11px] rounded bg-purple-600 text-white"
                title="Admin: End match and payout now"
              >
                Admin: End Match + Payout
              </button>
            </div>
          )}

          <div className="px-2 py-0.5 bg-yellow-500/10 backdrop-blur-sm border border-yellow-500/30 rounded-lg">
            <p className="text-[9px] text-yellow-400 text-center">Min. {minRequired} players required</p>
          </div>

          {/* Ready Button */}
          <div ref={barRef} className="w-full">
            <button
              onClick={handleReadyToggle}
              disabled={isWagerLoading || missingIdentity}
              className={`w-full h-10 text-sm font-bold rounded-lg border-none cursor-pointer flex items-center justify-center gap-2 transition-all shadow-lg ${
                missingIdentity || isWagerLoading 
                  ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed opacity-50' 
                  : myReady 
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white hover:shadow-red-500/50' 
                  : 'bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-300 hover:to-lime-400 text-gray-900 hover:shadow-lime-400/50'
              }`}
            >
              {missingIdentity ? (
                <>INITIALIZE GUEST SESSION</>
              ) : isWagerLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {wagerError ? 'RETRYING...' : 'PROCESSING WAGER...'}
                </>
              ) : myReady ? (
                <>
                  <X size={16} />
                  CANCEL
                </>
              ) : (
                <>
                  {lobby.wager > 0 && !myWagerConfirmed ? (
                    <>
                      <Wallet size={16} />
                      PAY {lobby.wager} SOL & READY
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      READY UP
                    </>
                  )}
                </>
              )}
            </button>
          </div>

          {/* Wager Status */}
          {lobby.wager > 0 && (
            <div className="text-center space-y-1">
              {myWagerConfirmed ? (
                <div className="flex items-center justify-center gap-1 text-green-400">
                  <Check size={12} />
                  <span className="text-[10px]">Wager submitted ✅</span>
                </div>
              ) : wagerError ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-1 text-red-400">
                    <X size={12} />
                    <span className="text-[10px]">Wager failed</span>
                  </div>
                  <p className="text-[9px] text-red-300 max-w-[90%]">{wagerError}</p>
                </div>
              ) : (
                <p className="text-[10px] text-yellow-400">
                  Submit {lobby.wager} SOL to ready
                </p>
              )}
            </div>
          )}

          {/* Leave Button */}
          <button
            onClick={onClose}
            className="w-full h-8 text-xs font-semibold rounded-lg border-2 border-red-600/50 bg-red-600/10 backdrop-blur-sm text-red-400 cursor-pointer flex items-center justify-center gap-1.5 transition-all hover:bg-red-600/20 hover:border-red-600/70"
          >
            <ArrowLeft size={14} />
            LEAVE LOBBY
          </button>
        </div>
      </div>
    </div>
  )
}
