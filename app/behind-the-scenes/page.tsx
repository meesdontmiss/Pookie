import Link from "next/link"
import { BodyScrollReset } from "./body-scroll-reset"
import styles from "./page.module.css"
import { POOKIE_MAGIC_EDEN_URL, POOKIE_TOKEN_ADDRESS } from "@/lib/pookie-links"

const WIX = "/website/wix"

const socialLinks = [
  { href: "https://www.dextools.io/app/en/solana/pair-explorer/GfbcpEhUcrMHJ2vqwbsVEAWVFR5owwAD8mRrKhUzpump", src: `${WIX}/dextools.png`, alt: "Dextools" },
  { href: "https://dexscreener.com/solana/gfbcpEhUcrMHJ2vqwbsVEAWVFR5owwAD8mRrKhUzpump", src: `${WIX}/dexscreener.png`, alt: "Dexscreener" },
  { href: "https://t.me/pookiethepeng", src: `${WIX}/telegram.png`, alt: "Telegram" },
  { href: POOKIE_MAGIC_EDEN_URL, src: `${WIX}/magiceden.png`, alt: "Magic Eden" },
  { href: "https://twitter.com/PookieThePeng", src: `${WIX}/x-logo.webp`, alt: "X" },
]

const proofImages = [
  {
    src: `${WIX}/screenshot-blender-wide.png`,
    alt: "Pookie Blender and After Effects production screenshot",
  },
]

const launchProofImages = [
  {
    src: `${WIX}/mint out and bonding.png`,
    alt: "Pookie mint out and bonding proof",
  },
  {
    src: `${WIX}/Screenshot 2024-07-31 191348.png`,
    alt: "Pookie launch proof screenshot",
  },
]

export default function BehindTheScenesPage() {
  return (
    <main className={styles.page}>
      <BodyScrollReset />

      <section className={styles.hero} aria-label="Pookie original website collage">
        <div className={styles.headerBand} aria-hidden="true">
          <img src={`${WIX}/pookie-flag-left.png`} alt="" className={styles.flagLeft} />
          <img src={`${WIX}/partyhat.gif`} alt="" className={styles.headerCrown} />
          <img src={`${WIX}/pookie-flag-right.png`} alt="" className={styles.flagRight} />
        </div>

        <div className={styles.collage}>
          <h1 className={styles.srOnly}>Pookie The Plastic Penguin</h1>
          <img src={`${WIX}/pookie-spin.gif`} alt="" className={styles.sidePookieLeft} />
          <img src={`${WIX}/pookie-spin.gif`} alt="" className={styles.sidePookieRight} />
          <img src={`${WIX}/pookie-pink-rpg.gif`} alt="" className={styles.pinkPookie} />
          <img src={`${WIX}/pookie-green-sword.gif`} alt="" className={styles.swordPookie} />
          <img src={`${WIX}/gold-rpg.gif`} alt="" className={styles.goldRpg} />
          <img src={`${WIX}/title-text.gif`} alt="Pookie" className={styles.titleText} />
          <img src={`${WIX}/plastic-penguin-text.gif`} alt="The Plastic Penguin" className={styles.subtitleText} />
          <img src={`${WIX}/flamethrower.gif`} alt="" className={styles.flameLeft} />
          <img src={`${WIX}/flamethrower.gif`} alt="" className={styles.flameRight} />

          <nav className={styles.socials} aria-label="Pookie links">
            {socialLinks.map((link) => (
              <a key={link.alt} href={link.href} target="_blank" rel="noopener noreferrer">
                <img src={link.src} alt={link.alt} />
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className={styles.howTo}>
        <img src={`${WIX}/how-to-pook.png`} alt="How to Pook" />
      </section>

      <section className={styles.origin}>
        <img src={`${WIX}/pookie-spin.gif`} alt="" className={styles.originSpin} />
        <img src="/images/8bitlazersword.gif" alt="" className={styles.originSword} />
        <div className={styles.contract}>
          <span>Token Contract</span>
          <code>{POOKIE_TOKEN_ADDRESS}</code>
        </div>
      </section>

      <section className={styles.proof}>
        <div className={styles.proofGrid}>
          {proofImages.slice(0, 3).map((image) => (
            <img key={image.src} src={image.src} alt={image.alt} />
          ))}
        </div>
        <p>
          Pookie was made using a combination of Blender & Adobe After Effects. To generate a
          collection of png GIF files I had to create my own generator with the assistance of
          Chat-GPT. After weeks of trouble shooting, the Pookies were born! A degen mint launched
          off of LaunchMyNFT with less than 24 hrs notice. The collection sold out in 2 hrs.
        </p>
        <div className={styles.proofStack}>
          {launchProofImages.map((image) => (
            <img key={image.src} src={image.src} alt={image.alt} />
          ))}
        </div>
        <p>
          $pookie launched the day after mint and broke the bondage curve on pump.fun in 5 minutes.
          Still waiting to hear if that's a record..
        </p>
      </section>

      <section className={styles.program}>
        <img src={`${WIX}/three-step-program.png`} alt="Pookie three step program" />
        <img src={`${WIX}/pookster-fly.gif`} alt="" className={styles.flyPookie} />
      </section>

      <div className={styles.actions}>
        <Link href="/">Back home</Link>
        <a href={POOKIE_MAGIC_EDEN_URL} target="_blank" rel="noopener noreferrer">
          View NFTs
        </a>
      </div>
    </main>
  )
}
