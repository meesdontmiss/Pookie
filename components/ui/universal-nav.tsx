"use client"

import Link from 'next/link'
// import { MusicPlayer } from '../audio/music-player'; // Temporarily commented out due to path issues
import { Twitter, Home, Copy, Check } from 'lucide-react' // Assuming Twitter icon is used directly
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui' // Temporarily comment out
// Removed other lucide-react icons if they were only for MusicPlayer or NetworkStatus
import { useEffect, useState } from 'react' // Import useEffect and useState
import './universal-nav.css'

export default function UniversalNav() {
  const [hasMounted, setHasMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const contractAddress = "COMING SOON";

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleCopyContract = () => {
    if (contractAddress === "COMING SOON") return;
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // isDevelopment variable related to NetworkStatus is removed.
  // Any state related to a local/fallback music player is also removed for this step.

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/50 backdrop-blur-md text-white px-3 py-0 shadow-lg h-14 sm:h-16 flex items-center">
      <div className="container mx-auto flex items-center justify-between h-full">
        {/* Left Section: Home + Contract */}
        <div className="flex items-center justify-start w-[200px] space-x-3">
          <Link href="/?force-landing=true" legacyBehavior>
            <a aria-label="Home" className="inline-flex items-center justify-center text-white hover:text-cyan-300 transition-colors duration-200">
              <Home size={20} strokeWidth={2.25} />
            </a>
          </Link>
          <button
            onClick={handleCopyContract}
            disabled={contractAddress === "COMING SOON"}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold
              transition-all duration-200
              ${contractAddress === "COMING SOON" 
                ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/10' 
                : copied 
                  ? 'bg-lime-500/20 text-lime-400 border border-lime-400/30' 
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-cyan-400/50'
              }
            `}
            title={contractAddress === "COMING SOON" ? "Token contract coming soon" : "Click to copy contract address"}
          >
            {copied ? (
              <>
                <Check size={14} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span className="hidden sm:inline">{contractAddress === "COMING SOON" ? "Coming Soon" : "Contract"}</span>
              </>
            )}
          </button>
        </div>

        {/* Center Section: Title GIF */}
        <div className="flex-grow text-center h-full">
          <Link href="/?force-landing=true" legacyBehavior>
            <a className="inline-block hover:opacity-90 transition-opacity duration-300 h-full" aria-label="Go to home">
              <img
                src="/images/TITLE-TEXT.gif"
                alt="Pookie Title"
                className="h-full w-auto mx-auto block"
                style={{ imageRendering: 'auto' }}
              />
            </a>
          </Link>
        </div>

        {/* Right Section: Wallet + Twitter */}
        <div className="flex items-center justify-end w-[220px] space-x-3">
          {hasMounted ? (
            <div className="relative wallet-multi-wrapper">
              <WalletMultiButton className="wallet-button-reset" />
            </div>
          ) : (
            <div className="w-[150px] h-[38px] bg-white/10 rounded-md" />
          )}
          <Link href="https://twitter.com/plugpenguinclub" passHref legacyBehavior>
            <a target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors duration-300">
              <Twitter size={24} />
            </a>
          </Link>
        </div>
      </div>
    </nav>
  )
} 