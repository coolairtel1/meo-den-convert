export type ResizeMode = "none" | "max" | "percent"

export interface ResizeOptions {
  mode: ResizeMode
  /** Longest side in px for "max" (never upscales). */
  max: number
  /** Scale in % for "percent". */
  percent: number
}

/** Output dimensions, or null when the image should keep its size. */
export function targetSize(width: number, height: number, r: ResizeOptions): { width: number; height: number } | null {
  let scale = 1
  if (r.mode === "max" && r.max > 0) scale = Math.min(1, r.max / Math.max(width, height))
  else if (r.mode === "percent" && r.percent > 0) scale = r.percent / 100
  if (scale === 1) return null
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** High-quality (Lanczos3, alpha-correct) resize; the WASM loads on first use. */
export async function resizeImage(image: ImageData, width: number, height: number): Promise<ImageData> {
  const { default: resize } = await import("@jsquash/resize")
  return resize(image, { width, height, method: "lanczos3", fitMethod: "stretch", premultiply: true, linearRGB: true })
}

/** Centers the image on a transparent square canvas (for icons). */
export function padToSquare(image: ImageData): ImageData {
  const side = Math.max(image.width, image.height)
  if (image.width === image.height) return image
  const out = new ImageData(side, side)
  const ox = Math.floor((side - image.width) / 2)
  const oy = Math.floor((side - image.height) / 2)
  for (let y = 0; y < image.height; y++) {
    const row = image.data.subarray(y * image.width * 4, (y + 1) * image.width * 4)
    out.data.set(row, ((y + oy) * side + ox) * 4)
  }
  return out
}
