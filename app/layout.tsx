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
  title: 'Pookie The Peng',
  description: 'Pookie Sumo Royale and Social Hub',
  icons: {
    icon: '/images/POOKIE BLANK WADDLE gif.gif',
    shortcut: '/images/POOKIE BLANK WADDLE gif.gif',
    apple: '/images/POOKIE BLANK WADDLE gif.gif',
  },
  openGraph: {
    title: 'Pookie The Peng',
    description: 'Jump into Pookie Sumo Royale and the Social Hub.',
    url: 'https://www.pookiethepeng.com',
    siteName: 'Pookie The Peng',
    images: [
      {
        url: '/images/POOKIE THE PLASTIC PENGUIN.gif',
        type: 'image/gif',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pookie The Peng',
    description: 'Jump into Pookie Sumo Royale and the Social Hub.',
    images: ['/images/POOKIE THE PLASTIC PENGUIN.gif'],
  },
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
        <link rel="preload" href="/models/POOKIE.glb" as="fetch" crossOrigin="anonymous" />
        {/* Favicon (gif; will fallback to static in browsers that don’t animate) */}
        <link rel="icon" href="/images/POOKIE BLANK WADDLE gif.gif" type="image/gif" />
        <link rel="shortcut icon" href="/images/POOKIE BLANK WADDLE gif.gif" type="image/gif" />
        <link rel="apple-touch-icon" href="/images/POOKIE BLANK WADDLE gif.gif" />
        {/* Social share override to ensure crawlers pick up the gif */}
        <meta property="og:image" content="/images/POOKIE THE PLASTIC PENGUIN.gif" />
        <meta property="og:image:type" content="image/gif" />
        <meta name="twitter:image" content="/images/POOKIE THE PLASTIC PENGUIN.gif" />
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
