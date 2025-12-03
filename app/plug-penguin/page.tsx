"use client"

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import components to avoid SSR issues with three.js
const GameScene = dynamic(() => import('@/components/plug-penguin/scenes/game-scene'), {
  ssr: false,
  loading: () => <LoadingScreen />
})

// Loading screen component
function LoadingScreen() {
  const [loadingProgress, setLoadingProgress] = useState(0)
  
  // Simulate loading progress
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        const newProgress = prev + Math.random() * 10
        return newProgress >= 100 ? 100 : newProgress
      })
    }, 200)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-b from-blue-900 to-blue-700">
      <div className="text-center px-4 max-w-md">
        <h1 className="text-4xl font-bold text-white mb-4">Plug Penguin</h1>
        <p className="text-blue-200 mb-6">Get ready for an adventure with Pookie!</p>
        <div className="w-full h-3 bg-blue-800 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-blue-300 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${loadingProgress}%` }}
          ></div>
        </div>
        <p className="text-blue-200 text-sm">{Math.floor(loadingProgress)}% loaded</p>
      </div>
    </div>
  )
}

export default function PlugPenguinPage() {
  const [isLoaded, setIsLoaded] = useState(false)
  
  // Handle game loaded
  const handleGameLoaded = () => {
    setIsLoaded(true)
  }
  
  return (
    <div className="w-full h-screen overflow-hidden relative">
      <GameScene onLoadComplete={handleGameLoaded} />
    </div>
  )
}

// Add this to your global CSS
// .animate-fade-out {
//   animation: fadeOut 5s forwards;
//   animation-delay: 3s;
// }
// @keyframes fadeOut {
//   from { opacity: 1; }
//   to { opacity: 0; visibility: hidden; }
// }
// .animate-slide-in-right {
//   animation: slideInRight 0.3s forwards;
// }
// @keyframes slideInRight {
//   from { transform: translateX(100%); opacity: 0; }
//   to { transform: translateX(0); opacity: 1; }
// } 