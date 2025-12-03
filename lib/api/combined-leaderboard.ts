/**
 * API client for combined game leaderboard services
 */
import { getDogfightLeaderboard, DogfightLeaderboardEntry } from './dogfight-api';

// Type for all minigame entries in the leaderboard
export interface LeaderboardEntry {
  id: string;
  name: string;
  tokens: number;     // Renamed from score to tokens
  game: string;       // Indicates which minigame this score is from
  timestamp: number;
  walletAddress?: string; // Optional wallet address for token rewards
  // Additional fields can vary by game type
  [key: string]: any;
}

/**
 * Get a combined leaderboard from all minigames, ranked by tokens earned
 */
export async function getCombinedLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    // Fetch dogfight leaderboard
    const dogfightEntries = await getDogfightLeaderboard();
    
    // Convert dogfight entries to combined format with tokens instead of score
    const dogfightFormatted: LeaderboardEntry[] = dogfightEntries.map(entry => ({
      id: entry.id,
      name: entry.name,
      tokens: Math.floor(entry.score / 100), // Convert scores to tokens (example conversion)
      game: 'Dogfight',
      timestamp: entry.timestamp,
      kills: entry.kills,
      deaths: entry.deaths,
      walletAddress: undefined
    }));
    
    // In the future, add other minigame leaderboards here
    // const fishingEntries = await getFishingLeaderboard();
    // const snowballEntries = await getSnowballLeaderboard();
    
    // Combine all leaderboards
    const combinedLeaderboard = [
      ...dogfightFormatted,
      // ...fishingFormatted,
      // ...snowballFormatted,
      
      // Add some dummy entries for other games to demonstrate the combined leaderboard
      {
        id: 'fishing-1',
        name: 'FishMaster',
        tokens: 95,
        game: 'Fishing',
        timestamp: Date.now() - 120000,
        catches: 19,
        rareFish: 3,
        walletAddress: '5XJaG...'
      },
      {
        id: 'fishing-2',
        name: 'AnglePro',
        tokens: 82,
        game: 'Fishing',
        timestamp: Date.now() - 180000,
        catches: 16,
        rareFish: 2,
        walletAddress: '8zR4B...'
      },
      {
        id: 'snowball-1',
        name: 'SnowKing',
        tokens: 89,
        game: 'Snowball',
        timestamp: Date.now() - 90000,
        hits: 32,
        headshots: 8,
        walletAddress: '9Tj7P...'
      },
      {
        id: 'snowball-2',
        name: 'IceThrower',
        tokens: 78,
        game: 'Snowball',
        timestamp: Date.now() - 200000,
        hits: 28,
        headshots: 6,
        walletAddress: '3mQnF...'
      }
    ];
    
    // Sort by tokens (highest first)
    return combinedLeaderboard.sort((a, b) => b.tokens - a.tokens);
  } catch (error) {
    console.error('Error fetching combined leaderboard:', error);
    return [];
  }
} 