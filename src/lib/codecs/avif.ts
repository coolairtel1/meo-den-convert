import type { Encoder } from "./types"

export const avifEncoder: Encoder = {
  format: "avif",
  mime: "image/avif",
  extension: "avif",
  lossy: true,
  supportsAlpha: true,
  async encode(image, { quality }) {
    const { default: encode } = await import("@jsquash/avif/encode")
    // AVIF's quality scale runs lower than JPEG's for similar looks (85 ≈ 64); speed 8 keeps big photos bearable.
    return encode(image, { quality: Math.round(quality * 0.75), speed: 8 })
  },
}
