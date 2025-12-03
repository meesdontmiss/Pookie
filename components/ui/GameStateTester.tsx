'use client'

import { useState } from 'react'
import { Button, Input, Spinner } from '@nextui-org/react'
import { supabase } from '@/services/supabase-config'
import { saveGameState, loadGameState } from '@/lib/supabase-service'
import { GameState, InventoryItem, ItemType } from '@/lib/store'

export function GameStateTester() {
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [gameState, setGameState] = useState<Partial<GameState> | null>(null)

  // Test saving game state
  async function handleSaveState() {
    if (!userId) {
      setStatus('error')
      setMessage('Please enter a user ID')
      return
    }

    setStatus('loading')
    setMessage('Saving test game state...')
    
    try {
      // Create test inventory items with all required properties
      const testItems: InventoryItem[] = [
        {
          id: 'test-item-1',
          name: 'Test Tool',
          description: 'A test tool for testing',
          value: 100,
          quantity: 1,
          type: 'resource' as ItemType,
          rarity: 'common'
        },
        {
          id: 'test-item-2',
          name: 'Test Resource',
          description: 'A test resource for testing',
          value: 50,
          quantity: 5,
          type: 'resource' as ItemType,
          rarity: 'uncommon'
        }
      ]
      
      // Create a test game state
      const testState: Partial<GameState> = {
        inventory: testItems,
        money: 500,
        reputation: 10,
        dealerLevel: 2,
        currentPlayer: {
          id: userId,
          position: [0, 0, 0] as [number, number, number],
          rotation: [0, 0, 0] as [number, number, number],
          name: 'Test Player',
          model: 'default',
          isNFTHolder: false,
          isTokenHolder: false
        }
      }
      
      // Save the test state
      await saveGameState(userId, testState)
      
      setStatus('success')
      setMessage('Test game state saved successfully!')
    } catch (error: any) {
      console.error('Error saving game state:', error)
      setStatus('error')
      setMessage(`Error saving game state: ${error?.message || 'Unknown error'}`)
    }
  }

  // Test loading game state
  async function handleLoadState() {
    if (!userId) {
      setStatus('error')
      setMessage('Please enter a user ID')
      return
    }

    setStatus('loading')
    setMessage('Loading game state...')
    
    try {
      // Load the game state
      const state = await loadGameState(userId)
      
      if (!state) {
        setStatus('error')
        setMessage('No game state found for this user ID')
        setGameState(null)
        return
      }
      
      setStatus('success')
      setMessage('Game state loaded successfully!')
      setGameState(state)
    } catch (error: any) {
      console.error('Error loading game state:', error)
      setStatus('error')
      setMessage(`Error loading game state: ${error?.message || 'Unknown error'}`)
      setGameState(null)
    }
  }

  // Test user authentication
  async function handleSignUp() {
    if (!userId) {
      setStatus('error')
      setMessage('Please enter an email address')
      return
    }

    setStatus('loading')
    setMessage('Creating test user...')
    
    try {
      // Generate a random password
      const password = Math.random().toString(36).slice(-8) + 'A1!'
      
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: userId,
        password: password
      })
      
      if (error) throw error
      
      setStatus('success')
      setMessage(`Test user created! Email: ${userId}, Password: ${password}`)
    } catch (error: any) {
      console.error('Error creating test user:', error)
      setStatus('error')
      setMessage(`Error creating test user: ${error?.message || 'Unknown error'}`)
    }
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Game State Tester</h2>
      
      <div className="mb-4">
        <Input
          label="User ID / Email"
          placeholder="Enter user ID or email"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="mb-2"
        />
        
        <div className="flex gap-2 mb-4">
          <Button color="primary" onClick={handleSignUp}>
            Create Test User
          </Button>
          <Button color="secondary" onClick={handleSaveState}>
            Save Test State
          </Button>
          <Button color="default" onClick={handleLoadState}>
            Load State
          </Button>
        </div>
      </div>
      
      {status === 'loading' && (
        <div className="flex items-center gap-2 mb-4">
          <Spinner size="sm" />
          <span>Loading...</span>
        </div>
      )}
      
      {message && (
        <div className={`p-3 rounded mb-4 ${
          status === 'success' ? 'bg-green-800' : 
          status === 'error' ? 'bg-red-800' : 'bg-blue-800'
        }`}>
          {message}
        </div>
      )}
      
      {gameState && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Loaded Game State:</h3>
          <pre className="bg-gray-900 p-3 rounded overflow-auto max-h-60">
            {JSON.stringify(gameState, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
} 