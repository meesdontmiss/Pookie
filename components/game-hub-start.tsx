"use client"

import type { CSSProperties } from "react"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Home } from "lucide-react"
import styles from "@/app/HomeHero.module.css"
import StartSnow from "@/components/start-snow"
import StartDock from "@/components/ui/start-dock"
import StartMiniPookieBallLoader from "@/components/start-mini-pookie-ball-loader"
import PreloadPookieOnIdle from "@/components/preload-pookie-on-idle"

const STAGE_WIDTH = 1920
const STAGE_HEIGHT = 1080

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

export default function GameHubStart() {
  const router = useRouter()

  const [isNavigating, setIsNavigating] = useState(false)
  const [stageScale, setStageScale] = useState(1)
  const [isMobile, setIsMobile] = useState(false)

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

  const handleNavigate = useCallback((destination: string) => {
    if (isNavigating) return

    setIsNavigating(true)
    router.push(destination)
  }, [isNavigating, router])

  return (
    <>
      <div className={isMobile ? styles.mobileViewport : styles.fixedViewport}>
        {/* Full-viewport star/snow background behind the scaled stage */}
        <StartSnow />
        <div className={isMobile ? styles.mobileWrapper : styles.stageWrapper} style={{ transform: `scale(${stageScale})` }}>
          <main className={isMobile ? styles.mobileContent : styles.stageContent}>
            <PreloadPookieOnIdle />

          <button
            type="button"
            className={styles.homeButton}
            onClick={() => handleNavigate('/')}
            aria-label="Back to Pookie home"
            title="Back to Pookie home"
          >
            <Home size={20} aria-hidden="true" />
            <span>Home</span>
          </button>

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
          
          {/* Mac-style Dock with hover magnification */}
          {!isNavigating && (
            <StartDock
              items={[
                {
                  key: 'pookie-sumo-ball',
                  title: 'Pookie Sumo Ball',
                  onClick: () => handleNavigate('/pookiesumoroyale/lobby-browser'),
                  render: <StartMiniPookieBallLoader />,
                },
                {
                  key: 'pookie-poker',
                  title: 'Pookie Poker',
                  onClick: () => handleNavigate('/pookie-poker'),
                  render: <PookiePokerDockIcon />,
                },
              ]}
            />
          )}

          </main>
        </div>
      </div>
    </>
  )
}
