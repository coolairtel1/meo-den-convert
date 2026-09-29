import type { InputFormat, OutputFormat } from "./types"

/** Main-thread view of codec support (kept free of codec imports so it stays tiny). */
const DECODABLE: InputFormat[] = ["jpeg", "png", "webp", "gif", "bmp", "avif", "ico", "heic", "tiff", "svg"]
export const isDecodable = (f: InputFormat) => DECODABLE.includes(f)

export const OUTPUT_FORMATS: OutputFormat[] = ["jpeg", "png", "webp", "avif", "gif", "bmp", "tiff", "ico"]
export const LOSSY: Record<OutputFormat, boolean> = {
  jpeg: true,
  png: false,
  webp: true,
  avif: true,
  gif: false,
  bmp: false,
  tiff: false,
  ico: false,
}
export const HAS_ALPHA: Record<OutputFormat, boolean> = {
  jpeg: false,
  png: true,
  webp: true,
  avif: true,
  gif: true,
  bmp: false,
  tiff: true,
  ico: true,
}
export const EXTENSION: Record<OutputFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
  gif: "gif",
  bmp: "bmp",
  tiff: "tiff",
  ico: "ico",
}

export const FORMAT_LABEL: Record<InputFormat, string> = {
  jpeg: "JPG",
  png: "PNG",
  webp: "WebP",
  gif: "GIF",
  bmp: "BMP",
  avif: "AVIF",
  heic: "HEIC",
  tiff: "TIFF",
  ico: "ICO",
  svg: "SVG",
  unknown: "?",
}
