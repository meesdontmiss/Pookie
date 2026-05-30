import { readdir } from "fs/promises"
import path from "path"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"
import GalleryGrid, { type GalleryItem } from "@/components/gallery-grid"
import GalleryPookieModel from "@/components/gallery-pookie-model"
import { BodyScrollReset } from "../behind-the-scenes/body-scroll-reset"
import styles from "./page.module.css"
import { POOKIE_MAGIC_EDEN_URL } from "@/lib/pookie-links"

const GALLERY_DIR = path.join(process.cwd(), "public", "gallery")
const IMAGE_EXTENSIONS = new Set([".apng", ".avif", ".gif", ".jpg", ".jpeg", ".png", ".webp"])
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"])

export const runtime = "nodejs"

function publicPathFor(relativePath: string) {
  return `/gallery/${relativePath.split(path.sep).map(encodeURIComponent).join("/")}`
}

function titleFromFile(fileName: string) {
  const parsed = path.parse(fileName)
  return parsed.name
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

async function collectGalleryFiles(dir: string, baseDir = dir): Promise<GalleryItem[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        return collectGalleryFiles(fullPath, baseDir)
      }

      const ext = path.extname(entry.name).toLowerCase()
      const media: GalleryItem["media"] | null = VIDEO_EXTENSIONS.has(ext)
        ? "video"
        : IMAGE_EXTENSIONS.has(ext)
          ? "image"
          : null

      if (!media) return []

      const relativePath = path.relative(baseDir, fullPath)
      const src = publicPathFor(relativePath)

      return [
        {
          src,
          downloadName: entry.name,
          title: titleFromFile(entry.name),
          alt: `Pookie gallery artwork: ${titleFromFile(entry.name)}`,
          media,
        },
      ]
    }),
  )

  return nested.flat()
}

async function getGalleryItems() {
  try {
    const items = await collectGalleryFiles(GALLERY_DIR)
    const uniqueItems = new Map(items.map((item) => [item.src, item]))
    return Array.from(uniqueItems.values()).sort((a, b) => a.title.localeCompare(b.title))
  } catch {
    return []
  }
}

export default async function GalleryPage() {
  const galleryItems = await getGalleryItems()

  return (
    <main className={styles.page}>
      <BodyScrollReset />

      <Link href="/" className={styles.backHome}>
        <ArrowLeft size={18} aria-hidden="true" />
        Home
      </Link>
      <a
        href={POOKIE_MAGIC_EDEN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.collectionLink}
      >
        View collection <ExternalLink size={16} />
      </a>

      <section className={styles.splash} aria-label="Pookie">
        <div className={styles.modelGlow} aria-hidden="true" />
        <div className={styles.modelStage} aria-label="Interactive 3D Pookie model">
          <GalleryPookieModel />
        </div>
        <img src="/website/wix/title-text.gif" alt="Pookie" className={styles.titleArt} />
      </section>

      <GalleryGrid items={galleryItems} />
    </main>
  )
}
