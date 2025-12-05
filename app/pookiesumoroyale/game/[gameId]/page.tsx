'use client';

import React, { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import RoyaleGameScene from '@/components/plug-penguin/minigames/pookie-sumo-royale/royale-game-scene';
import { useWallet } from '@solana/wallet-adapter-react';
import { useGuestIdentity } from '@/hooks/use-guest-identity';

// This page renders the actual game scene for a given game ID.
export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams(); // To potentially get isPractice if passed in query
  const router = useRouter();
  const { publicKey } = useWallet();
  const guestId = useGuestIdentity();

  // Safely extract gameId - params can be string | string[] | undefined
  const rawGameId = params?.gameId;
  const gameId = Array.isArray(rawGameId) ? rawGameId[0] : (rawGameId as string | undefined);
  
  // Attempt to get isPractice from query params, if NewLobbyRoom passes it.
  // Otherwise, RoyaleGameScene might need a way to fetch/determine this if critical.
  const isPractice = searchParams?.get('practice') === 'true';

  // If the user hard-refreshes the live arena, send them back to the lobby browser.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      const navType = navEntries[0]?.type || (performance as any).navigation?.type;
      const isReload =
        navType === 'reload' ||
        navType === 1; // legacy PerformanceNavigation.TYPE_RELOAD
      if (isReload) {
        router.replace('/pookiesumoroyale/lobby-browser');
      }
    } catch {
      // Best-effort; ignore if PerformanceNavigationTiming unsupported.
    }
  }, [router]);

  if (!gameId || typeof gameId !== 'string') {
    return (
      <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
        <h1>Error: Game ID is missing.</h1>
        <p>Cannot load the game without a valid Game ID.</p>
      </div>
    );
  }

  // Allow guests when practice=true
  if (!publicKey && !isPractice) {
    return (
      <div style={{ padding: '20px', color: 'orange', textAlign: 'center' }}>
        <h1>Wallet Not Connected</h1>
        <p>Please connect your wallet to join ranked matches.</p>
      </div>
    );
  }

  // Pass lobbyId (as gameId) and potentially isPractice to the game scene.
  // RoyaleGameScene will be responsible for connecting to the game server (if different from lobby server)
  // and handling game state.
  return (
    <RoyaleGameScene lobbyId={gameId} isPractice={isPractice} />
  );
} 