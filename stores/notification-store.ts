'use client'

type Notification = {
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  icon?: any
}

export const useNotificationStore = {
  getState: () => ({
    actions: {
      addNotification: (_n: Notification) => {},
    },
  }),
}


