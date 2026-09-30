/**
 * Per-image edits: rotate → flip → crop, done directly on RGBA pixels (pure, worker-friendly, testable).
 * Crop is stored as fractions (0–1) of the *oriented* image, so it doesn't depend on preview size.
 */

export type Rotation = 0 | 90 | 180 | 270

export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

export interface Edits {
  /** Clockwise. */
  rotate: Rotation
  flipX: boolean
  flipY: boolean
  crop: CropRect | null
  /** Aspect preset last used in the editor (UI memory only). */
  aspect?: string
}

export const NO_EDITS: Edits = { rotate: 0, flipX: false, flipY: false, crop: null }

export interface Pixels {
  width: number
  height: number
  data: Uint8ClampedArray
}

export const hasEdits = (e?: Edits | null): e is Edits =>
  !!e && (e.rotate !== 0 || e.flipX || e.flipY || (e.crop !== null && !isFullCrop(e.crop)))

const isFullCrop = (c: CropRect) => c.x <= 0 && c.y <= 0 && c.w >= 1 && c.h >= 1

/** Stable key for "was this result made with these edits?". */
export const editsKey = (e?: Edits | null) => {
  if (!hasEdits(e)) return ""
  const c = e.crop && !isFullCrop(e.crop) ? [e.crop.x, e.crop.y, e.crop.w, e.crop.h].map((v) => v.toFixed(4)).join(",") : ""
  return `${e.rotate}${e.flipX ? "h" : ""}${e.flipY ? "v" : ""}${c ? `c${c}` : ""}`
}

/** Size after rotation (before crop). */
export const orientedSize = (w: number, h: number, rotate: Rotation) => (rotate % 180 ? { width: h, height: w } : { width: w, height: h })

/** Crop fractions → integer pixel rect inside a `w × h` image (at least 1 px). */
export function cropPixels(c: CropRect, w: number, h: number) {
  const x = Math.min(w - 1, Math.max(0, Math.round(c.x * w)))
  const y = Math.min(h - 1, Math.max(0, Math.round(c.y * h)))
  const width = Math.max(1, Math.min(w - x, Math.round(c.w * w)))
  const height = Math.max(1, Math.min(h - y, Math.round(c.h * h)))
  return { x, y, width, height }
}

const words = (p: Pixels) => new Uint32Array(p.data.buffer, p.data.byteOffset, p.width * p.height)

function rotatePixels(src: Pixels, rotate: Rotation): Pixels {
  if (rotate === 0) return src
  const { width: w, height: h } = src
  const { width: W, height: H } = orientedSize(w, h, rotate)
  const out: Pixels = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) }
  const s = words(src)
  const d = words(out)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = s[y * w + x]
      if (rotate === 90) d[x * W + (W - 1 - y)] = v
      else if (rotate === 180) d[(H - 1 - y) * W + (W - 1 - x)] = v
      else d[(H - 1 - x) * W + y] = v // 270
    }
  }
  return out
}

function flipPixels(p: Pixels, flipX: boolean, flipY: boolean): Pixels {
  if (!flipX && !flipY) return p
  const { width: w, height: h } = p
  const out: Pixels = { width: w, height: h, data: new Uint8ClampedArray(p.data.length) }
  const s = words(p)
  const d = words(out)
  for (let y = 0; y < h; y++) {
    const sy = flipY ? h - 1 - y : y
    for (let x = 0; x < w; x++) d[y * w + x] = s[sy * w + (flipX ? w - 1 - x : x)]
  }
  return out
}

function cropPixelsOf(p: Pixels, c: CropRect | null): Pixels {
  if (!c || isFullCrop(c)) return p
  const r = cropPixels(c, p.width, p.height)
  const out: Pixels = { width: r.width, height: r.height, data: new Uint8ClampedArray(r.width * r.height * 4) }
  for (let y = 0; y < r.height; y++) {
    const start = ((r.y + y) * p.width + r.x) * 4
    out.data.set(p.data.subarray(start, start + r.width * 4), y * r.width * 4)
  }
  return out
}

/** rotate → flip → crop. Returns the input untouched when there's nothing to do. */
export function applyEdits(p: Pixels, e?: Edits | null): Pixels {
  if (!hasEdits(e)) return p
  return cropPixelsOf(flipPixels(rotatePixels(p, e.rotate), e.flipX, e.flipY), e.crop)
}

/** Aspect presets for the crop tool; null = free. */
export const ASPECTS: { id: string; ratio: number | null }[] = [
  { id: "free", ratio: null },
  { id: "1:1", ratio: 1 },
  { id: "4:5", ratio: 4 / 5 },
  { id: "3:4", ratio: 3 / 4 },
  { id: "16:9", ratio: 16 / 9 },
  { id: "9:16", ratio: 9 / 16 },
]

/** Largest centred crop with the given pixel aspect ratio, as fractions of a `w × h` image. */
export function centeredCrop(ratio: number, w: number, h: number): CropRect {
  const imageRatio = w / h
  if (ratio > imageRatio) {
    const hFrac = imageRatio / ratio
    return { x: 0, y: (1 - hFrac) / 2, w: 1, h: hFrac }
  }
  const wFrac = ratio / imageRatio
  return { x: (1 - wFrac) / 2, y: 0, w: wFrac, h: 1 }
}
