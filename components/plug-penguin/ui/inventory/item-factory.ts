import { InventoryItem, ItemType, EquipmentSlot } from '@/lib/store'

// Item templates for different item types
const consumableTemplates: InventoryItem[] = [
  {
    id: 'health-potion',
    name: 'Health Potion',
    description: 'Restores 25 health points',
    type: 'consumable',
    value: 50,
    quantity: 1,
    rarity: 'common',
    effects: {
      health: 25
    },
    image: '🧪'
  },
  {
    id: 'energy-drink',
    name: 'Energy Drink',
    description: 'Increases stamina regeneration for 30 seconds',
    type: 'consumable',
    value: 75,
    quantity: 1,
    rarity: 'uncommon',
    effects: {
      stamina: 15
    },
    duration: 30,
    image: '🥤'
  },
  {
    id: 'fish',
    name: 'Fresh Fish',
    description: 'A tasty fish that restores health and energy',
    type: 'consumable',
    value: 30,
    quantity: 1,
    rarity: 'common',
    effects: {
      health: 10,
      stamina: 10
    },
    image: '🐟'
  }
]

const equipmentTemplates: InventoryItem[] = [
  {
    id: 'winter-coat',
    name: 'Winter Coat',
    description: 'Keeps you warm in cold environments',
    type: 'equipment',
    equipmentSlot: 'body',
    value: 200,
    quantity: 1,
    rarity: 'uncommon',
    stats: { defense: 5, coldResistance: 15 },
    image: '🧥'
  },
  {
    id: 'snow-boots',
    name: 'Snow Boots',
    description: 'Improves movement speed on snow',
    type: 'equipment',
    equipmentSlot: 'feet',
    value: 150,
    quantity: 1,
    rarity: 'common',
    stats: { defense: 3, movementSpeed: 10 },
    image: '👢'
  },
  {
    id: 'fishing-hat',
    name: 'Fishing Hat',
    description: 'Increases fishing success rate',
    type: 'equipment',
    equipmentSlot: 'head',
    value: 100,
    quantity: 1,
    rarity: 'uncommon',
    stats: { fishingSkill: 10 },
    image: '🎩'
  }
]

const vehicleTemplates: InventoryItem[] = [
  {
    id: 'snowmobile',
    name: 'Snowmobile',
    description: 'Fast transportation across snow',
    type: 'vehicle',
    value: 1000,
    quantity: 1,
    rarity: 'rare',
    vehicleType: 'snowboard',
    vehicleStats: {
      speed: 30,
      handling: 20,
      acceleration: 15
    },
    image: '🛵'
  },
  {
    id: 'ice-boat',
    name: 'Ice Boat',
    description: 'Allows travel across frozen lakes',
    type: 'vehicle',
    value: 800,
    quantity: 1,
    rarity: 'rare',
    vehicleType: 'plane',
    vehicleStats: {
      speed: 25,
      handling: 15,
      acceleration: 10
    },
    image: '⛵'
  },
  {
    id: 'fighter-jet-pookie',
    name: 'Pookie Fighter Jet',
    description: 'A military-grade stealth fighter with twin engines and advanced weapons systems',
    type: 'vehicle',
    value: 10000,
    quantity: 1,
    rarity: 'legendary',
    vehicleType: 'plane',
    vehicleStats: {
      speed: 80,
      handling: 35,
      acceleration: 40
    },
    image: '✈️'
  }
]

const weaponTemplates: InventoryItem[] = [
  {
    id: 'ice-pick',
    name: 'Ice Pick',
    description: 'Useful for climbing and self-defense',
    type: 'weapon',
    value: 200,
    quantity: 1,
    rarity: 'uncommon',
    damage: 10,
    range: 5,
    stats: { critChance: 15 },
    image: '⛏️'
  }
]

