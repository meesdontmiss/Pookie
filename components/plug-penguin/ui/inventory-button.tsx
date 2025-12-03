'use client'

import { useState, useEffect } from 'react'
import { Button, Badge } from '@nextui-org/react'
import { Backpack } from 'lucide-react'
import { InventoryUI } from './inventory-ui'
import { useGameStore } from '@/lib/store'

export function InventoryButton() {
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [itemCount, setItemCount] = useState(0)
  const { subscribe, getState } = useGameStore()

  // Subscribe to inventory changes to update the badge
  useEffect(() => {
    const unsubscribe = subscribe((state) => {
      setItemCount(state.inventory.length)
    })
    
    // Initialize with current state
    setItemCount(getState().inventory.length)
    
    return () => unsubscribe()
  }, [subscribe, getState])

  // Toggle inventory with I key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'i' || e.key === 'I') {
        setIsInventoryOpen(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <>
      <Badge 
        content={itemCount} 
        isInvisible={itemCount === 0} 
        color="danger"
        size="lg"
        placement="top-right"
        classNames={{
          badge: "font-bold text-white"
        }}
      >
        <Button
          isIconOnly
          color="primary"
          variant="shadow"
          aria-label="Open Inventory"
          className="bg-blue-600 hover:bg-blue-700 transition-all shadow-lg w-14 h-14 rounded-xl"
          onPress={() => setIsInventoryOpen(true)}
        >
          <Backpack className="w-8 h-8 text-white" strokeWidth={2} />
        </Button>
      </Badge>
      
      <InventoryUI 
        isOpen={isInventoryOpen} 
        onClose={() => setIsInventoryOpen(false)} 
      />
    </>
  )
} 