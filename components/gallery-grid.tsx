"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Check, ChevronLeft, ChevronRight, Copy, Download, X } from "lucide-react"
import styles from "@/app/gallery/page.module.css"

export type GalleryItem = {
  src: string
  downloadName: string
  title: string
  alt: string
  media: "image" | "video"
}

const PAGE_SIZE = 24

function triggerDownload(item: GalleryItem) {
  const link = document.createElement("a")
  link.href = item.src
  link.download = item.downloadName
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function copyImageToClipboard(item: GalleryItem) {
  // Clipboard image support is image/png only, so route everything through a canvas.
  const response = await fetch(item.src)
  const blob = await response.blob()
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement("canvas")
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("no 2d context")
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!pngBlob) throw new Error("encode failed")
  await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })])
}

function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: GalleryItem[]
  index: number
  onClose: () => void
  onNavigate: (next: number) => void
}) {
  const item = items[index]
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setCopied(false)
  }, [index])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
      if (event.key === "ArrowRight") onNavigate((index + 1) % items.length)
      if (event.key === "ArrowLeft") onNavigate((index - 1 + items.length) % items.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, items.length, onClose, onNavigate])

  const handleCopy = useCallback(async () => {
    try {
      await copyImageToClipboard(item)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Fallback: copy a link to the asset if the image clipboard write is unavailable.
      try {
        await navigator.clipboard.writeText(`${window.location.origin}${item.src}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      } catch {
        /* clipboard unavailable */
      }
    }
  }, [item])

  if (!item) return null

  return (
    <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label={item.title} onClick={onClose}>
      <button type="button" className={styles.lightboxClose} onClick={onClose} aria-label="Close">
        <X size={20} aria-hidden="true" />
      </button>

      <button
        type="button"
        className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
        onClick={(event) => {
          event.stopPropagation()
          onNavigate((index - 1 + items.length) % items.length)
        }}
        aria-label="Previous"
      >
        <ChevronLeft size={26} aria-hidden="true" />
      </button>

      <div className={styles.lightboxStage} onClick={(event) => event.stopPropagation()}>
        <div className={styles.lightboxMedia}>
          {item.media === "video" ? (
            <video src={item.src} controls autoPlay loop playsInline />
          ) : (
            <img src={item.src} alt={item.alt} />
          )}
        </div>
        <div className={styles.lightboxBar}>
          <span className={styles.lightboxTitle}>{item.title}</span>
          <div className={styles.lightboxButtons}>
            {item.media === "image" ? (
              <button type="button" className={styles.lightboxButton} onClick={handleCopy}>
                {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                {copied ? "Copied" : "Copy"}
              </button>
            ) : null}
            <button type="button" className={styles.lightboxButton} onClick={() => triggerDownload(item)}>
              <Download size={16} aria-hidden="true" />
              Download
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.lightboxNav} ${styles.lightboxNext}`}
        onClick={(event) => {
          event.stopPropagation()
          onNavigate((index + 1) % items.length)
        }}
        aria-label="Next"
      >
        <ChevronRight size={26} aria-hidden="true" />
      </button>
    </div>
  )
}

export default function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [page, setPage] = useState(0)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement | null>(null)

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const start = page * PAGE_SIZE
  const pageItems = useMemo(() => items.slice(start, start + PAGE_SIZE), [items, start])

  const goToPage = useCallback((next: number) => {
    setPage(next)
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  useEffect(() => {
    document.body.style.overflow = activeIndex === null ? "" : "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [activeIndex])

  return (
    <>
      <section ref={gridRef} className={styles.gallery} aria-label="Pookie gallery">
        {pageItems.map((item, i) => (
          <button
            key={item.src}
            type="button"
            className={styles.galleryItem}
            onClick={() => setActiveIndex(start + i)}
            aria-label={`Open ${item.title}`}
          >
            {item.media === "video" ? (
              <video src={item.src} muted loop playsInline preload="metadata" />
            ) : (
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width: 540px) 50vw, (max-width: 1220px) 25vw, 200px"
                style={{ objectFit: "cover" }}
              />
            )}
          </button>
        ))}
      </section>

      {pageCount > 1 ? (
        <nav className={styles.pagination} aria-label="Gallery pages">
          <button
            type="button"
            className={styles.pageArrow}
            onClick={() => goToPage(Math.max(0, page - 1))}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.pageNumber} ${i === page ? styles.pageNumberActive : ""}`}
              onClick={() => goToPage(i)}
              aria-current={i === page ? "page" : undefined}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            className={styles.pageArrow}
            onClick={() => goToPage(Math.min(pageCount - 1, page + 1))}
            disabled={page === pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </nav>
      ) : null}

      {activeIndex !== null ? (
        <Lightbox
          items={items}
          index={activeIndex}
          onClose={() => setActiveIndex(null)}
          onNavigate={setActiveIndex}
        />
      ) : null}
    </>
  )
}
