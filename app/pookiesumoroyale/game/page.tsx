'use client';

import React, { useEffect } from 'react';
import SumoArenaScene from '@/components/plug-penguin/minigames/pookie-sumo-royale/SumoArenaScene'; // Adjusted import path

const SumoGamePage: React.FC = () => {
  console.log('[SumoGamePage] Rendering SumoArenaScene');

  useEffect(() => {
    console.log('[SumoGamePage] MOUNTED');
    return () => {
      console.log('[SumoGamePage] UNMOUNTED');
    };
  }, []);

  const handleMatchComplete = () => {
    console.log('[SumoGamePage] Match complete! Placeholder for navigation to lobbies.');
    // Here you would typically navigate the user, e.g., router.push('/pookiesumoroyale/lobby');
  };

  // You might want to fetch the actual username here or pass it from a higher-level context/auth state
  const username = "PookiePlayer"; 

  return (
    <div style={{ width: '100vw', height: '100vh'}}> {/* Ensure the container takes full screen */}
      <SumoArenaScene 
        username={username} 
        onMatchComplete={handleMatchComplete} 
      />
    </div>
  );
};

export default SumoGamePage; 