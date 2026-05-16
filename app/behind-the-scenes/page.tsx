import Link from "next/link"
import { ExternalLink } from "lucide-react"
import styles from "./page.module.css"
import { POOKIE_MAGIC_EDEN_URL, POOKIE_TOKEN_ADDRESS } from "@/lib/pookie-links"

const historyImages = [
  {
    src: "/images/pookie-history/blender-original-model.png",
    alt: "Pookie original Blender model",
    title: "Modeled From Scratch",
    copy: "Pookie started in Blender in 2024, built completely from imagination as the first plastic penguin.",
  },
  {
    src: "/images/pookie-history/after-effects-mixed-media.png",
    alt: "After Effects mixed media NFT production",
    title: "Animated, Then Remixed",
    copy: "The Blender walk cycle moved into After Effects, where mixed media assets were pinned to Pookie's hands and head so they followed his motion.",
  },
  {
    src: "/images/pookie-history/magic-eden-collection-launch.png",
    alt: "POOKIE Magic Eden collection launch page",
    title: "Free Mint Collection",
    copy: "The POOKIE NFT collection launched as a completely free mint and sold out in 12 hours.",
  },
  {
    src: "/images/pookie-history/magic-eden-sold-out-wide.png",
    alt: "POOKIE Magic Eden collection sold out",
    title: "2222 Sold Out",
    copy: "All 2,222 plastic penguins found homes, turning the original Blender experiment into a real community artifact.",
  },
  {
    src: "/images/pookie-history/pumpfun-bonding-candles.png",
    alt: "POOKIE token pumpfun bonding chart",
    title: "Token Launch",
    copy: "When the token launched, POOKIE bonded on pump.fun in about four minutes flat, with no real pre-planning.",
  },
]

export default function BehindTheScenesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Behind The Scenes</p>
          <h1>How Pookie Came To Be</h1>
          <p className={styles.lede}>
            Pookie began as a scratch-made Blender character in 2024, became a mixed media NFT
            collection through After Effects, then turned into a fast-moving token launch.
          </p>
          <div className={styles.actions}>
            <Link href="/" className={styles.secondaryAction}>
              Back home
            </Link>
            <a
              href={POOKIE_MAGIC_EDEN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.primaryAction}
            >
              View NFTs <ExternalLink size={16} />
            </a>
          </div>
        </div>
        <img
          src="/images/pookie-history/blender-original-model.png"
          alt="Pookie in Blender"
          className={styles.heroImage}
        />
      </section>

      <section className={styles.story}>
        <div className={styles.storyText}>
          <h2>The Process</h2>
          <p>
            First, Pookie was modeled completely from scratch in Blender. After that, the animated
            Blender walk cycle was recorded and brought into After Effects.
          </p>
          <p>
            The NFT collection used a mixed media workflow: assets were pinned to Pookie's hands
            and head so every trait followed the movement. The collection was a free mint and sold
            out in 12 hours.
          </p>
          <p>
            The token launch moved fast too. POOKIE bonded on pump.fun in about four minutes flat,
            an independent launch with almost no pre-planning.
          </p>
        </div>
        <div className={styles.contractPanel}>
          <span>Token Contract</span>
          <code>{POOKIE_TOKEN_ADDRESS}</code>
        </div>
      </section>

      <section className={styles.timeline} aria-label="Pookie creation timeline">
        {historyImages.map((item, index) => (
          <article key={item.src} className={styles.timelineCard}>
            <div className={styles.timelineIndex}>{String(index + 1).padStart(2, "0")}</div>
            <img src={item.src} alt={item.alt} className={styles.timelineImage} loading="lazy" />
            <div className={styles.timelineBody}>
              <h2>{item.title}</h2>
              <p>{item.copy}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
