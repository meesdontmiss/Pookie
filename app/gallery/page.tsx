import Link from "next/link"
import { ExternalLink } from "lucide-react"
import styles from "./page.module.css"
import { POOKIE_MAGIC_EDEN_URL } from "@/lib/pookie-links"

const galleryItems = [
  {
    src: "/images/BANNER-OPTIMIZED.png",
    title: "Pookie Banner",
    type: "Brand",
    alt: "Pookie banner artwork",
  },
  {
    src: "/images/POOKIE THE PLASTIC PENGUIN.gif",
    title: "Plastic Penguin",
    type: "Animated",
    alt: "Animated Pookie plastic penguin",
  },
  {
    src: "/images/POOKIE BLANK WADDLE gif.gif",
    title: "Blank Waddle",
    type: "Animated",
    alt: "Pookie blank waddle animation",
  },
  {
    src: "/images/pookies-smokin-shootin-dice-png.png",
    title: "Dice Table",
    type: "Scene",
    alt: "Pookie dice table artwork",
  },
  {
    src: "/images/pookie-smashin.gif",
    title: "PookHub Loop",
    type: "Animated",
    alt: "Pookie animated loop",
  },
  {
    src: "/images/jeet-me.png",
    title: "Jeet Me",
    type: "Meme",
    alt: "Jeet Me Pookie artwork",
  },
  {
    src: "/images/POOKIE DOLLAR.jpg",
    title: "Pookie Dollar",
    type: "Token",
    alt: "Pookie dollar artwork",
  },
  {
    src: "/images/Pook-Hub.png",
    title: "PookHub",
    type: "Poster",
    alt: "PookHub poster artwork",
  },
  {
    src: "/images/pookie-history/blender-original-model.png",
    title: "Original Model",
    type: "Process",
    alt: "Original Pookie Blender model",
  },
  {
    src: "/images/pookie-history/after-effects-mixed-media.png",
    title: "Mixed Media",
    type: "Process",
    alt: "After Effects mixed media Pookie production",
  },
  {
    src: "/images/pookie-history/magic-eden-collection-launch.png",
    title: "Collection Launch",
    type: "NFT",
    alt: "Pookie Magic Eden collection launch",
  },
  {
    src: "/images/pookie-history/magic-eden-sold-out-wide.png",
    title: "Sold Out",
    type: "NFT",
    alt: "Pookie Magic Eden sold out page",
  },
]

export default function GalleryPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Gallery</p>
          <h1>Pookie Media Vault</h1>
          <p className={styles.lede}>
            A working gallery route for the landing dock, collecting the site artwork, GIFs, launch visuals, and production screenshots already shipped with the project.
          </p>
          <div className={styles.actions}>
            <Link href="/" className={styles.secondaryAction}>
              Back home
            </Link>
            <a href={POOKIE_MAGIC_EDEN_URL} target="_blank" rel="noopener noreferrer" className={styles.primaryAction}>
              View collection <ExternalLink size={16} />
            </a>
          </div>
        </div>
        <img src="/images/BANNER-OPTIMIZED.png" alt="Pookie gallery hero banner" className={styles.heroImage} />
      </section>

      <section className={styles.gallery} aria-label="Pookie artwork gallery">
        {galleryItems.map((item) => (
          <article key={item.src} className={styles.galleryItem}>
            <div className={styles.imageFrame}>
              <img src={item.src} alt={item.alt} loading="lazy" />
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
