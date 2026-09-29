import { getDecoder, getEncoder } from "@/lib/codecs/registry"
import { resizeImage, targetSize, type ResizeOptions } from "@/lib/codecs/resize"
import { ConvertError, type EncodeOptions, type InputFormat, type OutputFormat } from "@/lib/codecs/types"
import { detectFormat, SNIFF_BYTES } from "./detect"

export interface ConvertOptions extends EncodeOptions {
  format: OutputFormat
  resize: ResizeOptions
}

export interface ConvertResult {
  blob: Blob
  width: number
  height: number
  inputFormat: InputFormat
}

export type ProgressFn = (fraction: number) => void

/** decode → (resize) → encode. Runs inside a worker. */
export async function convertImage(file: Blob, options: ConvertOptions, onProgress?: ProgressFn): Promise<ConvertResult> {
  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer())
  const inputFormat = detectFormat(head)
  const decoder = getDecoder(inputFormat)
  if (!decoder) throw new ConvertError("unsupported", inputFormat)
  onProgress?.(0.1)

  let image: ImageData
  try {
    image = await decoder.decode(file)
  } catch (e) {
    throw new ConvertError("decode", e instanceof Error ? e.message : String(e))
  }
  onProgress?.(0.45)

  const size = targetSize(image.width, image.height, options.resize)
  if (size) {
    try {
      image = await resizeImage(image, size.width, size.height)
    } catch (e) {
      throw new ConvertError("encode", `resize: ${e instanceof Error ? e.message : String(e)}`)
    }
    onProgress?.(0.55)
  }

  const encoder = getEncoder(options.format)
  const { width, height } = image
  let bytes: ArrayBuffer
  try {
    bytes = await encoder.encode(image, options)
  } catch (e) {
    throw new ConvertError("encode", e instanceof Error ? e.message : String(e))
  }
  onProgress?.(1)

  return { blob: new Blob([bytes], { type: encoder.mime }), width, height, inputFormat }
}
