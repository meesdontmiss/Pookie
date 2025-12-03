'use client'

import { useState, useEffect } from 'react'

// Define dealer ranks from lowest to highest
export const DEALER_RANKS = [
  { id: 'custy', name: 'Custy', minScore: 0, color: '#90a4ae' },
  { id: 'rookie', name: 'Rookie Dealer', minScore: 100, color: '#4fc3f7' },
  { id: 'street', name: 'Street Dealer', minScore: 500, color: '#4db6ac' },
  { id: 'supplier', name: 'Supplier', minScore: 1500, color: '#ffb74d' },
  { id: 'distributor', name: 'Distributor', minScore: 5000, color: '#ff8a65' },
  { id: 'kingpin', name: 'Kingpin', minScore: 15000, color: '#f44336' }
]

// Define dealer profile interface
export interface DealerProfile {
  id: string
  username: string
  score: number
  salesCount: number
  territoryClaimed: number
  lastActive: Date
  avatar?: string
}

// Sample dealer data (would be fetched from a database in a real app)
const SAMPLE_DEALERS: DealerProfile[] = [
  {
    id: 'dealer1',
    username: 'IceKing',
    score: 18500,
    salesCount: 420,
    territoryClaimed: 5,
    lastActive: new Date(Date.now() - 1000 * 60 * 15) // 15 minutes ago
  },
  {
    id: 'dealer2',
    username: 'SnowQueen',
    score: 12300,
    salesCount: 350,
    territoryClaimed: 4,
    lastActive: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
  },
  {
    id: 'dealer3',
    username: 'FrostyDealer',
    score: 8700,
    salesCount: 210,
    territoryClaimed: 3,
    lastActive: new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
  },
  {
    id: 'dealer4',
    username: 'PenguinPusher',
    score: 4200,
    salesCount: 120,
    territoryClaimed: 2,
    lastActive: new Date(Date.now() - 1000 * 60 * 120) // 2 hours ago
  },
  {
    id: 'dealer5',
    username: 'ArcticHustler',
    score: 1800,
    salesCount: 75,
    territoryClaimed: 1,
    lastActive: new Date(Date.now() - 1000 * 60 * 180) // 3 hours ago
  },
  {
    id: 'dealer6',
    username: 'IcyNewbie',
    score: 450,
    salesCount: 30,
    territoryClaimed: 0,
    lastActive: new Date(Date.now() - 1000 * 60 * 240) // 4 hours ago
  },
  {
    id: 'dealer7',
    username: 'ColdFeet',
    score: 50,
    salesCount: 5,
    territoryClaimed: 0,
    lastActive: new Date(Date.now() - 1000 * 60 * 300) // 5 hours ago
  }
]

// Helper function to get dealer rank based on score
function getDealerRank(score: number) {
  // Find the highest rank the dealer qualifies for
  for (let i = DEALER_RANKS.length - 1; i >= 0; i--) {
    if (score >= DEALER_RANKS[i].minScore) {
      return DEALER_RANKS[i]
    }
  }
  return DEALER_RANKS[0] // Default to lowest rank
}

// Helper function to format time ago
function formatTimeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
  
  let interval = seconds / 31536000
  if (interval > 1) return Math.floor(interval) + ' years ago'
  
  interval = seconds / 2592000
  if (interval > 1) return Math.floor(interval) + ' months ago'
  
  interval = seconds / 86400
  if (interval > 1) return Math.floor(interval) + ' days ago'
  
  interval = seconds / 3600
  if (interval > 1) return Math.floor(interval) + ' hours ago'
  
  interval = seconds / 60
  if (interval > 1) return Math.floor(interval) + ' minutes ago'
  
  return Math.floor(seconds) + ' seconds ago'
}

interface DealerLeaderboardProps {
  currentUserId?: string
  onClose: () => void
}

