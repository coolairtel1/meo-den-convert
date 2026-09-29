import encodeWebp from "@jsquash/webp/encode"
import type { Encoder } from "./types"

export const webpEncoder: Encoder = {
  format: "webp",
  mime: "image/webp",
  extension: "webp",
  lossy: true,
  supportsAlpha: true,
  encode(image, { quality }) {
    return encodeWebp(image, { quality })
  },
}
