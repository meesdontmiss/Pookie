'use client'

import { useState } from 'react'
import Image from 'next/image'

// Define item types
export type ItemType = 'hat' | 'weapon' | 'snowboard' | 'airplane' | 'drug' | 'equipment' | 'clothing'

// Define store item interface
export interface StoreItem {
  id: string
  name: string
  description: string
  price: number
  type: ItemType
  image: string
  stats?: {
    damage?: number
    speed?: number
    handling?: number
    range?: number
    altitude?: number
    purity?: number
  }
}

// Sample store items
const STORE_ITEMS: StoreItem[] = [
  // Hats
  {
    id: 'hat-beanie',
    name: 'Cozy Beanie',
    description: 'A warm beanie to keep your penguin head toasty',
    price: 50,
    type: 'hat',
    image: '/items/beanie.png'
  },
  {
    id: 'hat-tophat',
    name: 'Fancy Top Hat',
    description: 'For the distinguished penguin about town',
    price: 200,
    type: 'hat',
    image: '/items/tophat.png'
  },
  {
    id: 'hat-crown',
    name: 'Royal Crown',
    description: 'Rule the ice with this majestic crown',
    price: 1000,
    type: 'hat',
    image: '/items/crown.png'
  },
  
  // Weapons
  {
    id: 'weapon-ice-blaster',
    name: 'Ice Blaster',
    description: 'Freeze your enemies in their tracks',
    price: 500,
    type: 'weapon',
    image: '/items/ice-blaster.png',
    stats: {
      damage: 20,
      range: 25
    }
  },
  
  // Snowboards
  {
    id: 'snowboard-basic',
    name: 'Basic Snowboard',
    description: 'A simple snowboard for beginners',
    price: 200,
    type: 'snowboard',
    image: '/items/snowboard-basic.png',
    stats: {
      speed: 10,
      handling: 8
    }
  },
  {
    id: 'snowboard-pro',
    name: 'Pro Snowboard',
    description: 'High-performance snowboard for tricks and speed',
    price: 800,
    type: 'snowboard',
    image: '/items/snowboard-pro.png',
    stats: {
      speed: 18,
      handling: 15
    }
  },
  
  // Airplanes
  {
    id: 'airplane-propeller',
    name: 'Propeller Plane',
    description: 'A basic propeller plane for short flights',
    price: 1500,
    type: 'airplane',
    image: '/items/airplane-propeller.png',
    stats: {
      speed: 25,
      handling: 12,
      altitude: 100
    }
  },
  {
    id: 'airplane-jet',
    name: 'Penguin Jet',
    description: 'A high-speed jet for the ultimate flying experience',
    price: 5000,
    type: 'airplane',
    image: '/items/airplane-jet.png',
    stats: {
      speed: 50,
      handling: 20,
      altitude: 200
    }
  },
  {
    id: 'fighter-jet-pookie',
    name: 'Pookie Fighter Jet',
    description: 'A military-grade stealth fighter with twin engines and advanced weapons systems',
    price: 10000,
    type: 'airplane',
    image: '/items/fighter-jet.png',
    stats: {
      speed: 80,
      handling: 35,
      altitude: 300,
      damage: 50
    }
  },
  
  // Drugs (for the drug dealing leaderboard)
  {
    id: 'drug-snow-powder',
    name: 'Snow Powder',
    description: 'The basic product for aspiring dealers',
    price: 100,
    type: 'drug',
    image: '/items/snow-powder.png',
    stats: {
      purity: 60
    }
  },
  {
    id: 'drug-ice-crystals',
    name: 'Ice Crystals',
    description: 'Premium product for serious dealers',
    price: 500,
    type: 'drug',
    image: '/items/ice-crystals.png',
    stats: {
      purity: 90
    }
  },
  {
    id: 'fishing-rod',
    name: 'Fishing Rod',
    description: 'Essential for ice fishing',
    price: 100,
    type: 'equipment',
    image: '/items/fishing-rod.png',
  },
  {
    id: 'racing-skis',
    name: 'Racing Skis',
    description: 'High-performance skis for racing',
    price: 500,
    type: 'equipment',
    image: '/items/racing-skis.png',
  },
  {
    id: 'winter-coat',
    name: 'Winter Coat',
    description: 'Stylish and warm winter coat',
    price: 200,
    type: 'clothing',
    image: '/items/winter-coat.png',
  }
]

interface StoreUIProps {
  playerCoins: number
  onPurchase: (item: StoreItem) => void
  onClose: () => void
  storeType?: ItemType | 'all'
}

