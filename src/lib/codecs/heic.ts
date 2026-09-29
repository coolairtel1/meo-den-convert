import type { LibHeif } from "libheif-js/libheif-wasm/libheif.js"
import { isDisplayP3, p3ToSrgb } from "./color"
import { nativeDecoder } from "./native"
import type { Decoder } from "./types"

let libheif: Promise<LibHeif> | undefined

/** Loads libheif (JS glue + 1.4 MB WASM) on first use only. */
function loadLibheif(): Promise<LibHeif> {
  libheif ??= (async () => {
    const [{ default: factory }, { default: wasmUrl }] = await Promise.all([
      import("libheif-js/libheif-wasm/libheif.js"),
      import("libheif-js/libheif-wasm/libheif.wasm?url"),
    ])
    // This glue compiles the WASM synchronously, so it must be handed the bytes up front.
    const res = await fetch(wasmUrl)
    if (!res.ok) throw new Error(`libheif.wasm: HTTP ${res.status}`)
    const wasmBinary = new Uint8Array(await res.arrayBuffer())

    return new Promise<LibHeif>((resolve, reject) => {
      let initialized = false
      let mod: LibHeif | undefined
      // With sync compilation onRuntimeInitialized may fire before factory() returns.
      mod = factory({
        wasmBinary,
        onRuntimeInitialized: () => {
          initialized = true
          if (mod) resolve(mod)
        },
        onAbort: (reason) => reject(new Error(`libheif failed to load: ${String(reason)}`)),
      })
      if (initialized) resolve(mod)
    })
  })().catch((e) => {
    libheif = undefined // allow a retry after e.g. a network hiccup
    throw e
  })
  return libheif
}

/** HEIF keeps its colour profile in the meta box near the start of the file. */
const PROFILE_SCAN_BYTES = 64 * 1024

async function decodeWithLibheif(file: Blob): Promise<ImageData> {
  const lib = await loadLibheif()
  const decoder = new lib.HeifDecoder()
  const bytes = new Uint8Array(await file.arrayBuffer())
  const images = decoder.decode(bytes)
  try {
    if (!images.length) throw new Error("no image found in HEIF container")
    // Burst / Live Photo containers hold several images; the primary one is the photo itself.
    // libheif applies the container's rotation/mirroring (irot/imir) while decoding.
    const image = images.find((img) => img.is_primary()) ?? images[0]
    const target = new ImageData(image.get_width(), image.get_height())
    const out = await new Promise<ImageData>((resolve, reject) =>
      image.display(target, (res) => (res ? resolve(res) : reject(new Error("HEIF decoding failed")))),
    )
    // libheif returns raw values; iPhone photos are Display P3, so bring them into sRGB.
    if (isDisplayP3(bytes.subarray(0, PROFILE_SCAN_BYTES))) p3ToSrgb(out.data)
    return out
  } finally {
    images.forEach((img) => img.free())
    if (decoder.decoder) lib.heif_context_free(decoder.decoder)
    decoder.decoder = null
  }
}

export const heicDecoder: Decoder = {
  formats: ["heic"],
  async decode(file) {
    // Safari decodes HEIC natively and much faster; other browsers reject quickly.
    try {
      return await nativeDecoder.decode(file)
    } catch {
      return decodeWithLibheif(file)
    }
  },
}
