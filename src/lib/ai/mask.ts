/** Pre/post-processing for segmentation models (pure, worker-friendly). */
import type { PostProcess } from "./models"

/** RGBA S×S → normalized planar CHW float32 (RGB). */
export function toCHW(rgba: Uint8ClampedArray, size: number, mean: readonly number[], std: readonly number[]): Float32Array {
  const n = size * size
  const out = new Float32Array(3 * n)
  for (let i = 0; i < n; i++) {
    out[i] = (rgba[i * 4] / 255 - mean[0]) / std[0]
    out[n + i] = (rgba[i * 4 + 1] / 255 - mean[1]) / std[1]
    out[2 * n + i] = (rgba[i * 4 + 2] / 255 - mean[2]) / std[2]
  }
  return out
}

/** Raw model output → mask in 0…1. */
export function normalizeMask(values: ArrayLike<number>, count: number, post: PostProcess): Float32Array {
  const m = new Float32Array(count)
  for (let i = 0; i < count; i++) m[i] = values[i]
  if (post === "minmax") {
    let lo = Infinity
    let hi = -Infinity
    for (const v of m) {
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
    const span = hi - lo || 1
    for (let i = 0; i < count; i++) m[i] = (m[i] - lo) / span
  }
  for (let i = 0; i < count; i++) m[i] = Math.min(1, Math.max(0, m[i]))
  return m
}

/**
 * Multiplies each pixel's alpha by the S×S mask, upsampled bilinearly to W×H (in place).
 * Pixel centres are aligned so the mask doesn't drift by half a cell.
 */
export function applyMask(rgba: Uint8ClampedArray, W: number, H: number, mask: Float32Array, S: number): Uint8ClampedArray {
  const sx = S / W
  const sy = S / H
  for (let y = 0; y < H; y++) {
    const fy = Math.min(S - 1, Math.max(0, (y + 0.5) * sy - 0.5))
    const y0 = Math.floor(fy)
    const y1 = Math.min(S - 1, y0 + 1)
    const ty = fy - y0
    for (let x = 0; x < W; x++) {
      const fx = Math.min(S - 1, Math.max(0, (x + 0.5) * sx - 0.5))
      const x0 = Math.floor(fx)
      const x1 = Math.min(S - 1, x0 + 1)
      const tx = fx - x0
      const top = mask[y0 * S + x0] * (1 - tx) + mask[y0 * S + x1] * tx
      const bottom = mask[y1 * S + x0] * (1 - tx) + mask[y1 * S + x1] * tx
      const a = top * (1 - ty) + bottom * ty
      const i = (y * W + x) * 4 + 3
      rgba[i] = Math.round(rgba[i] * a)
    }
  }
  return rgba
}
