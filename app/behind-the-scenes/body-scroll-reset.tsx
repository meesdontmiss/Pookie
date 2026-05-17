"use client"

import { useEffect } from "react"

export function BodyScrollReset() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const previous = {
      htmlHeight: html.style.height,
      htmlOverflowX: html.style.overflowX,
      htmlOverflowY: html.style.overflowY,
      bodyHeight: body.style.height,
      bodyMaxWidth: body.style.maxWidth,
      bodyOverscrollBehaviorY: body.style.overscrollBehaviorY,
      bodyOverflowX: body.style.overflowX,
      bodyOverflowY: body.style.overflowY,
      bodyPosition: body.style.position,
    }

    html.style.height = "auto"
    html.style.overflowX = "hidden"
    html.style.overflowY = "auto"
    body.style.height = "auto"
    body.style.maxWidth = "100vw"
    body.style.overscrollBehaviorY = "auto"
    body.style.overflowX = "hidden"
    body.style.overflowY = "auto"
    body.style.position = "relative"

    return () => {
      html.style.height = previous.htmlHeight
      html.style.overflowX = previous.htmlOverflowX
      html.style.overflowY = previous.htmlOverflowY
      body.style.height = previous.bodyHeight
      body.style.maxWidth = previous.bodyMaxWidth
      body.style.overscrollBehaviorY = previous.bodyOverscrollBehaviorY
      body.style.overflowX = previous.bodyOverflowX
      body.style.overflowY = previous.bodyOverflowY
      body.style.position = previous.bodyPosition
    }
  }, [])

  return null
}
