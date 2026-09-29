import encodePng from "@jsquash/png/encode"
import type { Encoder } from "./types"

export const pngEncoder: Encoder = {
  format: "png",
  mime: "image/png",
  extension: "png",
  lossy: false,
  supportsAlpha: true,
  encode(image) {
    return encodePng(image)
  },
}
