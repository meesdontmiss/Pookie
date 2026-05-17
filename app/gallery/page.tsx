import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"
import GalleryPookieModel from "@/components/gallery-pookie-model"
import { BodyScrollReset } from "../behind-the-scenes/body-scroll-reset"
import styles from "./page.module.css"
import { POOKIE_MAGIC_EDEN_URL } from "@/lib/pookie-links"

type GalleryItem = {
  src: string
  title: string
  type: string
  alt: string
  media: "image" | "video"
  featured?: boolean
  contain?: boolean
}

const galleryItems: GalleryItem[] = [
  {
    src: "/images/BANNER-OPTIMIZED.png",
    title: "Pookie Banner",
    type: "Brand",
    alt: "Pookie banner artwork",
    media: "image",
    featured: true,
  },
  {
    src: "/website/WEBSITE LANDING GRAPHIC DESKTOP.mp4",
    title: "Landing Graphic",
    type: "Video",
    alt: "Pookie original website landing graphic video",
    media: "video",
    featured: true,
  },
  {
    src: "/images/POOKIE THE PLASTIC PENGUIN.gif",
    title: "Plastic Penguin",
    type: "Animated",
    alt: "Animated Pookie plastic penguin",
    media: "image",
    contain: true,
  },
  {
    src: "/images/POOKIE BLANK WADDLE gif.gif",
    title: "Blank Waddle",
    type: "Animated",
    alt: "Pookie blank waddle animation",
    media: "image",
    contain: true,
  },
  {
    src: "/website/pookie 3D spin.gif",
    title: "3D Spin",
    type: "Animated",
    alt: "Pookie 3D spin animation",
    media: "image",
    contain: true,
  },
  {
    src: "/website/pookster-fly-across-screen.gif",
    title: "Jetpack Flyby",
    type: "Animated",
    alt: "Pookie flying across the screen",
    media: "image",
    featured: true,
    contain: true,
  },
  {
    src: "/images/pookies-smokin-shootin-dice-png.png",
    title: "Dice Table",
    type: "Scene",
    alt: "Pookie dice table artwork",
    media: "image",
  },
  {
    src: "/images/pookie-smashin.gif",
    title: "PookHub Loop",
    type: "Animated",
    alt: "Pookie animated loop",
    media: "image",
    contain: true,
  },
  {
    src: "/images/jeet-me.png",
    title: "Jeet Me",
    type: "Meme",
    alt: "Jeet Me Pookie artwork",
    media: "image",
  },
  {
    src: "/images/Pook-Hub.png",
    title: "PookHub Poster",
    type: "Poster",
    alt: "PookHub poster artwork",
    media: "image",
  },
  {
    src: "/images/POOKIE DOLLAR.jpg",
    title: "Pookie Dollar",
    type: "Token",
    alt: "Pookie dollar artwork",
    media: "image",
  },
  {
    src: "/images/pookiemoney spread.gif",
    title: "Money Spread",
    type: "Animated",
    alt: "Pookie money spread animation",
    media: "image",
    contain: true,
  },
  {
    src: "/images/GAY-POOK.png",
    title: "Gay Pook",
    type: "Character",
    alt: "Gay Pook artwork",
    media: "image",
    contain: true,
  },
  {
    src: "/images/PIMP-POOKIE.png",
    title: "Pimp Pookie",
    type: "Character",
    alt: "Pimp Pookie artwork",
    media: "image",
    contain: true,
  },
  {
    src: "/images/POOKIE_1059.gif",
    title: "Pookie 1059",
    type: "NFT",
    alt: "Pookie 1059 animated NFT",
    media: "image",
    contain: true,
  },
  {
    src: "/images/POOKIE_426.gif",
    title: "Pookie 426",
    type: "NFT",
    alt: "Pookie 426 animated NFT",
    media: "image",
    contain: true,
  },
  {
    src: "/website/pookie website still imge.png",
    title: "Website Still",
    type: "OG Site",
    alt: "Original Pookie website still image",
    media: "image",
  },
  {
    src: "/website/HOW TO POOK.mp4",
    title: "How To Pook",
    type: "Video",
    alt: "How to Pook video",
    media: "video",
  },
  {
    src: "/website/how-to-pook.png",
    title: "How To Pook Card",
    type: "Guide",
    alt: "How to Pook graphic",
    media: "image",
    contain: true,
  },
  {
    src: "/website/pookie-3-step-program.png",
    title: "Three Step Program",
    type: "Guide",
    alt: "Pookie three step program",
    media: "image",
    contain: true,
  },
  {
    src: "/website/click-here-website-graphic.png",
    title: "Click Here",
    type: "OG Site",
    alt: "Click here website graphic",
    media: "image",
    contain: true,
  },
  {
    src: "/website/pookie-flag-website-enter.png",
    title: "Enter Flag",
    type: "OG Site",
    alt: "Pookie flag website enter graphic",
    media: "image",
    contain: true,
  },
  {
    src: "/website/pookie-flag.png",
    title: "Pookie Flag",
    type: "OG Site",
    alt: "Pookie flag",
    media: "image",
    contain: true,
  },
  {
    src: "/website/wix/pookie-flag-left.png",
    title: "Left Flag",
    type: "OG Site",
    alt: "Left Pookie flag",
    media: "image",
    contain: true,
  },
  {
    src: "/website/wix/pookie-flag-right.png",
    title: "Right Flag",
    type: "OG Site",
    alt: "Right Pookie flag",
    media: "image",
    contain: true,
  },
  {
    src: "/images/TITLE-TEXT.gif",
    title: "Title Text",
    type: "Brand",
    alt: "Pookie title text",
    media: "image",
    contain: true,
  },
  {
    src: "/images/the-plastic-penguin-text-gif.gif",
    title: "Plastic Penguin Text",
    type: "Brand",
    alt: "The Plastic Penguin text",
    media: "image",
    contain: true,
  },
  {
    src: "/images/partyhat.gif",
    title: "Party Hat",
    type: "Prop",
    alt: "Pookie party hat prop",
    media: "image",
    contain: true,
  },
  {
    src: "/images/8bitlazersword.gif",
    title: "Laser Sword",
    type: "Prop",
    alt: "8-bit laser sword",
    media: "image",
    contain: true,
  },
  {
    src: "/images/flamethrower.gif",
    title: "Flamethrower",
    type: "Prop",
    alt: "Pookie flamethrower prop",
    media: "image",
    contain: true,
  },
  {
    src: "/website/wix/gold-rpg.gif",
    title: "Gold RPG",
    type: "Prop",
    alt: "Gold RPG prop",
    media: "image",
    contain: true,
  },
  {
    src: "/website/wix/pookie-pink-rpg.gif",
    title: "Pink RPG Pookie",
    type: "Character",
    alt: "Pink Pookie with RPG",
    media: "image",
    contain: true,
  },
  {
    src: "/website/wix/pookie-green-sword.gif",
    title: "Sword Pookie",
    type: "Character",
    alt: "Green Pookie with sword",
    media: "image",
    contain: true,
  },
  {
    src: "/images/pookie-history/blender-original-model.png",
    title: "Original Model",
    type: "Process",
    alt: "Original Pookie Blender model",
    media: "image",
  },
  {
    src: "/images/pookie-history/after-effects-mixed-media.png",
    title: "Mixed Media",
    type: "Process",
    alt: "After Effects mixed media Pookie production",
    media: "image",
  },
  {
    src: "/images/pookie-history/magic-eden-collection-launch.png",
    title: "Collection Launch",
    type: "NFT",
    alt: "Pookie Magic Eden collection launch",
    media: "image",
  },
  {
    src: "/images/pookie-history/magic-eden-sold-out-wide.png",
    title: "Sold Out",
    type: "NFT",
    alt: "Pookie Magic Eden sold out page",
    media: "image",
  },
  {
    src: "/images/pookie-history/pumpfun-bonding-candles.png",
    title: "Pumpfun Bonding",
    type: "Launch",
    alt: "Pookie pumpfun bonding chart",
    media: "image",
  },
  {
    src: "/website/wix/mint out and bonding.png",
    title: "Mint Out",
    type: "Launch",
    alt: "Pookie mint out and bonding proof",
    media: "image",
  },
  {
    src: "/website/wix/Screenshot 2024-07-31 191348.png",
    title: "Launch Screenshot",
    type: "Launch",
    alt: "Pookie launch proof screenshot",
    media: "image",
  },
  {
    src: "/website/wix/screenshot-blender-wide.png",
    title: "Blender Wide",
    type: "Process",
    alt: "Pookie Blender production screenshot",
    media: "image",
  },
  {
    src: "/website/wix/screenshot-token-wide.png",
    title: "Token Wide",
    type: "Launch",
    alt: "Pookie token launch screenshot",
    media: "image",
  },
]

