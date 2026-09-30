import { getDecoder, getEncoder } from "@/lib/codecs/registry"
import { resizeImage, targetSize, type ResizeOptions } from "@/lib/codecs/resize"
import { ConvertError, type EncodeOptions, type InputFormat, type OutputFormat } from "@/lib/codecs/types"
import { detectFormat, SNIFF_BYTES } from "./detect"
import { compositeWatermark, type WatermarkJob } from "@/lib/edit/composite"
import { applyEdits, type Edits } from "@/lib/edit/transform"
import { BITS_PER_PIXEL, fitToSize } from "./fitSize"
import { targetApplies, type TargetSizeOptions } from "./target"

export interface ConvertOptions extends EncodeOptions {
  format: OutputFormat
  resize: ResizeOptions
  target: TargetSizeOptions
  /** Per-image crop/rotate/flip. */
  edits?: Edits | null
  watermark?: WatermarkJob | null
}

export interface ConvertResult {
  blob: Blob
  width: number
  height: number
  inputFormat: InputFormat
  /** Present when a size budget was applied. */
  fit?: { targetBytes: number; reached: boolean; quality: number | null }
}


export type ProgressFn = (fraction: number) => void

/**
 * decode → edits (rotate/flip/crop) → resize → watermark → encode (or search for the best encode
 * under a size budget). Runs inside a worker.
 */
/** Already-decoded pixels (e.g. after background removal), transferred rather than copied. */
export interface RawInput {
  width: number
  height: number
  data: ArrayBuffer
  inputFormat: InputFormat
}

export async function convertImage(input: Blob | RawInput, options: ConvertOptions, onProgress?: ProgressFn): Promise<ConvertResult> {
  let image: ImageData
  let inputFormat: InputFormat
  if (input instanceof Blob) {
    const head = new Uint8Array(await input.slice(0, SNIFF_BYTES).arrayBuffer())
    inputFormat = detectFormat(head)
    const decoder = getDecoder(inputFormat)
    if (!decoder) throw new ConvertError("unsupported", inputFormat)
    onProgress?.(0.1)
    try {
      image = await decoder.decode(input)
    } catch (e) {
      throw new ConvertError("decode", e instanceof Error ? e.message : String(e))
    }
  } else {
    inputFormat = input.inputFormat
    image = new ImageData(new Uint8ClampedArray(input.data), input.width, input.height)
  }
  onProgress?.(0.45)

  const edited = applyEdits(image, options.edits)
  if (edited !== image) image = new ImageData(edited.data as Uint8ClampedArray<ArrayBuffer>, edited.width, edited.height)

  const size = targetSize(image.width, image.height, options.resize)
  if (size) {
    try {
      image = await resizeImage(image, size.width, size.height)
    } catch (e) {
      throw new ConvertError("encode", `resize: ${e instanceof Error ? e.message : String(e)}`)
    }
    onProgress?.(0.55)
  }

  if (options.watermark) {
    try {
      image = await compositeWatermark(image, options.watermark)
    } catch (e) {
      throw new ConvertError("encode", `watermark: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const encoder = getEncoder(options.format)
  let bytes: ArrayBuffer
  let fit: ConvertResult["fit"]
  try {
    if (targetApplies(options)) {
      const targetBytes = options.target.kb * 1000
      const res = await fitToSize({
        image,
        targetBytes,
        lossy: encoder.lossy,
        maxQuality: options.quality,
        bitsPerPixel: BITS_PER_PIXEL[options.format] ?? 8,
        encode: (img, quality) => encoder.encode(img, { ...options, quality }),
        resize: resizeImage,
        // Each search step nudges the bar forward (no finer signal from the encoders).
        onStep: (step) => onProgress?.(Math.min(0.95, 0.55 + step * 0.05)),
      })
      bytes = res.bytes
      image = res.image
      fit = { targetBytes, reached: res.reached, quality: res.quality }
    } else {
      bytes = await encoder.encode(image, options)
    }
  } catch (e) {
    throw new ConvertError("encode", e instanceof Error ? e.message : String(e))
  }
  onProgress?.(1)

  return { blob: new Blob([bytes], { type: encoder.mime }), width: image.width, height: image.height, inputFormat, fit }
}
