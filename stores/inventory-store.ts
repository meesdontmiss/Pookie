'use client'

type InventoryItem = any

export const useInventoryStore = {
  getState: () => ({
    actions: {
      addInventoryItem: (_item: InventoryItem) => {},
    },
  }),
}


