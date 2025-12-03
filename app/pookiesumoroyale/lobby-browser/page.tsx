'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, Users, Flame, Eye } from 'lucide-react';
import CinematicVideoBg from '@/components/lobby/cinematic-video-bg';
import { HARDCODED_LOBBIES, HardLobby } from '@/shared/hardcoded-lobbies'
import LobbyPanel from '@/components/lobby/lobby-panel'
import styles from './lobby.module.css'
import { useLobbyCounts } from '@/hooks/use-lobby-counts'
import { useGuestIdentity } from '@/hooks/use-guest-identity'

export default function LobbyBrowserPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const guestId = useGuestIdentity();
  const walletAddress = publicKey?.toBase58() ?? guestId;

  const [isLoading, setIsLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeLobby, setActiveLobby] = useState<HardLobby | null>(null)
  const [isJoining, setIsJoining] = useState<string | null>(null);
  
  // Subscribe to live lobby counts
  const lobbyCounts = useLobbyCounts()

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => setIsLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  const displayedLobbies = useMemo(() => {
    return [...HARDCODED_LOBBIES].sort((a, b) => {
      const aIsFree = a.wager === 0;
      const bIsFree = b.wager === 0;
      if (aIsFree && !bIsFree) return -1;
      if (!aIsFree && bIsFree) return 1;
      return (a.wager || 0) - (b.wager || 0);
    });
  }, []);

  const handleJoinLobby = (lobbyId: string) => {
    const found = HARDCODED_LOBBIES.find(l => l.id === lobbyId) || null
    setActiveLobby(found)
    setPanelOpen(true)
  }

  return (
    <div className="relative min-h-screen bg-gray-900 text-white flex flex-col overflow-hidden" style={{
      backgroundImage: `radial-gradient(circle at top right, rgba(0, 200, 255, 0.08), transparent 35%), radial-gradient(circle at bottom left, rgba(100, 200, 255, 0.06), transparent 35%)`
    }}>
      {/* Cinematic Background (Video with Canvas fallback) */}
      <div className="absolute inset-0 z-0">
        <CinematicVideoBg />
          </div>

      {/* Overlay gradient (lightened for brighter HDRI visibility) */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-gray-900/10 via-gray-900/5 to-gray-900/10 pointer-events-none" />

      <main className="relative z-10 flex-1 flex flex-col max-w-full overflow-auto min-h-0">
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 pb-8 min-h-0">
          {isLoading ? (
            <div className={styles.loaderContainer}>
              <div className={styles.loader}>
                <div className={styles.loaderGlow}></div>
                <div className={styles.loaderRing}></div>
                <img 
                  src="/images/pookie-smashin.gif" 
                  alt="Loading..." 
                  className={styles.loaderImg}
                />
              </div>
              <p className={styles.loaderText}>Loading Arenas...</p>
            </div>
          ) : (
            <>
              {/* Header Banner - Glassmorphic */}
              <div className="mb-6 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/10 border border-white/20 shadow-inner">
                      <ShieldCheck className="h-5 w-5 text-white/80" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/90 tracking-wide">Official Arenas</p>
                      <p className="text-xs text-white">House-hosted lobbies with fair matchmaking</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
            <button
                      disabled
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-cyan-600/30 text-cyan-400 bg-black/60 opacity-60 cursor-not-allowed flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Spectate (Coming Soon)
            </button>
          </div>
                </div>
              </div>

              {/* Split layout: lobby list + side panel */}
              <div className={`${styles.split} ${panelOpen ? styles.sideOpen : ""}`}>
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 xl:gap-8">
                    {displayedLobbies.map((lobby) => {
                  const live = lobbyCounts[lobby.id]
                  const playerCount = live ? Math.max(0, Number(live.liveHumans) || 0) : 0
                  const isLocked = playerCount >= lobby.capacity
                  const isPaid = (lobby.wager || 0) > 0
                  const fillPercent = Math.min(100, Math.round((playerCount / (lobby.capacity || 8)) * 100))
                  
                  return (
                        <motion.div
                      key={lobby.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      whileHover={{ y: -3, scale: 1.01 }}
                      whileTap={{ scale: 0.995 }}
                          className={`relative overflow-hidden rounded-2xl p-4 md:p-5 cursor-pointer transition-all duration-300 group h-full flex flex-col pointer-events-auto
                        bg-white/6 backdrop-blur-md border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]
                        ${activeLobby?.id === lobby.id ? 'ring-2 ring-cyan-400/70 border-cyan-400/30' : 'hover:border-white/20'}
                            min-h-[200px]
                      `}
                      onClick={() => !isJoining && !isLocked && handleJoinLobby(lobby.id)}
                    >
                      {/* Subtle gradient overlay on hover */}
                      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-cyan-400/8 to-blue-600/8`} />
                      
                      {/* VIP Badge (if applicable) */}
                      {lobby.wager > 1 && (
                        <div className="absolute top-2 right-2 bg-cyan-600/80 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border border-white/10">
                          <Flame className="h-3 w-3" />
                          VIP
          </div>
        )}

                      <div className="relative z-10">
                        {/* Entry Amount */}
                        <div className="mb-2 lg:mb-2">
                          <div className={`text-lg lg:text-xl font-bold ${lobby.wager > 1 ? 'text-cyan-300' : 'text-white'}`}>
                            {lobby.wager === 0 ? 'FREE' : `${lobby.wager} SOL`}
                          </div>
                          <div className="text-[10px] lg:text-[12px] text-white uppercase tracking-wide">
                            {lobby.wager === 0 ? 'Free Match' : 'Entry Fee'}
                          </div>
          </div>
                        
                        {/* Players Count */}
                        <div className="flex items-center justify-between mb-2 lg:mb-2">
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-white" />
                            <span className="text-sm font-semibold text-white">
                              {playerCount}/{lobby.capacity}
                            </span>
          </div>
                          {playerCount > 0 && (
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              <span className="text-[10px] font-bold text-green-300">{playerCount} LIVE</span>
          </div>
        )}
      </div>

                        {/* Progress Bar */}
                        <div className="mb-3 lg:mb-3">
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${fillPercent}%` }}
                              transition={{ duration: 0.5, ease: 'easeOut' }}
                              className={`h-full rounded-full ${
                                fillPercent >= 100 ? 'bg-red-500' :
                                fillPercent >= 75 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                            />
                          </div>
                          <p className="text-[10px] text-white mt-1">
                            {lobby.capacity - playerCount} {lobby.capacity - playerCount === 1 ? 'seat' : 'seats'} available
                          </p>
                        </div>
                        
                        {/* Lobby Name */}
                        <h3 className="text-base lg:text-lg font-bold text-white mb-2 truncate">
                          {lobby.name}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-xs text-white mb-3 line-clamp-2">
                          {lobby.description}
                        </p>
                        
                        {/* Join Button */}
                        <button
                          disabled={isLocked || isJoining === lobby.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleJoinLobby(lobby.id)
                          }}
                          className={`w-full py-2.5 px-4 rounded-lg font-bold text-sm transition-all duration-200 mt-auto ${
                            isLocked
                              ? 'bg-gray-700/50 text-white cursor-not-allowed'
                              : isPaid
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 shadow-lg hover:shadow-yellow-500/50'
                              : 'bg-gradient-to-r from-lime-400 to-lime-500 hover:from-lime-300 hover:to-lime-400 text-gray-900 shadow-lg hover:shadow-lime-400/50'
                          } ${isJoining === lobby.id ? 'opacity-50' : ''}`}
                        >
                          {isJoining === lobby.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <img 
                                src="/images/pookie-smashin.gif" 
                                alt="Joining..." 
                                className="w-5 h-5 object-contain"
                              />
                              Joining...
                            </div>
                          ) : isLocked ? (
                            'FULL'
                          ) : isPaid ? (
                            'JOIN RANKED'
                          ) : (
                            'JOIN FREE'
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
                  </div>
                </div>
                {/* Side Panel (only when joined) */}
                {panelOpen && activeLobby && (
                  <div className={`${styles.side} ${styles.sideOpen}`}>
                    <LobbyPanel inline lobby={activeLobby} open={panelOpen} onClose={() => setPanelOpen(false)} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

    </div>
  );
}
