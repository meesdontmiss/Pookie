"use client"

import type { CSSProperties } from "react"
import { useCallback, useState } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Check, Copy } from "lucide-react"
import landingStyles from "./PookieLanding.module.css"
import widgetStyles from "./HomeHero.module.css"
import StartDock from "@/components/ui/start-dock"
import { POOKIE_DEXSCREENER_URL, POOKIE_MAGIC_EDEN_URL, POOKIE_TOKEN_ADDRESS } from "@/lib/pookie-links"

const WIX = "/website/wix"
const BEHIND_THE_SCENES_DOCK_IMAGE_STYLE: CSSProperties = { borderRadius: "16px", objectFit: "cover" }

const StartMiniPookieBall = dynamic(() => import("@/components/start-mini-pookie-ball"), {
  ssr: false,
  loading: () => <div style={{ width: "100%", height: "100%", background: "transparent" }} />,
})

export default function Home() {
  const router = useRouter()
  const [hasCopiedToken, setHasCopiedToken] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)

  const handleNavigate = useCallback(
    (destination: string) => {
      if (isNavigating) return
      setIsNavigating(true)
      router.push(destination)
    },
    [isNavigating, router],
  )

  const handleCopyTokenAddress = useCallback(async () => {
    setHasCopiedToken(true)
    window.setTimeout(() => setHasCopiedToken(false), 1800)

    try {
      await navigator.clipboard.writeText(POOKIE_TOKEN_ADDRESS)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = POOKIE_TOKEN_ADDRESS
      textarea.setAttribute("readonly", "")
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()

      try {
        document.execCommand("copy")
      } finally {
        document.body.removeChild(textarea)
      }
    }
  }, [])

  return (
    <main className={landingStyles.page} aria-label="Pookie landing page">
      <section className={landingStyles.hero} aria-label="Pookie original website collage">
        <div className={landingStyles.headerBand} aria-hidden="true">
          <img src={`${WIX}/pookie-flag-left.png`} alt="" className={landingStyles.flagLeft} />
          <img src={`${WIX}/partyhat.gif`} alt="" className={landingStyles.headerCrown} />
          <img src={`${WIX}/pookie-flag-right.png`} alt="" className={landingStyles.flagRight} />
        </div>

        <div className={landingStyles.collage}>
          <h1 className={landingStyles.srOnly}>Pookie The Plastic Penguin</h1>
          <img src={`${WIX}/pookie-spin.gif`} alt="" className={landingStyles.sidePookieLeft} />
          <img src={`${WIX}/pookie-spin.gif`} alt="" className={landingStyles.sidePookieRight} />
          <img src={`${WIX}/pookie-pink-rpg.gif`} alt="" className={landingStyles.pinkPookie} />
          <img src={`${WIX}/pookie-green-sword.gif`} alt="" className={landingStyles.swordPookie} />
          <img src={`${WIX}/gold-rpg.gif`} alt="" className={landingStyles.goldRpg} />
          <img src={`${WIX}/title-text.gif`} alt="Pookie" className={landingStyles.titleText} />
          <img src={`${WIX}/plastic-penguin-text.gif`} alt="The Plastic Penguin" className={landingStyles.subtitleText} />
          <img src={`${WIX}/flamethrower.gif`} alt="" className={landingStyles.flameLeft} />
          <img src={`${WIX}/flamethrower.gif`} alt="" className={landingStyles.flameRight} />
          <img src={`${WIX}/pookster-fly.gif`} alt="" className={landingStyles.flyPookie} />
        </div>

        <div className={landingStyles.widgetBar}>
          <button
            type="button"
            className={`${widgetStyles.tokenCopyButton} ${hasCopiedToken ? widgetStyles.tokenCopyButtonCopied : ""}`}
            onClick={handleCopyTokenAddress}
            aria-label="Click to copy POOKIE token address"
            title="Click to copy POOKIE token address"
          >
            <span className={widgetStyles.tokenCopyIcon}>
              {hasCopiedToken ? <Check size={18} /> : <Copy size={18} />}
            </span>
            <span className={widgetStyles.tokenCopyText}>
              <span className={widgetStyles.tokenCopyLabel}>{hasCopiedToken ? "Copied!" : "Copy token address"}</span>
              <span className={widgetStyles.tokenCopyAddress}>{POOKIE_TOKEN_ADDRESS}</span>
            </span>
          </button>
          <a
            className={widgetStyles.magicEdenButton}
            href={POOKIE_MAGIC_EDEN_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open POOKIE NFT collection on Magic Eden"
          >
            <span className={`${widgetStyles.tokenCopyIcon} ${widgetStyles.magicEdenIcon}`}>
              <img src="/images/magic-eden-logo.svg" alt="" aria-hidden="true" />
            </span>
            <span className={widgetStyles.tokenCopyText}>
              <span className={widgetStyles.tokenCopyLabel}>NFT Collection</span>
              <span className={widgetStyles.tokenCopyAddress}>Magic Eden / POOKIE</span>
            </span>
          </a>
        </div>

        {!isNavigating && (
          <StartDock
            className={landingStyles.dock}
            items={[
              {
                key: "game-hub",
                title: "Game Hub",
                onClick: () => handleNavigate("/gamehub"),
                render: <StartMiniPookieBall />,
              },
              {
                key: "social-hub",
                title: "Social Hub",
                onClick: () => handleNavigate("/plug-penguin"),
                imageSrc: "/images/pookies-smokin-shootin-dice-png.png",
              },
              {
                key: "behind-the-scenes",
                title: "Behind The Scenes",
                onClick: () => handleNavigate("/behind-the-scenes"),
                imageSrc: "/images/pookie-history/blender-original-model.png",
                imageStyle: BEHIND_THE_SCENES_DOCK_IMAGE_STYLE,
              },
              {
                key: "gallery",
                title: "Gallery",
                onClick: () => handleNavigate("/gallery"),
                imageSrc: "/images/jeet-me.png",
              },
              {
                key: "pookhub",
                title: "PookHub",
                onClick: () => {
                  window.open("https://www.pornhub.com/model/pookiethepeng", "_blank", "noopener,noreferrer")
                },
                imageSrc: "/images/pookie-smashin.gif",
              },
              {
                key: "dexscreener",
                title: "Dexscreener",
                onClick: () => {
                  window.open(POOKIE_DEXSCREENER_URL, "_blank", "noopener,noreferrer")
                },
                imageSrc: "/images/POOKIE DOLLAR.jpg",
              },
            ]}
          />
        )}
      </section>
    </main>
  )
}
