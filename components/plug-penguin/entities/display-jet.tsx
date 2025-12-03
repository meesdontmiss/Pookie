'use client'

import { useState, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Billboard, Html } from '@react-three/drei'
import * as THREE from 'three'
import { FighterJet } from './fighter-jet' // Assuming FighterJet component is in the same dir
import { useGameStore } from '@/lib/store' // Import the store hook
import { useNotificationStore } from '@/stores/notification-store' // Import notification store

// Constants
const INTERACTION_DISTANCE = 10 // Distance player needs to be within to interact
const DEBUG_MODE = process.env.NODE_ENV === 'development' // Simple check for debug mode

interface DisplayJetProps {
  position?: [number, number, number]
  scale?: number
  rotationSpeed?: number
}

// Helper for button styles - moved outside component to prevent recreation
const buttonStyle = (bgColor: string, isDebug = false): React.CSSProperties => ({
  background: bgColor,
  color: 'white',
  border: 'none',
  padding: isDebug ? '8px 12px' : '10px 20px',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: isDebug ? '0.9em' : '1em',
  transition: 'background-color 0.2s ease',
  margin: '0 5px'
});

export function DisplayJet({
  position = [79.35, 0.00, -239.53], // Default position if none provided
  scale = 1.2,
  rotationSpeed = 0.3
}: DisplayJetProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Entering dogfight zone...')
  const [playerDistance, setPlayerDistance] = useState(Infinity)
  const [isMounted, setIsMounted] = useState(false)
  
  // Track component mounting state to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true)
    
    // Add CSS for spinner animation when component mounts
    if (typeof document !== 'undefined') {
      const styleId = 'display-jet-spinner-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    return () => {
      // Clean up style on unmount if needed
      if (typeof document !== 'undefined') {
        const styleElement = document.getElementById('display-jet-spinner-style');
        if (styleElement) {
          styleElement.remove();
        }
      }
    };
  }, []);

  // Jet rotation animation and player proximity check
  useFrame((_, delta) => {
    // Rotation
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed * delta
      if (groupRef.current.rotation.y > Math.PI * 2) {
        groupRef.current.rotation.y -= Math.PI * 2
      }
    }

    // Only run player checks if component is mounted 
    if (!isMounted) return;

    // Proximity Check
    try {
      // Correctly access state via useGameStore.getState()
      const currentPlayer = useGameStore.getState().currentPlayer
      if (currentPlayer && currentPlayer.position) { // Added check for position
        const playerPos = new THREE.Vector3(...currentPlayer.position)
        // Use the component's current position for distance check
        const jetPos = groupRef.current?.position ?? new THREE.Vector3(...position);
        const distance = playerPos.distanceTo(jetPos)
        setPlayerDistance(distance)

        // Update prompt visibility based on distance threshold
        const shouldShowPrompt = distance < INTERACTION_DISTANCE;
        if (shouldShowPrompt !== showPrompt) {
            setShowPrompt(shouldShowPrompt);
            // Play sound only when entering range
            if (shouldShowPrompt && typeof window !== 'undefined') {
                try {
                  const enterSound = new Audio('/sounds/aircraft/alert.mp3') // Verify path
                  enterSound.volume = 0.2
                  enterSound.play().catch(e => console.warn("Error playing proximity sound:", e));
                } catch (err) {
                  // Ignore sound errors silently
                }
            }
        }

        // Auto-hide confirmation if player walks away
        if (!shouldShowPrompt && showConfirmDialog) {
          setShowConfirmDialog(false)
        }
      } else {
          // No player or position, ensure prompt/dialog are hidden
          if (showPrompt) setShowPrompt(false);
          if (showConfirmDialog) setShowConfirmDialog(false);
          setPlayerDistance(Infinity);
      }
    } catch (error) {
        console.error("Error in DisplayJet proximity check:", error);
        setShowPrompt(false);
        setShowConfirmDialog(false);
        setPlayerDistance(Infinity);
    }
  })

  // Handle key press to show confirmation dialog
  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check for both E and F keys
      if ((e.key === 'e' || e.key === 'f') &&
          showPrompt && !showConfirmDialog) {

        setShowConfirmDialog(true)

        // Play sound for dialog
        try {
          const dialogSound = new Audio('/sounds/aircraft/startup.mp3') // Verify path
          dialogSound.volume = 0.3
          dialogSound.play().catch(e => console.warn("Error playing dialog sound:", e));
        } catch (err) {
          // Sound error handled silently
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [showPrompt, showConfirmDialog, isMounted]) // Added isMounted dependency

  // Handle confirmation dialog response
  const handleConfirm = () => {
    if (!isMounted || typeof window === 'undefined') return;
    
    setShowConfirmDialog(false);
    
    // Show "Coming Soon" notification via notification store
    if (typeof window !== 'undefined') {
      // Only access the store on the client side
      const notificationActions = useNotificationStore.getState().actions;
      if (notificationActions) {
        notificationActions.addNotification({
          message: 'Dogfight Zone Coming Soon!',
          duration: 3000,
          type: 'info'
        });
      }
    }
    
    // Play short sound effect
    try {
      const soundEffect = new Audio('/sounds/aircraft/startup.mp3');
      soundEffect.volume = 0.3;
      soundEffect.play().catch(e => console.warn("Error playing sound:", e));
    } catch (err) {
      // Sound error handled silently
    }
  };

  // Handle dialog cancel
  const handleCancel = () => {
    setShowConfirmDialog(false);
  };

  // Only render if mounted
  if (!isMounted) {
    return <group ref={groupRef} position={position} />;
  }

  return (
    <group ref={groupRef} position={position}>
      {/* The jet model - silver display */}
      <FighterJet
        position={[0, 5, 0]} // Position relative to the DisplayJet group
        rotation={[0, 0, 0]} // Static rotation relative to group
        scale={scale}
        isPlayerJet={false} // This is just a display model
        silverColor={true}  // Use the silver color scheme
      />

      {/* DOGFIGHT text above the jet */}
      <Billboard
        position={[0, 15 * scale, 0]} // Scale text position
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        <Text
          fontSize={3.5 * scale} // Scale font size
          color="#ff3333"
          font="/fonts/Heavitas.ttf" // Verify font path
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.2 * scale} // Scale outline
          outlineColor="#000000"
        >
          DOGFIGHT
        </Text>
      </Billboard>

      {/* Interaction prompt */}
      {showPrompt && !showConfirmDialog && !isLoading && (
         <Billboard position={[0, 8 * scale, 0]}> {/* Adjust height */}
             <Text
               fontSize={0.5 * scale}
               color="white"
               anchorX="center"
               anchorY="middle"
               outlineWidth={0.05}
               outlineColor="black"
             >
               Press E or F to Enter
             </Text>
         </Billboard>
       )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <Html position={[0, 6 * scale, 0]} center distanceFactor={15}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '20px',
            borderRadius: '10px',
            border: '1px solid #555',
            textAlign: 'center',
            minWidth: '250px',
            fontFamily: 'sans-serif'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#ffcc00' }}>Dogfight Zone</h3>
            <p style={{ marginBottom: '20px', fontSize: '0.9em' }}>
              <span style={{ color: '#00bcd4', fontWeight: 'bold' }}>Coming Soon!</span>
              <br/>This feature is currently in development.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <button onClick={handleConfirm} style={buttonStyle('#4CAF50')}>
                OK
              </button>
              <button onClick={handleCancel} style={buttonStyle('#f44336')}>
                Cancel
              </button>
            </div>
          </div>
        </Html>
      )}

       {/* Loading Indicator */}
       {isLoading && (
         <Html position={[0, 6 * scale, 0]} center distanceFactor={15}>
           <div style={{
             background: 'rgba(0, 0, 0, 0.8)',
             color: 'white',
             padding: '20px',
             borderRadius: '10px',
             border: '1px solid #555',
             textAlign: 'center',
             fontFamily: 'sans-serif'
           }}>
             <div style={{ marginBottom: '15px', fontSize: '1.1em', color: '#00bcd4' }}>{loadingMessage}</div>
             {/* Simplified spinner animation */}
             <div style={{
                 border: '4px solid rgba(255, 255, 255, 0.3)',
                 borderTop: '4px solid #00bcd4',
                 borderRadius: '50%',
                 width: '30px',
                 height: '30px',
                 animation: 'spin 1s linear infinite',
                 margin: 'auto'
             }}></div>
           </div>
         </Html>
       )}

      {/* Debug button - only shown in debug mode - BELOW THE JET */}
      {DEBUG_MODE && (
        <Billboard
          position={[0, -2, 0]} // Lower below the jet
          follow={true}
        >
          <Html transform distanceFactor={10}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '15px',
              background: 'rgba(0,0,0,0.7)',
              padding: '15px',
              borderRadius: '10px',
              border: '2px solid #ff3333'
            }}>
              <button
                onClick={handleConfirm} // Use the same confirm logic for debug button
                style={buttonStyle('#ff3333', true)}
              >
                DEBUG: Dogfight (Coming Soon)
              </button>
              <span style={{color: 'cyan', fontSize: '0.8em'}}>Dist: {playerDistance.toFixed(1)}</span>
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
}