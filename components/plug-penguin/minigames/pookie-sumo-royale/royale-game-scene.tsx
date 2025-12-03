'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
// import { io, Socket } from 'socket.io-client'; // Socket for game-specific events might be needed later or handled by SumoArenaScene
import { useWallet } from '@solana/wallet-adapter-react';
// import { Button } from '@/components/ui/button'; // Likely not needed for ready/bet anymore
// import { supabase } from '@/services/supabase-config'; // If static details are needed and not passed
import SumoArenaScene from './SumoArenaScene';
import type { GameState } from './SumoArenaScene';
import { useRouter } from 'next/navigation'; // For navigation if needed (e.g. back to lobby browser)

interface RoyaleGameSceneProps {
  lobbyId: string;
  isPractice: boolean;
  // Username might be passed if needed for display within the game, separate from lobby profile
  // initialUsername?: string | null; 
}

// Mock/placeholder for fetching static details if required by the game scene directly
// In a real scenario, the game server might provide all necessary info
const fetchGameStaticDetails = async (lobbyId: string, isPractice: boolean) => {
  console.log(`[RoyaleGameScene] Fetching static details for game (lobby): ${lobbyId}, Practice: ${isPractice}`);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 100)); 
  // Example: could return game mode, map, specific rules not covered by lobby settings
  return { 
    id: lobbyId, 
    name: `Game Session ${lobbyId.substring(0,6)}`, 
    mode: isPractice ? 'Practice Sumo' : 'Competitive Sumo',
    map: 'Standard Arena' 
  };
};

interface GameStaticDetails {
  id: string;
  name: string;
  mode: string;
  map: string;
}

const RoyaleGameScene: React.FC<RoyaleGameSceneProps> = ({ lobbyId, isPractice }) => {
  const router = useRouter();
  const { publicKey, connected: walletConnected } = useWallet();

  const [gameStaticDetails, setGameStaticDetails] = useState<GameStaticDetails | null>(null);
  const [gameStatusMessage, setGameStatusMessage] = useState<string>('Loading game...');
  const [isInGameView, setIsInGameView] = useState(true); // Assume true on load, SumoArenaScene manages its internal state
  
  // This would be triggered by SumoArenaScene when a match/game ends
  const handleMatchComplete = useCallback(() => {
    setIsInGameView(false); // Potentially hide the arena
    setGameStatusMessage('Match complete! You can return to the lobby browser.');
    // Optionally, auto-navigate or provide a button
    // router.push('/pookiesumoroyale/lobby-browser'); 
  }, [/* router */]); // router can be added if navigation is used

  useEffect(() => {
    console.log(`[RoyaleGameScene] Mounting for lobbyId: ${lobbyId}, isPractice: ${isPractice}`);
    if (!lobbyId) {
      setGameStatusMessage('Error: Invalid Game ID.');
      setIsInGameView(false);
      return;
    }
    // Allow wallet-less when isPractice
    if (!isPractice) {
    if (!walletConnected || !publicKey) {
        setGameStatusMessage('Wallet not connected. Please connect your wallet.');
        setIsInGameView(false);
        return;
      }
    }

    setGameStatusMessage(`Initializing ${isPractice ? 'practice' : 'competitive'} game for ${lobbyId}...`);

    // Fetch any static details needed for this game instance
    fetchGameStaticDetails(lobbyId, isPractice).then(details => {
      setGameStaticDetails(details);
      setGameStatusMessage(`Welcome to ${details.name} (${details.mode}) on ${details.map}!`);
      // SumoArenaScene can now take these details or lobbyId/isPractice directly
    }).catch(err => {
      console.error('[RoyaleGameScene] Error fetching game static details:', err);
      setGameStatusMessage('Error loading game details.');
      setIsInGameView(false);
    });

    // If RoyaleGameScene itself needs to listen to game-specific socket events (not lobby events),
    // that connection would be initialized here, perhaps passing lobbyId and publicKey.
    // For now, we assume SumoArenaScene handles its own netcode or gets data via props.

    return () => {
      console.log('[RoyaleGameScene] Unmounting game scene for lobbyId:', lobbyId);
      // Cleanup game-specific socket connections if any were made here
    };
  }, [lobbyId, isPractice, walletConnected, publicKey]);


  const goBackToLobbyBrowser = () => {
    router.push('/pookiesumoroyale/lobby-browser');
  };

  if (!isInGameView && gameStaticDetails) { // After game, or on initial error preventing game view
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'white' }}>
        <h1>{gameStaticDetails?.name || 'Game Session'}</h1>
        <p>{gameStatusMessage}</p>
        <button 
            onClick={goBackToLobbyBrowser}
            style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}
        >
            Back to Lobby Browser
        </button>
      </div>
    );
  }
  
  if (!isInGameView && !gameStaticDetails) { // Initial error, no details loaded
     return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h1>Error</h1>
        <p>{gameStatusMessage}</p>
        <button 
            onClick={goBackToLobbyBrowser}
            style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}
        >
            Back to Lobby Browser
        </button>
      </div>
    );
  }

  // Render the actual game arena
  // SumoArenaScene will need to use lobbyId and isPractice (and potentially gameStaticDetails)
  // to connect to the correct game instance on the server and load appropriate assets/rules.
  return (
    <div style={{width: '100vw', height: '100vh', background: '#111'}}>
        {/* 
          We might want a loading overlay here until gameStaticDetails are fetched 
          and SumoArenaScene is ready to render or has established its connection.
        */}
        {gameStaticDetails && publicKey && (
             <SumoArenaScene 
                lobbyId={lobbyId} 
                isPractice={isPractice} 
                playerWalletAddress={publicKey.toBase58()} // Pass wallet address
                // gameDetails={gameStaticDetails} // Pass fetched details if SumoArenaScene needs them
                onMatchComplete={handleMatchComplete} 
                // It's assumed SumoArenaScene will handle its own socket for game state sync
             />
        )}
        {!gameStaticDetails && <p style={{color: 'white', textAlign:'center', paddingTop:'20%'}}>{gameStatusMessage}</p>}

        {/* Temporary UI to show status if game isn't "in view" but details loaded (e.g., pre-load screen) */}
        {/* This part might be better handled inside SumoArenaScene or with more granular state */}
        {gameStaticDetails && !isInGameView && (
             <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white' }}>
                <p>{gameStatusMessage}</p>
                <button onClick={goBackToLobbyBrowser}>Back to Lobby Browser</button>
             </div>
        )}
    </div>
  );
};

export default RoyaleGameScene; 