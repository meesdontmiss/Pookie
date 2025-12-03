'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
// import RoyaleGameScene from '@/components/plug-penguin/minigames/pookie-sumo-royale/royale-game-scene';
import NewLobbyRoom from '@/components/pookiesumoroyale/NewLobbyRoom'; // Import the new lobby room

// This page now primarily serves to extract route parameters and pass them to NewLobbyRoom.
export default function DynamicLobbyPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  console.log('[DynamicLobbyPage] params:', params);
  const lobbyId = params.lobbyId as string;
  console.log('[DynamicLobbyPage] Extracted lobbyId:', lobbyId);
  const isPractice = searchParams.get('practice') === 'true';
  console.log('[DynamicLobbyPage] Extracted isPractice:', isPractice);

  if (!lobbyId) {
    // This case should ideally not happen if routing is set up correctly
    // and links to this page always include a lobbyId.
    return (
      <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>
        <h1>Error: Lobby ID is missing.</h1>
        <p>Cannot load the lobby without a valid Lobby ID.</p>
        {/* Consider adding a link back to the lobby browser */}
      </div>
    );
  }

  // NewLobbyRoom will handle the pre-game lobby logic.
  // It will then navigate to the actual game scene.
  return (
    <NewLobbyRoom lobbyId={lobbyId} isPractice={isPractice} />
  );
} 