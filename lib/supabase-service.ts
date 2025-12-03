import { supabase } from '@/services/supabase-config'
import { GameState, useGameStore } from './store'
import { Player } from '@/components/game/player'

// Throttle save operations to prevent too many requests
let saveTimeout: NodeJS.Timeout | null = null
const SAVE_DELAY = 5000 // 5 seconds

/**
 * Save game state to Supabase
 * @param userId User ID to save state for
 * @param state Game state to save
 */
export async function saveGameState(userId: string, state: Partial<GameState>) {
  if (!userId) {
    console.warn('Cannot save game state: missing user ID')
    return
  }
  
  try {
    // Only save essential data
    const dataToSave = {
      user_id: userId,
      inventory: state.inventory || [],
      equipped_items: state.equippedItems || {},
      active_vehicle: state.activeVehicle,
      money: state.money || 0,
      reputation: state.reputation || 0,
      dealer_level: state.dealerLevel || 1,
      position: state.currentPlayer?.position || [-59.50, 0.00, 15.34],
      // last_saved is updated automatically by the database trigger
    }
    
    // Upsert data (insert if not exists, update if exists)
    const { error } = await supabase
      .from('game_states')
      .upsert(dataToSave, { onConflict: 'user_id' })
    
    if (error) {
      console.error('Error saving game state:', error)
    } else {
      console.log('Game state saved successfully')
    }
  } catch (error) {
    console.error('Error saving game state:', error)
  }
}

/**
 * Throttled save function to prevent too many saves
 */
export function throttledSaveGameState(userId: string, state: Partial<GameState>) {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  saveTimeout = setTimeout(() => {
    saveGameState(userId, state)
    saveTimeout = null
  }, SAVE_DELAY)
}

/**
 * Load game state from Supabase
 * @param userId User ID to load state for
 * @returns Loaded game state or null if not found
 */
export async function loadGameState(userId: string): Promise<Partial<GameState> | null> {
  if (!userId) {
    console.warn('Cannot load game state: missing user ID')
    return null
  }
  
  try {
    const { data, error } = await supabase
      .from('game_states')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No data found, this is a new user
        console.log('No saved game state found for user')
        return null
      }
      
      console.error('Error loading game state:', error)
      return null
    }
    
    if (!data) {
      return null
    }
    
    // Transform data back to GameState format
    return {
      inventory: data.inventory || [],
      equippedItems: data.equipped_items || {},
      activeVehicle: data.active_vehicle,
      money: data.money || 0,
      reputation: data.reputation || 0,
      dealerLevel: data.dealer_level || 1,
      currentPlayer: data.position ? {
        id: userId,
        position: data.position as [number, number, number],
        rotation: [0, 0, 0] as [number, number, number],
        name: 'Player',
        model: 'default',
        isNFTHolder: false,
        isTokenHolder: false
      } as Player : null,
    }
  } catch (error) {
    console.error('Error loading game state:', error)
    return null
  }
}

/**
 * Initialize auto-save functionality
 * @param userId User ID to save state for
 */
export function initAutoSave(userId: string) {
  if (!userId) {
    console.warn('Cannot initialize auto-save: missing user ID')
    return () => {}
  }
  
  const { subscribe, getState } = useGameStore()
  
  // Subscribe to state changes and save when relevant parts change
  const unsubscribe = subscribe((state) => {
    // Only save when important state changes
    throttledSaveGameState(userId, {
      inventory: state.inventory,
      equippedItems: state.equippedItems,
      activeVehicle: state.activeVehicle,
      money: state.money,
      reputation: state.reputation,
      dealerLevel: state.dealerLevel,
      currentPlayer: state.currentPlayer,
    })
  })
  
  // Return unsubscribe function to clean up
  return unsubscribe
}

/**
 * Initialize game state from saved data
 * @param userId User ID to load state for
 */
export async function initGameState(userId: string): Promise<boolean> {
  if (!userId) {
    console.warn('Cannot initialize game state: missing user ID')
    return false
  }
  
  try {
    const savedState = await loadGameState(userId)
    
    if (!savedState) {
      console.log('No saved game state found, using default state')
      return false
    }
    
    // Get the setState function from the store module
    const setState = (state: Partial<GameState>) => {
      const store = useGameStore()
      const currentState = store.getState()
      
      // Update each property in the store
      if (state.inventory) {
        // Add each inventory item individually
        state.inventory.forEach(item => {
          store.addInventoryItem(item)
        })
      }
      if (state.equippedItems && state.inventory) {
        // Re-equip items
        Object.entries(state.equippedItems).forEach(([slot, itemId]) => {
          if (itemId) store.equipItem(itemId)
        })
      }
      if (state.activeVehicle) store.setActiveVehicle(state.activeVehicle)
      if (state.money !== undefined) {
        const moneyDiff = state.money - currentState.money
        if (moneyDiff > 0) store.addMoney(moneyDiff)
        else if (moneyDiff < 0) store.removeMoney(Math.abs(moneyDiff))
      }
      if (state.reputation !== undefined) {
        const repDiff = state.reputation - currentState.reputation
        if (repDiff > 0) store.addReputation(repDiff)
        else if (repDiff < 0) store.removeReputation(Math.abs(repDiff))
      }
      if (state.dealerLevel !== undefined) {
        while (currentState.dealerLevel < state.dealerLevel) {
          store.increaseDealerLevel()
        }
      }
      if (state.currentPlayer) {
        store.setCurrentPlayer(state.currentPlayer)
      }
    }
    
    // Update state with saved data
    setState(savedState)
    
    console.log('Game state loaded successfully')
    return true
  } catch (error) {
    console.error('Error initializing game state:', error)
    return false
  }
} 