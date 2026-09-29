import { isDisplayP3, p3ToSrgb } from "./color"
import type { Decoder, Encoder } from "./types"

type Utif = typeof import("utif2")

let utif: Promise<Utif> | undefined

/**
 * utif2 is CommonJS and, outside Node, grabs `self.pako` (for deflate TIFFs) the moment it is
 * evaluated, so pako must be on the global scope before utif2 is imported.
 */
function loadUtif(): Promise<Utif> {
  utif ??= (async () => {
    const { default: pako } = await import("pako")
    ;(globalThis as { pako?: unknown }).pako ??= pako
    const mod = await import("utif2")
    return ((mod as { default?: Utif }).default ?? mod) as Utif
  })()
  return utif
}

export const tiffDecoder: Decoder = {
  formats: ["tiff"],
  async decode(file) {
    const UTIF = await loadUtif()
    const buf = await file.arrayBuffer()
    const ifds = UTIF.decode(buf)
    if (!ifds.length) throw new Error("no image in TIFF")
    // Multi-page scans: take the largest page (thumbnails are often stored first).
    // Dimensions live in tags 256/257 until a page is decoded.
    const dim = (tag: unknown) => Number((tag as number[] | undefined)?.[0] ?? 0)
    const area = (ifd: (typeof ifds)[number]) => dim(ifd.t256) * dim(ifd.t257)
    const page = ifds.reduce((best, ifd) => (area(ifd) > area(best) ? ifd : best))
    UTIF.decodeImage(buf, page)
    const rgba = UTIF.toRGBA8(page)
    const data = new Uint8ClampedArray(rgba.buffer as ArrayBuffer, rgba.byteOffset, rgba.byteLength)
    // Tag 34675 holds the ICC profile; UTIF doesn't colour-manage, so handle the common P3 case.
    const icc = page.t34675
    if (icc && isDisplayP3(Uint8Array.from(icc as ArrayLike<number>))) p3ToSrgb(data)
    return new ImageData(data, page.width, page.height)
  },
}

export const tiffEncoder: Encoder = {
  format: "tiff",
  mime: "image/tiff",
  extension: "tiff",
  lossy: false,
  supportsAlpha: true,
  async encode(image) {
    const UTIF = await loadUtif()
    return UTIF.encodeImage(new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength), image.width, image.height)
  },
}
