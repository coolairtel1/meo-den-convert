/** Watermark placement (pure) shared by the settings UI and the worker compositor. */

export type WatermarkPosition = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br" | "tile"

export const WATERMARK_POSITIONS: WatermarkPosition[] = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"]

export interface WatermarkPlacement {
  position: WatermarkPosition
  /** Mark width as a fraction of the image width. */
  scale: number
  opacity: number
  /** Gap to the edges as a fraction of the shorter image side. */
  margin: number
}

/** Where to draw a `markW × markH` (source px) mark on a `W × H` image. Tile mode is handled separately. */
export function placeMark(p: WatermarkPlacement, W: number, H: number, markW: number, markH: number) {
  const w = Math.max(1, W * p.scale)
  const h = (w * markH) / markW
  const m = Math.min(W, H) * p.margin
  const col = p.position[1] === "l" ? 0 : p.position[1] === "c" ? 1 : 2
  const row = p.position[0] === "t" ? 0 : p.position[0] === "m" ? 1 : 2
  const x = col === 0 ? m : col === 1 ? (W - w) / 2 : W - w - m
  const y = row === 0 ? m : row === 1 ? (H - h) / 2 : H - h - m
  return { x, y, w, h }
}
