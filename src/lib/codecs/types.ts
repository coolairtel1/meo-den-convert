/** Formats we can recognise from file bytes (not all are decodable yet). */
export type InputFormat =
  | "jpeg"
  | "png"
  | "webp"
  | "gif"
  | "bmp"
  | "avif"
  | "heic"
  | "tiff"
  | "ico"
  | "svg"
  | "unknown"

export type OutputFormat = "jpeg" | "png" | "webp" | "avif" | "gif" | "bmp" | "tiff" | "ico"

export interface EncodeOptions {
  /** 1–100; ignored by lossless formats. */
  quality: number
  /** CSS hex colour used to fill transparency for formats without alpha. */
  background: string
}

export interface Decoder {
  formats: InputFormat[]
  decode(file: Blob): Promise<ImageData>
}

export interface Encoder {
  format: OutputFormat
  mime: string
  extension: string
  lossy: boolean
  supportsAlpha: boolean
  encode(image: ImageData, options: EncodeOptions): Promise<ArrayBuffer>
}

export type ConvertErrorCode = "unsupported" | "decode" | "encode"

/**
 * Comlink only preserves `message` across the worker boundary,
 * so the code is packed into it as "code:detail".
 */
export class ConvertError extends Error {
  constructor(code: ConvertErrorCode, detail = "") {
    super(`${code}:${detail}`)
    this.name = "ConvertError"
  }
}

export const parseConvertError = (err: unknown): { code: ConvertErrorCode; detail: string } => {
  const msg = err instanceof Error ? err.message : String(err)
  const m = /^(unsupported|decode|encode):(.*)$/s.exec(msg)
  return m ? { code: m[1] as ConvertErrorCode, detail: m[2] } : { code: "decode", detail: msg }
}
