import { v4 as uuidv4 } from 'uuid'
import { InventoryItem, ItemType } from '@/lib/store'

export interface CollectibleItemData {
  id: string
  name: string
  description: string
  modelPath: string
  position: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  type: ItemType
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  value: number
  glowColor?: string
  itemData: Partial<InventoryItem>
}

// Helper function to generate a unique ID
const generateId = (prefix: string) => `${prefix}_${uuidv4().slice(0, 8)}`

export const collectibleItems: CollectibleItemData[] = [
  // Consumable items
  {
    id: generateId('consumable'),
    name: 'Lean Cup',
    description: 'A styrofoam cup filled with lean that gives you energy.',
    modelPath: '/models/consumables/lean_cup.glb',
    position: [-54.74, 2, 6], // New location, raised above ground
    scale: 2, // 25x bigger than original
    type: 'consumable',
    rarity: 'common',
    value: 25,
    itemData: {
      type: 'consumable',
      effects: {
        energy: 30,
        mood: 20,
      },
      duration: 60, // 60 seconds
      description: 'A styrofoam cup filled with lean that gives you energy and improves your mood for a short time.',
    }
  },
  {
    id: generateId('consumable'),
    name: 'Promethazine Lean',
    description: 'A bottle of promethazine lean that provides strong effects.',
    modelPath: '/models/consumables/promethazine_lean.glb',
    position: [-50.74, 1, 6], // 4 units to the right
    scale: 2,
    type: 'consumable',
    rarity: 'rare',
    value: 150,
    itemData: {
      type: 'consumable',
      effects: {
        energy: 50,
        mood: 40,
        health: 20,
      },
      duration: 90, // 90 seconds
      description: 'A bottle of promethazine lean that provides strong effects. Use with caution.',
    }
  },
  {
    id: generateId('consumable'),
    name: 'Fat Joint',
    description: 'A large joint that temporarily increases your mood.',
    modelPath: '/models/consumables/fat_joint.glb',
    position: [-58.74, 2, 6], // 4 units to the left
    scale: 2.0, // Increased to 30 as requested
    type: 'consumable',
    rarity: 'uncommon',
    value: 100,
    itemData: {
      type: 'consumable',
      effects: {
        mood: 50,
      },
      duration: 30, // 30 seconds
      description: 'A large joint that temporarily increases your mood.',
    }
  }
]

// Export a function to get a collectible by ID
export function getCollectibleById(id: string): CollectibleItemData | undefined {
  return collectibleItems.find(item => item.id === id)
}

// Export a function to get collectibles by type
export function getCollectiblesByType(type: ItemType): CollectibleItemData[] {
  return collectibleItems.filter(item => item.type === type)
} 