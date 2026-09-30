import type { WatermarkJob } from "@/lib/edit/composite"
import type { WatermarkPosition } from "@/lib/edit/watermark"
import { luminance } from "@/lib/qr/contrast"

export interface WatermarkSettings {
  enabled: boolean
  type: "text" | "logo"
  text: string
  color: string
  /** Downscaled PNG data URL. */
  logo: string | null
  position: WatermarkPosition
  scale: number
  opacity: number
  margin: number
}

export const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: false,
  type: "text",
  text: "© Mèo Đen",
  color: "#ffffff",
  logo: null,
  position: "br",
  scale: 0.25,
  opacity: 0.7,
  margin: 0.03,
}

const FONT = "700 96px 'Baloo 2 Variable', sans-serif"

/**
 * Renders a text mark once on the main thread (workers can't rely on the app's web fonts),
 * with a soft contrasting shadow so it reads on both light and dark photos.
 */
async function renderTextMark(text: string, color: string): Promise<Blob> {
  try {
    await document.fonts.load(FONT, text)
  } catch {
    // fall back to the default font
  }
  const measure = document.createElement("canvas").getContext("2d")!
  measure.font = FONT
  const m = measure.measureText(text)
  const pad = 24
  const ascent = Math.ceil(m.actualBoundingBoxAscent || 72)
  const descent = Math.ceil(m.actualBoundingBoxDescent || 24)
  const canvas = document.createElement("canvas")
  canvas.width = Math.ceil(m.width) + pad * 2
  canvas.height = ascent + descent + pad * 2
  const ctx = canvas.getContext("2d")!
  ctx.font = FONT
  ctx.fillStyle = color
  ctx.shadowColor = luminance(color) > 0.5 ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)"
  ctx.shadowBlur = 10
  ctx.fillText(text, pad, pad + ascent)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("mark render failed"))), "image/png"))
}

/** Settings → a job the worker can composite, or null when there's nothing to draw. */
export async function buildWatermarkJob(w: WatermarkSettings): Promise<WatermarkJob | null> {
  if (!w.enabled) return null
  let mark: Blob
  if (w.type === "logo") {
    if (!w.logo) return null
    mark = await (await fetch(w.logo)).blob()
  } else {
    const text = w.text.trim()
    if (!text) return null
    mark = await renderTextMark(text, w.color)
  }
  return { mark, position: w.position, scale: w.scale, opacity: w.opacity, margin: w.margin }
}

/** Short fingerprint so a changed logo invalidates results without storing it in the key. */
function hash(s: string) {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

export const watermarkKey = (w: WatermarkSettings) =>
  w.enabled && (w.type === "logo" ? !!w.logo : !!w.text.trim())
    ? [w.type, w.type === "text" ? `${w.text.trim()}${w.color}` : hash(w.logo!), w.position, w.scale, w.opacity, w.margin].join("~")
    : ""
