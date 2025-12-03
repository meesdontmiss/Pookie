/**
 * API client for dogfight game services
 */

// Types for leaderboard data
export interface DogfightLeaderboardEntry {
  id: string
  name: string
  score: number
  kills: number
  deaths: number
  timestamp: number
}

export interface DogfightLeaderboardResponse {
  success: boolean
  data: DogfightLeaderboardEntry[]
}

export interface DogfightScoreSubmissionResponse {
  success: boolean
  data?: {
    position: number
    totalPlayers: number
  }
  error?: string
}

/**
 * Get the current dogfight leaderboard
 */
export async function getDogfightLeaderboard(): Promise<DogfightLeaderboardEntry[]> {
  try {
    const response = await fetch('/api/dogfight', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch leaderboard: ${response.status}`)
    }
    
    const data: DogfightLeaderboardResponse = await response.json()
    
    if (!data.success) {
      throw new Error('Failed to fetch leaderboard')
    }
    
    return data.data
  } catch (error) {
    console.error('Error fetching dogfight leaderboard:', error)
    return []
  }
}

/**
 * Submit a score to the dogfight leaderboard
 */
export async function submitDogfightScore(
  name: string, 
  score: number, 
  kills: number, 
  deaths: number
): Promise<DogfightScoreSubmissionResponse> {
  try {
    const response = await fetch('/api/dogfight', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        score,
        kills,
        deaths
      })
    })
    
    if (!response.ok) {
      return {
        success: false,
        error: `Server error: ${response.status}`
      }
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error submitting dogfight score:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Calculate score from game stats
 */
export function calculateDogfightScore(
  kills: number, 
  deaths: number, 
  time: number
): number {
  // Base score calculation
  // 100 points per kill
  // -50 points per death
  // +1 point per second survived
  const killPoints = kills * 100
  const deathPenalty = deaths * -50
  const survivalPoints = Math.floor(time)
  
  // Total score (minimum 0)
  return Math.max(0, killPoints + deathPenalty + survivalPoints)
} 