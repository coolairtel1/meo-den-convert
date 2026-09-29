import type { Decoder } from "./types"

/**
 * Browser-native decoding via createImageBitmap (works inside workers).
 * EXIF orientation is applied by the browser ("from-image" is the default).
 */
export const nativeDecoder: Decoder = {
  formats: ["jpeg", "png", "webp", "gif", "bmp", "avif", "ico"],
  async decode(file) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" })
    try {
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      if (!ctx) throw new Error("2d context unavailable")
      ctx.drawImage(bitmap, 0, 0)
      return ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    } finally {
      bitmap.close()
    }
  },
}
