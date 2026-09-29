import { flattenAlpha } from "./pixels"
import type { Encoder } from "./types"

/** 24-bit bottom-up BMP (BITMAPINFOHEADER): the most widely readable variant. */
export function encodeBmp(image: ImageData): ArrayBuffer {
  const { width: w, height: h, data } = image
  const rowSize = Math.ceil((w * 3) / 4) * 4
  const pixelBytes = rowSize * h
  const buf = new ArrayBuffer(54 + pixelBytes)
  const v = new DataView(buf)
  v.setUint8(0, 0x42) // "B"
  v.setUint8(1, 0x4d) // "M"
  v.setUint32(2, 54 + pixelBytes, true)
  v.setUint32(10, 54, true) // pixel data offset
  v.setUint32(14, 40, true) // header size
  v.setInt32(18, w, true)
  v.setInt32(22, h, true) // positive = bottom-up
  v.setUint16(26, 1, true) // planes
  v.setUint16(28, 24, true) // bits per pixel
  v.setUint32(34, pixelBytes, true)
  v.setInt32(38, 2835, true) // 72 dpi
  v.setInt32(42, 2835, true)
  const out = new Uint8Array(buf, 54)
  for (let y = 0; y < h; y++) {
    let o = y * rowSize
    const src = (h - 1 - y) * w * 4
    for (let x = 0; x < w; x++) {
      const i = src + x * 4
      out[o++] = data[i + 2]
      out[o++] = data[i + 1]
      out[o++] = data[i]
    }
  }
  return buf
}

export const bmpEncoder: Encoder = {
  format: "bmp",
  mime: "image/bmp",
  extension: "bmp",
  lossy: false,
  supportsAlpha: false,
  async encode(image, { background }) {
    flattenAlpha(image.data, background)
    return encodeBmp(image)
  },
}
