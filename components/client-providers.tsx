'use client';

import React, { useMemo } from 'react';
import { NextUIProvider } from '@nextui-org/react';
import { NotificationProvider } from '@/components/ui/notification';
import { ClientLayout } from '@/components/client-layout';
import UniversalNav from '@/components/ui/universal-nav';

// Solana specific imports are present
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import {
  WalletModalProvider,
} from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import styles here if they are specific to these providers
import '@solana/wallet-adapter-react-ui/styles.css'; // Also comment out if ConnectionProvider is out

interface ClientProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({ children }: ClientProvidersProps) {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(
    () => [
      // Phantom is now provided via Wallet Standard; keep only explicit Solflare adapter here.
      new SolflareWalletAdapter({ network }),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
    <NextUIProvider>
      <NotificationProvider>
        <ClientLayout>
          <UniversalNav />
          <main className="pt-16">{children}</main> 
        </ClientLayout>
      </NotificationProvider>
    </NextUIProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );

  // Temporarily render children with only essential providers (if any)
  // For this test, let's try with NextUIProvider and NotificationProvider still active,
  // as they are less likely to cause global JS halts compared to wallet integrations.
  // return (
  //   <NextUIProvider>
  //     <NotificationProvider>
  //       <ClientLayout>
  //         <UniversalNav />
  //         <main className="pt-16">{children}</main> 
  //       </ClientLayout>
  //     </NotificationProvider>
  //   </NextUIProvider>
  // );
} 