import encodePng from "@jsquash/png/encode"
import { padToSquare, resizeImage } from "./resize"
import type { Encoder } from "./types"

const ICON_SIZES = [16, 24, 32, 48, 64, 128, 256]

/** Packs PNG images into an ICO container (PNG-in-ICO, supported since Windows Vista). */
export function buildIco(images: { size: number; png: ArrayBuffer }[]): ArrayBuffer {
  const headerSize = 6 + 16 * images.length
  const total = headerSize + images.reduce((n, i) => n + i.png.byteLength, 0)
  const buf = new ArrayBuffer(total)
  const v = new DataView(buf)
  const bytes = new Uint8Array(buf)
  v.setUint16(2, 1, true) // type: icon
  v.setUint16(4, images.length, true)
  let offset = headerSize
  images.forEach(({ size, png }, i) => {
    const e = 6 + 16 * i
    v.setUint8(e, size >= 256 ? 0 : size) // 0 means 256
    v.setUint8(e + 1, size >= 256 ? 0 : size)
    v.setUint16(e + 4, 1, true) // colour planes
    v.setUint16(e + 6, 32, true) // bits per pixel
    v.setUint32(e + 8, png.byteLength, true)
    v.setUint32(e + 12, offset, true)
    bytes.set(new Uint8Array(png), offset)
    offset += png.byteLength
  })
  return buf
}

/** Standard icon sizes up to the source size (never upscaled past it, but at least 16 px). */
export const iconSizesFor = (side: number) => {
  const sizes = ICON_SIZES.filter((s) => s <= side)
  return sizes.length ? sizes : [16]
}

export const icoEncoder: Encoder = {
  format: "ico",
  mime: "image/x-icon",
  extension: "ico",
  lossy: false,
  supportsAlpha: true,
  async encode(image) {
    const square = padToSquare(image)
    const images = []
    for (const size of iconSizesFor(square.width)) {
      const scaled = size === square.width ? square : await resizeImage(square, size, size)
      images.push({ size, png: await encodePng(scaled) })
    }
    return buildIco(images)
  },
}
