"use client"

import { AudioProvider } from '@/lib/audio-context'
import { Providers } from '@/components/plug-penguin/ui/providers'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <AudioProvider>{children}</AudioProvider>
    </Providers>
  )
} 