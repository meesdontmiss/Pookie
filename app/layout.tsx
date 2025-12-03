// 'use client'; // No longer needed here

import type { Metadata } from 'next'
import './globals.css'
// Solana UI styles will be imported by ClientProviders
// import '@solana/wallet-adapter-react-ui/styles.css' // Default styles for the wallet modal
import { Inter } from 'next/font/google'
import { ClientProviders } from '@/components/client-providers'
import MusicPlayer from '@/components/ui/music-player'
// Remove direct Solana and other client-side imports that are now in ClientProviders
// import { ClientLayout } from '@/components/client-layout'
// import { NotificationProvider } from '@/components/ui/notification'
// import { NextUIProvider } from '@nextui-org/react'
// import UniversalNav from '@/components/ui/universal-nav'
// import React, { useMemo } from 'react'
// import {
//   ConnectionProvider,
//   WalletProvider,
// } from '@solana/wallet-adapter-react'
// import {
//   WalletModalProvider,
// } from '@solana/wallet-adapter-react-ui'
// import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
// import {
//   PhantomWalletAdapter,
//   SolflareWalletAdapter,
//   // Add other wallets you want to support
// } from '@solana/wallet-adapter-wallets'
// import { clusterApiUrl } from '@solana/web3.js'

const inter = Inter({ subsets: ['latin'] })

// metadata can now be safely exported from this Server Component
export const metadata: Metadata = {
  title: 'Plug Penguin',
  description: 'A Club Penguin-style virtual world for crypto enthusiasts',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/cursors/cursor.svg" as="image" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <ClientProviders>
          {children}
          <MusicPlayer />
        </ClientProviders>
      </body>
    </html>
  )
}
