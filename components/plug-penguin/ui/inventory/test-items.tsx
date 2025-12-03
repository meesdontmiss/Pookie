'use client'

import { useEffect } from 'react'
import { Button } from '@nextui-org/react'
import { Plus, Package } from 'lucide-react'
import { useGameStore } from '@/lib/store'
import { createRandomItem, createRandomItems } from './item-factory'

/**
 * Button component to add test items to the inventory
 */
export function TestItemsButton() {
  const { addInventoryItem } = useGameStore()
  
  // Add a single random item to the inventory
  function handleAddRandomItem() {
    const item = createRandomItem()
    addInventoryItem(item)
  }
  
  // Add multiple random items to the inventory
  function handleAddMultipleItems() {
    const items = createRandomItems(5)
    items.forEach(item => addInventoryItem(item))
  }
  
  return (
    <div className="flex flex-col gap-2">
      <Button 
        color="primary" 
        size="sm"
        variant="flat"
        startContent={<Plus size={16} />}
        onClick={handleAddRandomItem}
      >
        Add Item
      </Button>
      <Button 
        color="secondary" 
        size="sm"
        variant="flat"
        startContent={<Package size={16} />}
        onClick={handleAddMultipleItems}
      >
        Add 5 Items
      </Button>
    </div>
  )
}

/**
 * Component to add initial items to the inventory when it's empty
 */
export function InitialItems() {
  const { getState, addInventoryItem } = useGameStore()
  const inventory = getState().inventory
  
  // Add starter items to the inventory when it's empty
  useEffect(() => {
    if (inventory.length === 0) {
      // Add a health potion
      const healthPotion = createRandomItem('consumable')
      addInventoryItem(healthPotion)
      
      // Add a basic equipment item
      const equipment = createRandomItem('equipment')
      addInventoryItem(equipment)
      
      // Add some currency
      const currency = createRandomItem('currency')
      currency.quantity = 50
      addInventoryItem(currency)
    }
  }, [inventory.length, addInventoryItem])
  
  return null
} 