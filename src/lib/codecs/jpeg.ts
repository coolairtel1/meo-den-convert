import encodeJpeg from "@jsquash/jpeg/encode"
import { flattenAlpha } from "./pixels"
import type { Encoder } from "./types"

export const jpegEncoder: Encoder = {
  format: "jpeg",
  mime: "image/jpeg",
  extension: "jpg",
  lossy: true,
  supportsAlpha: false,
  encode(image, { quality, background }) {
    flattenAlpha(image.data, background)
    return encodeJpeg(image, { quality, progressive: true, optimize_coding: true })
  },
}
