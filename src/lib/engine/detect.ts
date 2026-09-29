import type { InputFormat } from "@/lib/codecs/types"

const HEIF_BRANDS = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"])
const AVIF_BRANDS = new Set(["avif", "avis"])

const ascii = (b: Uint8Array, start: number, len: number) =>
  String.fromCharCode(...b.subarray(start, start + len))

/** Identifies an image by its magic bytes (file extensions and MIME types lie, especially for HEIC). */
export function detectFormat(bytes: Uint8Array): InputFormat {
  const b = bytes
  if (b.length < 4) return "unknown"

  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg"
  if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG") return "png"
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp"
  if (ascii(b, 0, 4) === "GIF8") return "gif"
  if (b[0] === 0x42 && b[1] === 0x4d) return "bmp"
  if ((b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0) || (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0 && b[3] === 0x2a))
    return "tiff"
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return "ico"

  // ISO-BMFF: [size][ftyp][major brand][minor version][compatible brands...]
  if (b.length >= 12 && ascii(b, 4, 4) === "ftyp") {
    const boxSize = Math.min(((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0, b.length)
    const brands = [ascii(b, 8, 4)]
    for (let i = 16; i + 4 <= boxSize; i += 4) brands.push(ascii(b, i, 4))
    // AVIF files also list "mif1", so check AVIF brands first.
    if (brands.some((x) => AVIF_BRANDS.has(x))) return "avif"
    if (brands.some((x) => HEIF_BRANDS.has(x))) return "heic"
  }

  const head = new TextDecoder().decode(b.subarray(0, Math.min(b.length, 256))).trimStart()
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "svg"

  return "unknown"
}

/** Bytes needed by detectFormat. */
export const SNIFF_BYTES = 256