export default function GalleryPage() {
  return (
    <main className={styles.page}>
      <BodyScrollReset />

      <section className={styles.hero} aria-label="Pookie gallery intro">
        <div className={styles.heroCopy}>
          <Link href="/" className={styles.backHome}>
            <ArrowLeft size={18} aria-hidden="true" />
            Home
          </Link>
          <img src="/website/wix/title-text.gif" alt="Pookie" className={styles.titleArt} />
          <h1>Media Vault</h1>
          <p className={styles.lede}>
            A scrollable stash of Pookie artwork, GIFs, launch receipts, production screenshots,
            props, posters, and OG site pieces.
          </p>
          <div className={styles.actions}>
            <a href={POOKIE_MAGIC_EDEN_URL} target="_blank" rel="noopener noreferrer" className={styles.primaryAction}>
              View collection <ExternalLink size={16} />
            </a>
          </div>
        </div>

        <div className={styles.modelStage} aria-label="Interactive 3D Pookie model">
          <div className={styles.modelGlow} aria-hidden="true" />
          <GalleryPookieModel />
        </div>
      </section>

      <section className={styles.galleryIntro} aria-label="Gallery count">
        <p>{galleryItems.length} unique pieces loaded from the Pookie archive.</p>
      </section>

      <section className={styles.gallery} aria-label="Pookie artwork gallery">
        {galleryItems.map((item) => (
          <article
            key={item.src}
            className={`${styles.galleryItem} ${item.featured ? styles.featured : ""} ${item.contain ? styles.contain : ""}`}
          >
            <div className={styles.imageFrame}>
              {item.media === "video" ? (
                <video src={item.src} aria-label={item.alt} autoPlay muted loop playsInline preload="metadata" />
              ) : (
                <img src={item.src} alt={item.alt} loading="lazy" />
              )}
            </div>
            <div className={styles.itemMeta}>
              <span>{item.type}</span>
              <h2>{item.title}</h2>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
