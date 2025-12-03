import { useState, useCallback, useEffect } from 'react'
import { useGameStore } from '@/lib/store'

interface UseWalletReturn {
  connect: () => Promise<string | null>
  disconnect: () => void
  isConnecting: boolean
  isConnected: boolean
  walletAddress: string | null
  isNFTHolder: boolean
  isTokenHolder: boolean
  error: string | null
}

export function useWallet(): UseWalletReturn {
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const store = useGameStore()
  const [walletState, setWalletState] = useState({
    walletAddress: store.getState().walletAddress,
    isNFTHolder: store.getState().isNFTHolder,
    isTokenHolder: store.getState().isTokenHolder
  })

  // Subscribe to store changes
  useEffect(() => {
    const unsubscribe = store.subscribe((state) => {
      setWalletState({
        walletAddress: state.walletAddress,
        isNFTHolder: state.isNFTHolder,
        isTokenHolder: state.isTokenHolder
      })
    })
    
    return () => unsubscribe()
  }, [store])

  // Check if wallet is connected on mount
  useEffect(() => {
    // In a real app, you would check if the user has a wallet connected
    // For now, we'll just use localStorage to simulate persistence
    const savedWalletAddress = localStorage.getItem('walletAddress')
    const savedIsNFTHolder = localStorage.getItem('isNFTHolder') === 'true'
    const savedIsTokenHolder = localStorage.getItem('isTokenHolder') === 'true'
    
    if (savedWalletAddress) {
      store.setWalletAddress(savedWalletAddress)
      store.setIsNFTHolder(savedIsNFTHolder)
      store.setIsTokenHolder(savedIsTokenHolder)
    }
  }, [store])

  const connect = useCallback(async (): Promise<string | null> => {
    setIsConnecting(true)
    setError(null)
    
    try {
      // In a real app, you would use a wallet provider like ethers.js or web3.js
      // For now, we'll just simulate a connection
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Generate a mock wallet address
      const mockAddress = '0x' + Math.random().toString(36).substring(2, 15)
      
      // Simulate checking for NFT/token ownership
      // In a real app, you would query the blockchain
      const mockIsNFTHolder = Math.random() > 0.3
      const mockIsTokenHolder = Math.random() > 0.3
      
      // Update state
      store.setWalletAddress(mockAddress)
      store.setIsNFTHolder(mockIsNFTHolder)
      store.setIsTokenHolder(mockIsTokenHolder)
      
      // Save to localStorage for persistence
      localStorage.setItem('walletAddress', mockAddress)
      localStorage.setItem('isNFTHolder', String(mockIsNFTHolder))
      localStorage.setItem('isTokenHolder', String(mockIsTokenHolder))
      
      return mockAddress
    } catch (err) {
      console.error('Failed to connect wallet:', err)
      setError('Failed to connect wallet. Please try again.')
      return null
    } finally {
      setIsConnecting(false)
    }
  }, [store])

  const disconnect = useCallback(() => {
    store.setWalletAddress(null)
    store.setIsNFTHolder(false)
    store.setIsTokenHolder(false)
    
    // Clear localStorage
    localStorage.removeItem('walletAddress')
    localStorage.removeItem('isNFTHolder')
    localStorage.removeItem('isTokenHolder')
  }, [store])

  return {
    connect,
    disconnect,
    isConnecting,
    isConnected: !!walletState.walletAddress,
    walletAddress: walletState.walletAddress,
    isNFTHolder: walletState.isNFTHolder,
    isTokenHolder: walletState.isTokenHolder,
    error,
  }
} 