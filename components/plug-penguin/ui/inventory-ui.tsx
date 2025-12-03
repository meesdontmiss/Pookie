'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, Button, Tabs, Tab, Chip, Tooltip, Image } from '@nextui-org/react'
import { Package, Shirt, Minus, X, Coffee, Backpack, Gem, Car, Sword } from 'lucide-react'
import { useGameStore, InventoryItem, ItemType } from '@/lib/store'

interface InventoryUIProps {
  isOpen: boolean
  onClose: () => void
}

export function InventoryUI({ isOpen, onClose }: InventoryUIProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [capacity, setCapacity] = useState(0)
  const [selectedTab, setSelectedTab] = useState<ItemType | 'all'>('all')
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const { subscribe, getState, removeInventoryItem, useItem, equipItem, unequipItem } = useGameStore()

  // Subscribe to inventory changes
  useEffect(() => {
    const unsubscribe = subscribe(state => {
      setInventory(state.inventory)
      setCapacity(state.inventoryCapacity)
    })
    
    // Initialize with current state
    setInventory(getState().inventory)
    setCapacity(getState().inventoryCapacity)
    
    return () => unsubscribe()
  }, [subscribe, getState])

  // Filter items based on selected tab
  const filteredItems = selectedTab === 'all' 
    ? inventory 
    : inventory.filter(item => item.type === selectedTab)

  // Handle item selection
  const handleItemSelect = (item: InventoryItem) => {
    setSelectedItem(item)
  }

  // Handle item use
  const handleUseItem = (item: InventoryItem) => {
    useItem(item.id)
  }

  // Handle item equip/unequip
  const handleEquipToggle = (item: InventoryItem) => {
    if (item.equipped) {
      unequipItem(item.id)
    } else {
      equipItem(item.id)
    }
  }

  // Handle key press to close inventory (ESC key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Get color based on rarity
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-200 text-gray-700';
      case 'uncommon': return 'bg-green-200 text-green-700';
      case 'rare': return 'bg-blue-200 text-blue-700';
      case 'epic': return 'bg-purple-200 text-purple-700';
      case 'legendary': return 'bg-orange-200 text-orange-700';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  // Get icon based on item type
  const getItemIcon = (item: InventoryItem) => {
    switch (item.type) {
      case 'equipment':
        return <Shirt className="w-10 h-10 text-blue-500 dark:text-blue-400" />;
      case 'consumable':
        return <Coffee className="w-10 h-10 text-green-500 dark:text-green-400" />;
      case 'vehicle':
        return <Car className="w-10 h-10 text-purple-500 dark:text-purple-400" />;
      case 'weapon':
        return <Sword className="w-10 h-10 text-red-500 dark:text-red-400" />;
      case 'resource':
        return <Gem className="w-10 h-10 text-amber-500 dark:text-amber-400" />;
      case 'collectible':
        return <Backpack className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />;
      default:
        return <Package className="w-10 h-10 text-blue-500 dark:text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <Card className="w-[90%] max-w-[800px] h-[80%] max-h-[600px] shadow-2xl border-2 border-blue-500/20">
        <CardHeader className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div>
            <h2 className="text-2xl font-bold">Inventory</h2>
            <p className="text-sm opacity-80">
              {inventory.length} / {capacity} items
            </p>
          </div>
          <Button 
            isIconOnly 
            color="default" 
            variant="light" 
            onPress={onClose}
            className="text-white bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        
        <CardBody className="flex flex-col gap-4 p-4 overflow-hidden bg-gray-50 dark:bg-gray-900">
          <Tabs 
            aria-label="Inventory Categories" 
            selectedKey={selectedTab}
            onSelectionChange={(key) => setSelectedTab(key as ItemType | 'all')}
            className="w-full"
            color="primary"
            variant="underlined"
            classNames={{
              tab: "data-[selected=true]:font-bold"
            }}
          >
            <Tab key="all" title="All" />
            <Tab key="equipment" title="Equipment" />
            <Tab key="consumable" title="Consumables" />
            <Tab key="weapon" title="Weapons" />
            <Tab key="vehicle" title="Vehicles" />
            <Tab key="resource" title="Resources" />
            <Tab key="collectible" title="Collectibles" />
          </Tabs>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-grow overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 overflow-y-auto shadow-md">
              <h3 className="text-lg font-semibold mb-3 text-blue-600 dark:text-blue-400">Items</h3>
              {filteredItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No items found</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {filteredItems.map(item => (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-xl cursor-pointer transition-all ${
                        selectedItem?.id === item.id 
                          ? 'bg-blue-100 dark:bg-blue-900/40 border-2 border-blue-500 shadow-md' 
                          : 'bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                      }`}
                      onClick={() => handleItemSelect(item)}
                    >
                      <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-700 dark:to-gray-800 rounded-lg mb-2 flex items-center justify-center shadow-inner">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            className="object-contain w-full h-full p-1"
                            radius="none"
                          />
                        ) : (
                          getItemIcon(item)
                        )}
                      </div>
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {item.quantity > 1 && (
                          <Chip size="sm" variant="flat" color="primary" className="text-xs">
                            x{item.quantity}
                          </Chip>
                        )}
                        {item.equipped && (
                          <Chip size="sm" color="success" variant="flat" className="text-xs">
                            Equipped
                          </Chip>
                        )}
                        <Chip size="sm" className={`text-xs ${getRarityColor(item.rarity)}`}>
                          {item.rarity}
                        </Chip>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 overflow-y-auto shadow-md">
              <h3 className="text-lg font-semibold mb-3 text-blue-600 dark:text-blue-400">Details</h3>
              {selectedItem ? (
                <div className="flex flex-col gap-4">
                  <div className="aspect-square w-28 mx-auto bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl flex items-center justify-center shadow-md">
                    {selectedItem.image ? (
                      <Image
                        src={selectedItem.image}
                        alt={selectedItem.name}
                        className="object-contain w-full h-full p-2"
                        radius="none"
                      />
                    ) : (
                      getItemIcon(selectedItem)
                    )}
                  </div>
                  
                  <h4 className="text-xl font-bold text-center text-gray-800 dark:text-white">{selectedItem.name}</h4>
                  
                  <Chip className={`self-center ${getRarityColor(selectedItem.rarity)}`}>
                    {selectedItem.rarity.toUpperCase()}
                  </Chip>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <div className="text-gray-500 dark:text-gray-400">Type:</div>
                    <div className="font-medium capitalize">{selectedItem.type}</div>
                    
                    {selectedItem.type === 'equipment' && selectedItem.equipmentSlot && (
                      <>
                        <div className="text-gray-500 dark:text-gray-400">Slot:</div>
                        <div className="font-medium capitalize">{selectedItem.equipmentSlot}</div>
                      </>
                    )}
                    
                    {selectedItem.value > 0 && (
                      <>
                        <div className="text-gray-500 dark:text-gray-400">Value:</div>
                        <div className="font-medium">${selectedItem.value}</div>
                      </>
                    )}
                  </div>
                  
                  <p className="text-sm mt-1 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">{selectedItem.description}</p>
                  
                  <div className="flex gap-2 mt-2">
                    {selectedItem.type === 'equipment' && (
                      <Button 
                        color={selectedItem.equipped ? "danger" : "primary"}
                        variant="shadow"
                        fullWidth
                        startContent={selectedItem.equipped ? <Minus className="w-4 h-4" /> : <Shirt className="w-4 h-4" />}
                        onPress={() => handleEquipToggle(selectedItem)}
                      >
                        {selectedItem.equipped ? 'Unequip' : 'Equip'}
                      </Button>
                    )}
                    
                    {(selectedItem.type === 'consumable' || selectedItem.type === 'vehicle') && (
                      <Button 
                        color="primary"
                        variant="shadow"
                        fullWidth
                        onPress={() => handleUseItem(selectedItem)}
                      >
                        Use
                      </Button>
                    )}
                    
                    <Tooltip content="Drop item">
                      <Button 
                        color="danger"
                        variant="flat"
                        isIconOnly
                        onPress={() => removeInventoryItem(selectedItem.id)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </Tooltip>
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