export function StoreUI({ playerCoins, onPurchase, onClose, storeType = 'all' }: StoreUIProps) {
  const [selectedCategory, setSelectedCategory] = useState<ItemType | 'all'>(storeType)
  const [selectedItem, setSelectedItem] = useState<StoreItem | null>(null)
  
  // Filter items based on selected category
  const filteredItems = selectedCategory === 'all' 
    ? STORE_ITEMS 
    : STORE_ITEMS.filter(item => item.type === selectedCategory)
  
  // Handle purchase
  const handlePurchase = (item: StoreItem) => {
    if (playerCoins >= item.price) {
      onPurchase(item)
    } else {
      alert('Not enough coins!')
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Penguin Store</h2>
          <div className="flex items-center gap-4">
            <span className="text-yellow-400 font-bold flex items-center">
              <span className="mr-1">🪙</span> {playerCoins} Coins
            </span>
            <button 
              onClick={onClose}
              className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
        
        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(['all', 'hat', 'weapon', 'snowboard', 'airplane', 'drug', 'equipment', 'clothing'] as const).map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCategory === category 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {category === 'all' ? 'All Items' : `${category.charAt(0).toUpperCase() + category.slice(1)}s`}
            </button>
          ))}
        </div>
        
        <div className="flex flex-1 gap-4 overflow-hidden">
          {/* Items grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto p-2 flex-1">
            {filteredItems.map(item => (
              <div 
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`bg-gray-700 rounded-lg p-3 cursor-pointer transition-all hover:bg-gray-600 ${
                  selectedItem?.id === item.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="aspect-square bg-gray-800 rounded-lg mb-2 flex items-center justify-center">
                  {/* Placeholder for item image */}
                  <div className="w-20 h-20 bg-gray-600 rounded-lg flex items-center justify-center text-3xl">
                    {item.type === 'hat' && '🧢'}
                    {item.type === 'weapon' && '❄️'}
                    {item.type === 'snowboard' && '🏂'}
                    {item.type === 'airplane' && '✈️'}
                    {item.type === 'drug' && '❄️'}
                    {item.type === 'equipment' && '🎣'}
                    {item.type === 'clothing' && '🧥'}
                  </div>
                </div>
                <h3 className="text-white font-medium">{item.name}</h3>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-yellow-400 font-bold flex items-center">
                    <span className="mr-1">🪙</span> {item.price}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    playerCoins >= item.price ? 'bg-green-700 text-green-100' : 'bg-red-700 text-red-100'
                  }`}>
                    {playerCoins >= item.price ? 'Available' : 'Too Expensive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Item details */}
          {selectedItem && (
            <div className="w-1/3 bg-gray-700 rounded-lg p-4 overflow-y-auto hidden md:block">
              <h3 className="text-xl font-bold text-white mb-2">{selectedItem.name}</h3>
              <div className="aspect-square bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
                {/* Placeholder for item image */}
                <div className="w-32 h-32 bg-gray-600 rounded-lg flex items-center justify-center text-6xl">
                  {selectedItem.type === 'hat' && '🧢'}
                  {selectedItem.type === 'weapon' && '❄️'}
                  {selectedItem.type === 'snowboard' && '🏂'}
                  {selectedItem.type === 'airplane' && '✈️'}
                  {selectedItem.type === 'drug' && '❄️'}
                  {selectedItem.type === 'equipment' && '🎣'}
                  {selectedItem.type === 'clothing' && '🧥'}
                </div>
              </div>
              <p className="text-gray-300 mb-4">{selectedItem.description}</p>
              
              {/* Item stats */}
              {selectedItem.stats && (
                <div className="mb-4">
                  <h4 className="text-white font-medium mb-2">Stats:</h4>
                  <div className="space-y-2">
                    {selectedItem.stats.damage && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Damage:</span>
                        <span className="text-white">{selectedItem.stats.damage}</span>
                      </div>
                    )}
                    {selectedItem.stats.speed && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Speed:</span>
                        <span className="text-white">{selectedItem.stats.speed}</span>
                      </div>
                    )}
                    {selectedItem.stats.handling && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Handling:</span>
                        <span className="text-white">{selectedItem.stats.handling}</span>
                      </div>
                    )}
                    {selectedItem.stats.range && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Range:</span>
                        <span className="text-white">{selectedItem.stats.range}</span>
                      </div>
                    )}
                    {selectedItem.stats.altitude && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Altitude:</span>
                        <span className="text-white">{selectedItem.stats.altitude}</span>
                      </div>
                    )}
                    {selectedItem.stats.purity && (
                      <div className="flex justify-between">
                        <span className="text-gray-300">Purity:</span>
                        <span className="text-white">{selectedItem.stats.purity}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => handlePurchase(selectedItem)}
                disabled={playerCoins < selectedItem.price}
                className={`w-full py-2 rounded font-medium ${
                  playerCoins >= selectedItem.price
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                } transition-colors`}
              >
                {playerCoins >= selectedItem.price ? 'Purchase' : 'Not Enough Coins'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 