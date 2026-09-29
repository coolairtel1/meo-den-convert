import { avifEncoder } from "./avif"
import { bmpEncoder } from "./bmp"
import { gifEncoder } from "./gif"
import { heicDecoder } from "./heic"
import { icoEncoder } from "./ico"
import { jpegEncoder } from "./jpeg"
import { nativeDecoder } from "./native"
import { pngEncoder } from "./png"
import { tiffDecoder, tiffEncoder } from "./tiff"
import type { Decoder, Encoder, InputFormat, OutputFormat } from "./types"
import { webpEncoder } from "./webp"

// To add a format: implement Decoder/Encoder and register it here (and in support.ts for the UI).
// SVG is rasterized on the main thread before it reaches the worker (it needs the DOM).
const decoders: Decoder[] = [nativeDecoder, heicDecoder, tiffDecoder]

export const ENCODERS: Record<OutputFormat, Encoder> = {
  jpeg: jpegEncoder,
  png: pngEncoder,
  webp: webpEncoder,
  avif: avifEncoder,
  gif: gifEncoder,
  bmp: bmpEncoder,
  tiff: tiffEncoder,
  ico: icoEncoder,
}

export const getDecoder = (format: InputFormat): Decoder | undefined =>
  decoders.find((d) => d.formats.includes(format))

export const getEncoder = (format: OutputFormat): Encoder => ENCODERS[format]
