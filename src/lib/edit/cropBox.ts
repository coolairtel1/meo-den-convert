/**
 * Crop-box interaction math in fractions of the (oriented) image.
 * `k` is the locked aspect in fraction space (w/h), or null for free cropping.
 */
import type { CropRect } from "./transform"

export type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw"

export const MIN_CROP = 0.05
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export const FULL: CropRect = { x: 0, y: 0, w: 1, h: 1 }

export function moveCrop(c: CropRect, dx: number, dy: number): CropRect {
  return { ...c, x: clamp(c.x + dx, 0, 1 - c.w), y: clamp(c.y + dy, 0, 1 - c.h) }
}

export function resizeCrop(c: CropRect, handle: Handle, dx: number, dy: number, k: number | null): CropRect {
  const right = c.x + c.w
  const bottom = c.y + c.h
  const west = handle.includes("w")
  const east = handle.includes("e")
  const north = handle.includes("n")
  const south = handle.includes("s")

  if (k === null) {
    let { x, y, w, h } = c
    if (east) w = clamp(c.w + dx, MIN_CROP, 1 - c.x)
    if (west) {
      x = clamp(c.x + dx, 0, right - MIN_CROP)
      w = right - x
    }
    if (south) h = clamp(c.h + dy, MIN_CROP, 1 - c.y)
    if (north) {
      y = clamp(c.y + dy, 0, bottom - MIN_CROP)
      h = bottom - y
    }
    return { x, y, w, h }
  }

  // Locked aspect: corners only. Grow/shrink from the opposite corner, staying inside the image.
  const ax = west ? right : c.x // anchor x
  const ay = north ? bottom : c.y // anchor y
  const maxW = west ? ax : 1 - ax
  const maxH = north ? ay : 1 - ay
  let w = c.w + (west ? -dx : dx)
  w = Math.min(w, maxW, maxH * k)
  w = Math.max(w, MIN_CROP, MIN_CROP * k)
  w = Math.min(w, maxW, maxH * k) // bounds win over the minimum
  const h = w / k
  return { x: west ? ax - w : ax, y: north ? ay - h : ay, w, h }
}

/** Nudges with the keyboard (arrow keys move the box). */
export const nudgeCrop = (c: CropRect, key: string, step: number): CropRect | null => {
  if (key === "ArrowLeft") return moveCrop(c, -step, 0)
  if (key === "ArrowRight") return moveCrop(c, step, 0)
  if (key === "ArrowUp") return moveCrop(c, 0, -step)
  if (key === "ArrowDown") return moveCrop(c, 0, step)
  return null
}
