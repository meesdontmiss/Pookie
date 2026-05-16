"use client"

import Link from 'next/link'
// import { MusicPlayer } from '../audio/music-player'; // Temporarily commented out due to path issues
import { Twitter, Home, Copy, Check, ExternalLink } from 'lucide-react' // Assuming Twitter icon is used directly
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui' // Temporarily comment out
// Removed other lucide-react icons if they were only for MusicPlayer or NetworkStatus
import { useEffect, useState } from 'react' // Import useEffect and useState
import './universal-nav.css'
import { POOKIE_MAGIC_EDEN_URL, POOKIE_TOKEN_ADDRESS } from '@/lib/pookie-links'

export default function UniversalNav() {
  const [hasMounted, setHasMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleCopyContract = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    navigator.clipboard.writeText(POOKIE_TOKEN_ADDRESS).catch(() => {
      const textarea = document.createElement("textarea");
      textarea.value = POOKIE_TOKEN_ADDRESS;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(textarea);
      }
    });
  };

  // isDevelopment variable related to NetworkStatus is removed.
  // Any state related to a local/fallback music player is also removed for this step.

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/50 backdrop-blur-md text-white px-3 py-0 shadow-lg h-14 sm:h-16 flex items-center">
      <div className="w-full mx-auto flex items-center justify-between h-full">
        {/* Left Section: Home + Contract */}
        <div className="flex items-center justify-start space-x-2 sm:space-x-3 flex-shrink-0">
          <Link href="/?force-landing=true" legacyBehavior>
            <a aria-label="Home" className="inline-flex items-center justify-center text-white hover:text-cyan-300 transition-colors duration-200">
              <Home size={20} strokeWidth={2.25} />
            </a>
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={handleCopyContract}
              className={`
                inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
                backdrop-blur-md transition-all duration-200
                ${copied
                  ? 'bg-lime-500/20 text-lime-300 border border-lime-400/40'
                  : 'bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-cyan-400/50'
                }
              `}
              title="Click to copy token address"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copied!" : "CA"}</span>
              <span className="hidden xl:inline font-mono text-[11px] text-white/75">
                {POOKIE_TOKEN_ADDRESS.slice(0, 6)}...{POOKIE_TOKEN_ADDRESS.slice(-6)}
              </span>
            </button>
            <Link href={POOKIE_MAGIC_EDEN_URL} passHref legacyBehavior>
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-cyan-400/50 backdrop-blur-md transition-all duration-200"
                title="Open POOKIE NFT collection on Magic Eden"
              >
                <img
                  src="/images/magic-eden-logo.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-4 w-4 rounded-[4px]"
                />
                <span>NFTs</span>
                <ExternalLink size={12} className="text-white/60" />
              </a>
            </Link>
          </div>
        </div>

        {/* Center Section: Title GIF - Hidden on mobile */}
        <div className="hidden sm:flex flex-1 text-center h-full items-center justify-center">
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
        <div className="flex items-center justify-end space-x-2 sm:space-x-3 flex-shrink-0">
          {hasMounted ? (
            <div className="relative wallet-multi-wrapper">
              <WalletMultiButton className="wallet-button-reset" />
            </div>
          ) : (
            <div className="w-[100px] sm:w-[150px] h-[36px] sm:h-[38px] bg-white/10 rounded-md" />
          )}
          <Link href="https://twitter.com/plugpenguinclub" passHref legacyBehavior>
            <a target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors duration-300">
              <Twitter size={20} className="sm:w-6 sm:h-6" />
            </a>
          </Link>
        </div>
      </div>
    </nav>
  )
}