const resourceTemplates: InventoryItem[] = [
  {
    id: 'ice-chunk',
    name: 'Ice Chunk',
    description: 'A large piece of ice, useful for crafting',
    type: 'resource',
    value: 20,
    quantity: 1,
    rarity: 'common',
    image: '🧊'
  },
  {
    id: 'wood',
    name: 'Wood',
    description: 'Basic building material',
    type: 'resource',
    value: 15,
    quantity: 1,
    rarity: 'common',
    image: '🪵'
  },
  {
    id: 'metal-scrap',
    name: 'Metal Scrap',
    description: 'Salvaged metal pieces',
    type: 'resource',
    value: 30,
    quantity: 1,
    rarity: 'uncommon',
    image: '🔧'
  }
]

const currencyTemplates: InventoryItem[] = [
  {
    id: 'gold-coin',
    name: 'Gold Coin',
    description: 'Standard currency',
    type: 'currency',
    value: 1,
    quantity: 1,
    rarity: 'common',
    image: '🪙'
  },
  {
    id: 'diamond',
    name: 'Diamond',
    description: 'Valuable gem used as premium currency',
    type: 'currency',
    value: 100,
    quantity: 1,
    rarity: 'rare',
    image: '💎'
  }
]

const collectibleTemplates: InventoryItem[] = [
  {
    id: 'rare-feather',
    name: 'Rare Penguin Feather',
    description: 'A collectible feather from a rare penguin species',
    type: 'collectible',
    value: 500,
    quantity: 1,
    rarity: 'rare',
    image: '🪶'
  },
  {
    id: 'ancient-artifact',
    name: 'Ancient Artifact',
    description: 'A mysterious artifact from an ancient civilization',
    type: 'collectible',
    value: 1000,
    quantity: 1,
    rarity: 'legendary',
    image: '🏺'
  }
]

// Combine all templates
const allItemTemplates: Record<ItemType, InventoryItem[]> = {
  consumable: consumableTemplates,
  equipment: equipmentTemplates,
  vehicle: vehicleTemplates,
  weapon: weaponTemplates,
  resource: resourceTemplates,
  currency: currencyTemplates,
  collectible: collectibleTemplates
}

/**
 * Creates a random item of the specified type or a random type if none specified
 */
export function createRandomItem(type?: ItemType): InventoryItem {
  // If no type specified, choose a random type
  if (!type) {
    const types = Object.keys(allItemTemplates) as ItemType[]
    type = types[Math.floor(Math.random() * types.length)]
  }
  
  // Get templates for the specified type
  const templates = allItemTemplates[type]
  
  // Choose a random template
  const template = templates[Math.floor(Math.random() * templates.length)]
  
  // Create a copy of the template with a unique ID
  return {
    ...template,
    id: `${template.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  }
}

/**
 * Creates multiple random items
 */
export function createRandomItems(count: number, type?: ItemType): InventoryItem[] {
  const items: InventoryItem[] = []
  
  for (let i = 0; i < count; i++) {
    items.push(createRandomItem(type))
  }
  
  return items
}

/**
 * Creates an item by name
 */
export function createItemByName(name: string): InventoryItem | null {
  // Search all templates for an item with the specified name
  for (const type in allItemTemplates) {
    const templates = allItemTemplates[type as ItemType]
    const template = templates.find((item: InventoryItem) => item.name.toLowerCase() === name.toLowerCase())
    
    if (template) {
      // Create a copy of the template with a unique ID
      return {
        ...template,
        id: `${template.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      }
    }
  }
  
  return null
}

export const createItem = (id: string): InventoryItem => {
  switch (id) {
    case 'fishing-rod':
      return {
        id: 'fishing-rod',
        name: 'Fishing Rod',
        description: 'Used for ice fishing',
        type: 'equipment',
        rarity: 'common',
        quantity: 1,
        value: 100,
        image: '/items/fishing-rod.png'
      }
      
    case 'racing-skis':
      return {
        id: 'racing-skis',
        name: 'Racing Skis',
        description: 'High-speed skis for racing',
        type: 'equipment',
        rarity: 'rare',
        quantity: 1,
        value: 500,
        image: '/items/racing-skis.png'
      }
      
    default:
      throw new Error(`Unknown item ID: ${id}`)
  }
} 