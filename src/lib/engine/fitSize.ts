/**
 * Finds the best-looking encode that fits a byte budget.
 *
 * Strategy, cheapest first:
 * 1. Try the user's quality. If it fits, keep it (never lower quality needlessly).
 * 2. Binary-search quality down to `minQuality`. Below that artefacts get ugly,
 *    so instead of going lower we…
 * 3. …shrink the image and search again.
 * Huge sources are pre-shrunk from a rough bits-per-pixel estimate, so a 24 MP photo
 * aimed at 500 KB isn't encoded at full size half a dozen times.
 */

export interface FitImage {
  width: number
  height: number
}

export interface FitOptions<I extends FitImage> {
  image: I
  targetBytes: number
  /** Lossy formats search quality; lossless ones can only shrink. */
  lossy: boolean
  /** Upper bound (the user's chosen quality). */
  maxQuality: number
  minQuality?: number
  /** Rough compressed bits per pixel at mid quality, for the up-front size estimate. */
  bitsPerPixel: number
  encode: (image: I, quality: number) => Promise<ArrayBuffer>
  resize: (image: I, width: number, height: number) => Promise<I>
  onStep?: (step: number) => void
}

export interface FitResult<I extends FitImage> {
  bytes: ArrayBuffer
  image: I
  /** Quality used (null for lossless formats). */
  quality: number | null
  reached: boolean
}

const MAX_SHRINKS = 6
const MAX_SEARCH_STEPS = 6
const MIN_SIDE = 16
/** Aim a little under the budget when shrinking; size doesn't scale exactly with area. */
const SHRINK_MARGIN = 0.92

export async function fitToSize<I extends FitImage>(o: FitOptions<I>): Promise<FitResult<I>> {
  const minQ = Math.min(o.minQuality ?? 40, o.maxQuality)
  let step = 0
  const encode = async (img: I, q: number) => {
    o.onStep?.(++step)
    return o.encode(img, q)
  }
  const shrinkTo = async (img: I, scale: number): Promise<I | null> => {
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    if (Math.min(w, h) < MIN_SIDE || scale >= 1) return null
    return o.resize(img, w, h)
  }

  let image = o.image
  // Up-front estimate: skip straight past sizes that can't possibly fit.
  const estimate = (image.width * image.height * o.bitsPerPixel) / 8
  if (estimate > o.targetBytes * 2) {
    const smaller = await shrinkTo(image, Math.sqrt(o.targetBytes / estimate))
    if (smaller) image = smaller
  }

  let smallest: FitResult<I> | null = null
  const keepSmallest = (bytes: ArrayBuffer, img: I, quality: number | null) => {
    if (!smallest || bytes.byteLength < smallest.bytes.byteLength) smallest = { bytes, image: img, quality, reached: false }
  }

  for (let round = 0; round <= MAX_SHRINKS; round++) {
    if (!o.lossy) {
      const bytes = await encode(image, o.maxQuality)
      if (bytes.byteLength <= o.targetBytes) return { bytes, image, quality: null, reached: true }
      keepSmallest(bytes, image, null)
      const next = await shrinkTo(image, Math.sqrt(o.targetBytes / bytes.byteLength) * SHRINK_MARGIN)
      if (!next) break
      image = next
      continue
    }

    const atMax = await encode(image, o.maxQuality)
    if (atMax.byteLength <= o.targetBytes) return { bytes: atMax, image, quality: o.maxQuality, reached: true }
    keepSmallest(atMax, image, o.maxQuality)

    const atMin = await encode(image, minQ)
    keepSmallest(atMin, image, minQ)
    if (atMin.byteLength > o.targetBytes) {
      // Even the lowest acceptable quality is too big: shrink and retry.
      const next = await shrinkTo(image, Math.sqrt(o.targetBytes / atMin.byteLength) * SHRINK_MARGIN)
      if (!next) break
      image = next
      continue
    }

    // Binary search: `lo` always fits, `hi` never does.
    let lo = minQ
    let best = atMin
    let hi = o.maxQuality
    for (let i = 0; i < MAX_SEARCH_STEPS && hi - lo > 1; i++) {
      const mid = Math.round((lo + hi) / 2)
      const bytes = await encode(image, mid)
      if (bytes.byteLength <= o.targetBytes) {
        lo = mid
        best = bytes
      } else hi = mid
    }
    return { bytes: best, image, quality: lo, reached: true }
  }

  return smallest!
}

/** Typical bits per pixel at mid quality, used only for the up-front shrink estimate. */
export const BITS_PER_PIXEL: Record<string, number> = {
  jpeg: 1.2,
  webp: 0.9,
  avif: 0.6,
  png: 10,
  gif: 4,
  bmp: 24,
  tiff: 32,
  ico: 10,
}
