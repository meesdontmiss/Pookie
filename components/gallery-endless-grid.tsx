"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Download } from "lucide-react"
import styles from "@/app/gallery/page.module.css"

export type GalleryItem = {
  src: string
  downloadName: string
  title: string
  alt: string
  media: "image" | "video"
}

const INITIAL_COUNT = 18
const LOAD_STEP = 12

export default function GalleryEndlessGrid({ items }: { items: GalleryItem[] }) {
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const [visibleCount, setVisibleCount] = useState(() => Math.min(INITIAL_COUNT, items.length))
  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount])
  const hasMore = visibleCount < items.length

  useEffect(() => {
    setVisibleCount(Math.min(INITIAL_COUNT, items.length))
  }, [items.length])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((count) => Math.min(count + LOAD_STEP, items.length))
        }
      },
      { rootMargin: "900px 0px" },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, items.length, visibleCount])

  return (
    <>
      <section className={styles.gallery} aria-label="Pookie artwork gallery">
        {visibleItems.map((item) => (
          <article key={item.src} className={styles.galleryItem}>
            <div className={styles.imageFrame}>
              {item.media === "video" ? (
                <video src={item.src} aria-label={item.alt} autoPlay muted loop playsInline preload="metadata" />
              ) : (
                <img src={item.src} alt={item.alt} loading="lazy" />
              )}
              <a
                className={styles.downloadButton}
                href={item.src}
                download={item.downloadName}
                aria-label={`Download ${item.title}`}
                title={`Download ${item.title}`}
              >
                <Download size={16} aria-hidden="true" />
                Download
              </a>
            </div>
            <div className={styles.itemMeta}>
              <h2>{item.title}</h2>
            </div>
          </article>
        ))}
      </section>

      <div ref={sentinelRef} className={styles.gallerySentinel} aria-hidden="true">
        {hasMore ? "loading more pookie" : "all pookie loaded"}
      </div>
    </>
  )
}
