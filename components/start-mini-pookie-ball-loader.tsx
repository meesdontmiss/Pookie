"use client"

import type { ComponentType } from "react"
import { useEffect, useState } from "react"

function PookieBallFallback() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        borderRadius: "8px",
        background: "radial-gradient(circle at 50% 44%, rgba(125, 249, 255, 0.2), transparent 62%)",
      }}
    >
      <img
        src="/website/wix/pookie-spin.gif"
        alt=""
        aria-hidden="true"
        style={{
          width: "116%",
          height: "116%",
          objectFit: "contain",
          transform: "translateY(3%)",
        }}
      />
    </div>
  )
}

export default function StartMiniPookieBallLoader() {
  const [StartMiniPookieBall, setStartMiniPookieBall] = useState<ComponentType | null>(null)

  useEffect(() => {
    let isMounted = true

    import("@/components/start-mini-pookie-ball")
      .then((module) => {
        if (isMounted) {
          setStartMiniPookieBall(() => module.default)
        }
      })
      .catch(() => {
        if (isMounted) {
          setStartMiniPookieBall(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (!StartMiniPookieBall) {
    return <PookieBallFallback />
  }

  return <StartMiniPookieBall />
}
