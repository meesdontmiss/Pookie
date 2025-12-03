'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, Button, Tabs, Tab, Chip } from '@nextui-org/react'
import { Package, X, ShoppingBag, Shirt, Trash2 } from 'lucide-react'
import { useGameStore } from '@/lib/store'
import { ItemType } from '@/lib/store'

interface InventoryUIProps {
  isOpen: boolean
  onClose: () => void
}

export function InventoryUI({ isOpen, onClose }: InventoryUIProps) {
  const { getState, removeInventoryItem, equipItem, unequipItem, useItem } = useGameStore()
  const [selectedTab, setSelectedTab] = useState<ItemType | 'all'>('all')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  
  // Get inventory data from the store
  const inventory = getState().inventory
  const inventoryCapacity = getState().inventoryCapacity
  
  // Filter items based on selected tab
  const filteredItems = selectedTab === 'all' 
    ? inventory 
    : inventory.filter(item => item.type === selectedTab)
  
  // Get the selected item details
  const selectedItemDetails = selectedItem 
    ? inventory.find(item => item.id === selectedItem) 
    : null
  
  // Handle item selection
  const handleSelectItem = (itemId: string) => {
    setSelectedItem(itemId === selectedItem ? null : itemId)
  }
  
  // Handle item use
  const handleUseItem = () => {
    if (selectedItem) {
      useItem(selectedItem)
      setSelectedItem(null)
    }
  }
  
  // Handle item equip/unequip
  const handleEquipItem = () => {
    if (selectedItem) {
      const item = inventory.find(item => item.id === selectedItem)
      if (item?.equipped) {
        unequipItem(selectedItem)
      } else {
        equipItem(selectedItem)
      }
    }
  }
  
  // Handle item drop
  const handleDropItem = () => {
    if (selectedItem) {
      removeInventoryItem(selectedItem)
      setSelectedItem(null)
    }
  }
  
  // Close inventory with ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-[90%] max-w-[800px] h-[80%] max-h-[600px]">
        <CardHeader className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Inventory</h2>
            <p className="text-sm text-gray-500">
              {inventory.length} / {inventoryCapacity} items
            </p>
          </div>
          <Button isIconOnly color="danger" variant="light" onClick={onClose}>
            <X size={20} />
          </Button>
        </CardHeader>
        
        <CardBody className="flex flex-col gap-4 p-4 overflow-hidden">
          <Tabs 
            aria-label="Inventory Categories" 
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as ItemType | 'all')}
            className="w-full"
          >
            <Tab key="all" title="All" />
            <Tab key="equipment" title="Equipment" />
            <Tab key="consumable" title="Consumables" />
            <Tab key="weapon" title="Weapons" />
            <Tab key="vehicle" title="Vehicles" />
            <Tab key="resource" title="Resources" />
            <Tab key="collectible" title="Collectibles" />
          </Tabs>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow overflow-y-auto">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Items</h3>
              {filteredItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No items found</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredItems.map(item => (
                    <div 
                      key={item.id}
                      className={`p-2 rounded-lg cursor-pointer transition-all ${
                        selectedItem === item.id 
                          ? 'bg-primary-100 dark:bg-primary-900 border-2 border-primary' 
                          : 'bg-white dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      onClick={() => handleSelectItem(item.id)}
                    >
                      <div className="aspect-square bg-gray-200 dark:bg-gray-600 rounded-md mb-1 flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="text-xs font-medium truncate">{item.name}</div>
                      {item.quantity > 1 && (
                        <Chip size="sm" variant="flat" className="mt-1">
                          x{item.quantity}
                        </Chip>
                      )}
                      {item.equipped && (
                        <Chip size="sm" color="success" variant="flat" className="mt-1">
                          Equipped
                        </Chip>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-2">Details</h3>
              {selectedItemDetails ? (
                <div className="flex flex-col gap-3">
                  <div className="aspect-square w-24 mx-auto bg-gray-200 dark:bg-gray-600 rounded-md flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                  
                  <h4 className="text-lg font-bold text-center">{selectedItemDetails.name}</h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">Type:</div>
                    <div className="font-medium capitalize">{selectedItemDetails.type}</div>
                    
                    <div className="text-gray-500">Rarity:</div>
                    <div className="font-medium capitalize">{selectedItemDetails.rarity}</div>
                    
                    {selectedItemDetails.type === 'equipment' && selectedItemDetails.equipmentSlot && (
                      <>
                        <div className="text-gray-500">Slot:</div>
                        <div className="font-medium capitalize">{selectedItemDetails.equipmentSlot}</div>
                      </>
                    )}
                    
                    {selectedItemDetails.value > 0 && (
                      <>
                        <div className="text-gray-500">Value:</div>
                        <div className="font-medium">${selectedItemDetails.value}</div>
                      </>
                    )}
                  </div>
                  
                  <p className="text-sm mt-2">{selectedItemDetails.description}</p>
                  
                  <div className="flex gap-2 mt-4">
                    {selectedItemDetails.type === 'equipment' && (
                      <Button 
                        color={selectedItemDetails.equipped ? "danger" : "primary"}
                        variant="flat"
                        fullWidth
                        startContent={<Shirt className="w-4 h-4" />}
                        onClick={handleEquipItem}
                      >
                        {selectedItemDetails.equipped ? 'Unequip' : 'Equip'}
                      </Button>
                    )}
                    
                    {(selectedItemDetails.type === 'consumable' || selectedItemDetails.type === 'vehicle') && (
                      <Button 
                        color="primary"
                        variant="flat"
                        fullWidth
                        startContent={<ShoppingBag className="w-4 h-4" />}
                        onClick={handleUseItem}
                      >
                        Use
                      </Button>
                    )}
                    
                    <Button 
                      color="danger"
                      variant="light"
                      isIconOnly
                      onClick={handleDropItem}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Select an item to view details</p>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
} 