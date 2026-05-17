"use client"

import type { CSSProperties } from "react"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import { Check, Copy } from "lucide-react"
import styles from "@/app/HomeHero.module.css"
import StartSnow from "@/components/start-snow"
import StartDock from "@/components/ui/start-dock"
import PreloadPookieOnIdle from "@/components/preload-pookie-on-idle"
import { POOKIE_DEXSCREENER_URL, POOKIE_MAGIC_EDEN_URL, POOKIE_TOKEN_ADDRESS } from "@/lib/pookie-links"

const STAGE_WIDTH = 1920
const STAGE_HEIGHT = 1080
const BEHIND_THE_SCENES_DOCK_IMAGE_STYLE: CSSProperties = { borderRadius: "16px", objectFit: "cover" }

function PookiePokerDockIcon() {
  const cardBase: CSSProperties = {
    position: "absolute",
    width: "26px",
    height: "36px",
    borderRadius: "6px",
    background: "linear-gradient(180deg, #ffffff, #dbeafe)",
    border: "1px solid rgba(255,255,255,0.88)",
    boxShadow: "0 8px 16px rgba(0,0,0,0.28)",
    display: "grid",
    placeItems: "center",
    color: "#0f172a",
    fontSize: "14px",
    fontWeight: 900,
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        borderRadius: "18px",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 72% 18%, rgba(250,204,21,0.92), transparent 16%), linear-gradient(135deg, #0f172a 0%, #312e81 48%, #0891b2 100%)",
        border: "1px solid rgba(255,255,255,0.22)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.24), 0 12px 22px rgba(0,0,0,0.3)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "8px",
          borderRadius: "999px",
          border: "2px solid rgba(34,211,238,0.78)",
          boxShadow: "0 0 18px rgba(34,211,238,0.45)",
        }}
      />
      <div style={{ ...cardBase, left: "15px", top: "17px", transform: "rotate(-13deg)" }}>A</div>
      <div style={{ ...cardBase, right: "14px", top: "14px", transform: "rotate(12deg)", color: "#be123c" }}>K</div>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "8px",
          transform: "translateX(-50%)",
          padding: "2px 7px",
          borderRadius: "999px",
          background: "#facc15",
          color: "#18181b",
          fontSize: "10px",
          fontWeight: 950,
          letterSpacing: "0",
          boxShadow: "0 4px 10px rgba(0,0,0,0.28)",
        }}
      >
        P
      </div>
    </div>
  )
}

const StartMiniPookieBall = dynamic(() => import("@/components/start-mini-pookie-ball"), { 
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: 'transparent' }} />
})

