"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import styles from "./HomeHero.module.css"
import StartSnow from "@/components/start-snow"
import StartDock from "@/components/ui/start-dock"
import PreloadPookieOnIdle from "@/components/preload-pookie-on-idle"

const STAGE_WIDTH = 1920
const STAGE_HEIGHT = 1080

const StartMiniPookieBall = dynamic(() => import("@/components/start-mini-pookie-ball"), { 
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: 'transparent' }} />
})

export default function Home() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [loadTimeout, setLoadTimeout] = useState(false)
  const [showClickHint, setShowClickHint] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [stageScale, setStageScale] = useState(1)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
        setShowClickHint(true)
  }, [])

  useEffect(() => {
    const updateScale = () => {
      if (typeof window === 'undefined') return
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      
      if (mobile) {
        // Mobile: scale to fit viewport
        const rawScale = Math.min(
          window.innerWidth / STAGE_WIDTH,
          window.innerHeight / STAGE_HEIGHT
        )
        setStageScale(rawScale)
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

  const handlePookieClick = () => handleNavigate('/plug-penguin')

  return (
    <>
      <StartSnow />
      <div className={isMobile ? styles.mobileViewport : styles.fixedViewport}>
        <div className={isMobile ? styles.mobileWrapper : styles.stageWrapper} style={{ transform: `scale(${stageScale})` }}>
          <main className={isMobile ? styles.mobileContent : styles.stageContent}>
            <PreloadPookieOnIdle />

          <div className={styles.heroOverlay}>
            <div className={styles.heroRow}>
              <img
                src="/images/8bitlazersword.gif"
                alt="Left flamethrower"
                className={`${styles.flame} ${styles.flameLeft}`}
              />
              <div className={styles.heroCenter}>
                <img
                  src="/images/TITLE-TEXT.gif"
                  alt="Plug Penguin Title"
                  className={styles.titleImage}
                />
                <img
                  src="/images/the-plastic-penguin-text-gif.gif"
                  alt="The Plastic Penguin Tagline"
                  className={styles.taglineImage}
                />
              </div>
              <img
                src="/images/8bitlazersword.gif"
                alt="Right flamethrower"
                className={`${styles.flame} ${styles.flameRight}`}
              />
            </div>

            {/* Waddle GIF in center */}
            <img
              src="/images/POOKIE BLANK WADDLE gif.gif"
              alt="Pookie Waddle"
              className={styles.waddleGif}
            />
          </div>
          
          {/* Mac-style Dock */}
          {!isNavigating && (
            <div className={styles.dock}>
              <div className={styles.dockInner}>
                <button 
                  className={styles.dockItem} 
                  title="Pookie Sumo Ball"
                  onClick={() => handleNavigate('/pookiesumoroyale/lobby-browser')}
                  style={{ position: 'relative' }}
                >
                  <StartMiniPookieBall />
                </button>
                <button 
                  className={styles.dockItem}
                  title="Social Hub"
                  onClick={() => handleNavigate('/plug-penguin')}
                >
                  <img src="/images/pookies-smokin-shootin-dice-png.png" alt="Social Hub" className={styles.dockImg} />
                </button>
                <button 
                  className={styles.dockItem}
                  title="Gallery"
                  onClick={() => handleNavigate('/gallery')}
                >
                  <img src="/images/jeet-me.png" alt="Gallery" className={styles.dockImg} />
                </button>
                <button 
                  className={styles.dockItem}
                  title="PookHub"
                  onClick={() => window.open('https://www.pornhub.com/model/pookiethepeng', '_blank')}
                >
                  <img src="/images/pookie-smashin.gif" alt="PookHub" className={styles.dockImg} />
                </button>
                <button 
                  className={styles.dockItem}
                  title="Dexscreener"
                  onClick={() => window.open('https://dexscreener.com', '_blank')}
                >
                  <img src="/images/POOKIE DOLLAR.jpg" alt="Dexscreener" className={styles.dockImg} />
                </button>
              </div>
            </div>
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

