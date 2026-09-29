import { hasTransparency } from "./pixels"
import type { Encoder } from "./types"

export const gifEncoder: Encoder = {
  format: "gif",
  mime: "image/gif",
  extension: "gif",
  lossy: false,
  supportsAlpha: true, // 1-bit
  async encode(image) {
    const { GIFEncoder, quantize, applyPalette } = await import("gifenc")
    const { data, width, height } = image
    const alpha = hasTransparency(data)
    const format = alpha ? "rgba4444" : "rgb565"
    const palette = quantize(data, 256, { format, oneBitAlpha: alpha })
    const index = applyPalette(data, palette, format)
    const transparentIndex = alpha ? palette.findIndex((c) => c[3] === 0) : -1
    const gif = GIFEncoder()
    gif.writeFrame(index, width, height, {
      palette,
      transparent: transparentIndex >= 0,
      transparentIndex: Math.max(0, transparentIndex),
    })
    gif.finish()
    return gif.bytes().buffer as ArrayBuffer
  },
}