export default function GameHubStart() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadTimeout, setLoadTimeout] = useState(false)
  const [showClickHint, setShowClickHint] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [stageScale, setStageScale] = useState(1)
  const [isMobile, setIsMobile] = useState(false)
  const [hasCopiedToken, setHasCopiedToken] = useState(false)

  useEffect(() => {
        setShowClickHint(true)
  }, [])

  useEffect(() => {
    const updateScale = () => {
      if (typeof window === 'undefined') return
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      
      if (mobile) {
        // Mobile: no scaling, use native responsive layout
        setStageScale(1)
      } else {
        // Desktop: lock to 1920x1080, scale down only if needed
        const rawScale = Math.min(
          window.innerWidth / STAGE_WIDTH,
          window.innerHeight / STAGE_HEIGHT
        )
        setStageScale(Math.min(1, rawScale))
      }
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  const handleLoadComplete = () => {}
  const handleLoadError = () => {}

  const handleNavigate = useCallback((destination: string) => {
    if (isLoading || isNavigating) return

    setIsNavigating(true)
    router.push(destination)
  }, [isLoading, isNavigating, router])

  const handleCopyTokenAddress = useCallback(async () => {
    setHasCopiedToken(true)
    window.setTimeout(() => setHasCopiedToken(false), 1800)

    try {
      await navigator.clipboard.writeText(POOKIE_TOKEN_ADDRESS)
    } catch (error) {
      const textarea = document.createElement("textarea")
      textarea.value = POOKIE_TOKEN_ADDRESS
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()

      try {
        document.execCommand("copy")
      } catch (fallbackError) {
        console.error("Could not copy token address:", fallbackError)
      } finally {
        document.body.removeChild(textarea)
      }
    }
  }, [])

  const handlePookieClick = () => handleNavigate('/plug-penguin')

  return (
    <>
      <div className={isMobile ? styles.mobileViewport : styles.fixedViewport}>
        {/* Full-viewport star/snow background behind the scaled stage */}
        <StartSnow />
        <div className={isMobile ? styles.mobileWrapper : styles.stageWrapper} style={{ transform: `scale(${stageScale})` }}>
          <main className={isMobile ? styles.mobileContent : styles.stageContent}>
            <PreloadPookieOnIdle />

          <div className={styles.heroOverlay}>
            <div className={styles.heroRow}>
              <img
                src="/images/8bitlazersword.gif"
                alt="Left flamethrower"
                className={`${styles.flame} ${styles.flameLeft}`}
                loading="eager"
              />
              <div className={styles.heroCenter}>
                <img
                  src="/images/TITLE-TEXT.gif"
                  alt="Plug Penguin Title"
                  className={styles.titleImage}
                  loading="eager"
                />
                <img
                  src="/images/the-plastic-penguin-text-gif.gif"
                  alt="The Plastic Penguin Tagline"
                  className={styles.taglineImage}
                  loading="eager"
                />
              </div>
              <img
                src="/images/8bitlazersword.gif"
                alt="Right flamethrower"
                className={`${styles.flame} ${styles.flameRight}`}
                loading="eager"
              />
            </div>

            {/* Waddle GIF in center */}
            <img
              src="/images/POOKIE BLANK WADDLE gif.gif"
              alt="Pookie Waddle"
              className={styles.waddleGif}
              loading="eager"
            />
          </div>

          <div className={styles.heroLinkWrap}>
            <button
              type="button"
              className={`${styles.tokenCopyButton} ${hasCopiedToken ? styles.tokenCopyButtonCopied : ""}`}
              onClick={handleCopyTokenAddress}
              aria-label="Click to copy POOKIE token address"
              title="Click to copy POOKIE token address"
            >
              <span className={styles.tokenCopyIcon}>
                {hasCopiedToken ? <Check size={18} /> : <Copy size={18} />}
              </span>
              <span className={styles.tokenCopyText}>
                <span className={styles.tokenCopyLabel}>
                  {hasCopiedToken ? "Copied!" : "Click to copy token address"}
                </span>
                <span className={styles.tokenCopyAddress}>{POOKIE_TOKEN_ADDRESS}</span>
              </span>
            </button>
            <a
              className={styles.magicEdenButton}
              href={POOKIE_MAGIC_EDEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open POOKIE NFT collection on Magic Eden"
            >
              <span className={`${styles.tokenCopyIcon} ${styles.magicEdenIcon}`}>
                <img src="/images/magic-eden-logo.svg" alt="" aria-hidden="true" />
              </span>
              <span className={styles.tokenCopyText}>
                <span className={styles.tokenCopyLabel}>NFT Collection</span>
                <span className={styles.tokenCopyAddress}>Magic Eden / POOKIE</span>
              </span>
            </a>
          </div>
          
          {/* Mac-style Dock with hover magnification */}
          {!isNavigating && (
            <StartDock
              items={[
                {
                  key: 'pookie-sumo-ball',
                  title: 'Pookie Sumo Ball',
                  onClick: () => handleNavigate('/pookiesumoroyale/lobby-browser'),
                  render: <StartMiniPookieBall />,
                },
                {
                  key: 'pookie-poker',
                  title: 'Pookie Poker',
                  onClick: () => handleNavigate('/pookie-poker'),
                  render: <PookiePokerDockIcon />,
                },
                {
                  key: 'social-hub',
                  title: 'Social Hub',
                  onClick: () => handleNavigate('/plug-penguin'),
                  imageSrc: '/images/pookies-smokin-shootin-dice-png.png',
                },
                {
                  key: 'behind-the-scenes',
                  title: 'Behind The Scenes',
                  onClick: () => handleNavigate('/behind-the-scenes'),
                  imageSrc: '/images/pookie-history/blender-original-model.png',
                  imageStyle: BEHIND_THE_SCENES_DOCK_IMAGE_STYLE,
                },
                {
                  key: 'gallery',
                  title: 'Gallery',
                  onClick: () => handleNavigate('/gallery'),
                  imageSrc: '/images/jeet-me.png',
                },
                {
                  key: 'pookhub',
                  title: 'PookHub',
                  onClick: () => {
                    if (typeof window !== 'undefined') {
                      window.open('https://www.pornhub.com/model/pookiethepeng', '_blank', 'noopener,noreferrer')
                    }
                  },
                  imageSrc: '/images/pookie-smashin.gif',
                },
                {
                  key: 'dexscreener',
                  title: 'Dexscreener',
                  onClick: () => {
                    if (typeof window !== 'undefined') {
                      window.open(POOKIE_DEXSCREENER_URL, '_blank', 'noopener,noreferrer')
                    }
                  },
                  imageSrc: '/images/POOKIE DOLLAR.jpg',
                },
              ]}
            />
          )}

            {isLoading && !loadError && !loadTimeout && (
              <div className={styles.loadingText}>
                Loading Plug Penguin...
              </div>
            )}

            {(loadError || loadTimeout) && (
            <div className={styles.warning}>
              <p className={styles.warningLine}>Experience the full magic on a desktop browser!</p>
              <p className={styles.warningLine}>This game doesn't work on mobile devices yet.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  )
}
