'use client'

import { useState, useEffect } from 'react'
import { Button, Badge, Tooltip } from '@nextui-org/react'
import { Backpack, ChevronUp, ChevronDown, Package } from 'lucide-react'
import { useGameStore } from '@/lib/store'
import { InventoryUI } from './inventory-ui'

export function InventoryButton() {
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [itemCount, setItemCount] = useState(0)
  const { getState, subscribe } = useGameStore()
  
  // Update item count when inventory changes
  useEffect(() => {
    // Initial count
    setItemCount(getState().inventory.length)
    
    // Subscribe to inventory changes
    const unsubscribe = subscribe((state) => {
      setItemCount(state.inventory.length)
    })
    
    return unsubscribe
  }, [getState, subscribe])
  
  // Toggle inventory with I key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'i' || e.key === 'I') {
        setIsInventoryOpen(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  // Get first few inventory items for preview
  const previewItems = getState().inventory.slice(0, 3)
  
  return (
    <>
      <div className="flex flex-col items-end">
        {/* Main button without badge */}
        <Button
          isIconOnly
          color="primary"
          variant="shadow"
          aria-label="Open Inventory"
          className="bg-blue-600 hover:bg-blue-700 transition-all shadow-lg w-14 h-14 rounded-xl"
          onClick={() => setIsInventoryOpen(true)}
        >
          <Backpack className="w-7 h-7 text-white" strokeWidth={2} />
        </Button>
        
        {/* Preview toggle button */}
        <Button
          size="sm"
          variant="flat"
          className="mt-1 bg-blue-800/80 text-white px-2 py-0 min-w-0 h-6"
          onClick={() => setIsPreviewOpen(!isPreviewOpen)}
          endContent={isPreviewOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        >
          {isPreviewOpen ? "Hide" : "Preview"}
        </Button>
        
        {/* Inventory preview panel */}
        {isPreviewOpen && (
          <div className="mt-2 bg-black/80 backdrop-blur-md p-3 rounded-lg border border-blue-500/30 w-48 shadow-lg">
            <h3 className="text-white text-xs font-bold mb-2 flex items-center">
              <Backpack size={14} className="mr-1" />
              Inventory ({itemCount}/{getState().inventoryCapacity || 20})
            </h3>
            
            {itemCount === 0 ? (
              <div className="text-gray-400 text-xs italic py-2 text-center">
                Your inventory is empty
              </div>
            ) : (
              <div className="space-y-2">
                {previewItems.map((item, index) => (
                  <div key={index} className="flex items-center text-white text-xs bg-blue-900/50 p-1 rounded">
                    <div className="w-6 h-6 bg-blue-800/80 rounded flex items-center justify-center mr-2">
                      <Package size={14} />
                    </div>
                    <div className="flex-1 truncate">{item.name}</div>
                    {item.quantity > 1 && (
                      <div className="bg-blue-700 px-1 rounded text-[10px]">
                        x{item.quantity}
                      </div>
                    )}
                  </div>
                ))}
                
                {itemCount > 3 && (
                  <div className="text-blue-300 text-xs text-center mt-1">
                    +{itemCount - 3} more items
                  </div>
                )}
                
                <Button
                  size="sm"
                  color="primary"
                  className="w-full mt-2 text-xs"
                  onClick={() => setIsInventoryOpen(true)}
                >
                  Open Full Inventory
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <InventoryUI 
        isOpen={isInventoryOpen} 
        onClose={() => setIsInventoryOpen(false)} 
      />
    </>
  )
} 