export function DealerLeaderboard({ currentUserId, onClose }: DealerLeaderboardProps) {
  const [dealers, setDealers] = useState<DealerProfile[]>([])
  const [sortBy, setSortBy] = useState<'score' | 'salesCount' | 'territoryClaimed'>('score')
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)
  
  // Load dealer data
  useEffect(() => {
    // In a real app, this would fetch from a database
    const sortedDealers = [...SAMPLE_DEALERS].sort((a, b) => b[sortBy] - a[sortBy])
    setDealers(sortedDealers)
    
    // Find current user's rank if they're in the leaderboard
    if (currentUserId) {
      const userIndex = sortedDealers.findIndex(dealer => dealer.id === currentUserId)
      if (userIndex !== -1) {
        setCurrentUserRank(userIndex + 1)
      }
    }
  }, [currentUserId, sortBy])
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Dealer Leaderboard</h2>
          <button 
            onClick={onClose}
            className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>
        
        {/* Rank explanation */}
        <div className="bg-gray-700 p-3 rounded-lg mb-4">
          <h3 className="text-white font-medium mb-2">Dealer Ranks</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {DEALER_RANKS.map(rank => (
              <div key={rank.id} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: rank.color }}
                />
                <span className="text-gray-300 text-sm">
                  {rank.name} ({rank.minScore}+)
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Sort options */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSortBy('score')}
            className={`px-3 py-1 rounded text-sm ${
              sortBy === 'score' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Sort by Score
          </button>
          <button
            onClick={() => setSortBy('salesCount')}
            className={`px-3 py-1 rounded text-sm ${
              sortBy === 'salesCount' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Sort by Sales
          </button>
          <button
            onClick={() => setSortBy('territoryClaimed')}
            className={`px-3 py-1 rounded text-sm ${
              sortBy === 'territoryClaimed' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Sort by Territory
          </button>
        </div>
        
        {/* Current user stats if available */}
        {currentUserRank !== null && (
          <div className="bg-blue-900 p-3 rounded-lg mb-4">
            <h3 className="text-white font-medium mb-1">Your Ranking</h3>
            <p className="text-blue-200">
              You are ranked #{currentUserRank} out of {dealers.length} dealers
            </p>
          </div>
        )}
        
        {/* Leaderboard table */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-gray-700 sticky top-0">
              <tr>
                <th className="p-3 text-gray-300 font-medium">Rank</th>
                <th className="p-3 text-gray-300 font-medium">Dealer</th>
                <th className="p-3 text-gray-300 font-medium text-right">Score</th>
                <th className="p-3 text-gray-300 font-medium text-right hidden md:table-cell">Sales</th>
                <th className="p-3 text-gray-300 font-medium text-right hidden md:table-cell">Territory</th>
                <th className="p-3 text-gray-300 font-medium text-right hidden md:table-cell">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {dealers.map((dealer, index) => {
                const rank = getDealerRank(dealer.score)
                return (
                  <tr 
                    key={dealer.id} 
                    className={`border-b border-gray-700 ${
                      dealer.id === currentUserId ? 'bg-blue-900 bg-opacity-30' : ''
                    }`}
                  >
                    <td className="p-3 font-medium text-gray-300">#{index + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2" 
                          style={{ backgroundColor: rank.color }}
                        />
                        <span className="text-white">{dealer.username}</span>
                        <span className="ml-2 text-xs text-gray-400 hidden md:inline">
                          ({rank.name})
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium text-white">{dealer.score.toLocaleString()}</td>
                    <td className="p-3 text-right text-gray-300 hidden md:table-cell">{dealer.salesCount}</td>
                    <td className="p-3 text-right text-gray-300 hidden md:table-cell">
                      {dealer.territoryClaimed > 0 ? `${dealer.territoryClaimed} areas` : 'None'}
                    </td>
                    <td className="p-3 text-right text-gray-400 text-sm hidden md:table-cell">
                      {formatTimeAgo(dealer.lastActive)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* How to climb the ranks */}
        <div className="mt-4 bg-gray-700 p-3 rounded-lg">
          <h3 className="text-white font-medium mb-2">How to Climb the Ranks</h3>
          <ul className="text-gray-300 text-sm list-disc pl-5 space-y-1">
            <li>Buy products from the Black Market</li>
            <li>Sell to other players for a profit</li>
            <li>Claim territory to expand your operation</li>
            <li>Complete special missions for bonus points</li>
            <li>Protect your territory from rival dealers</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 