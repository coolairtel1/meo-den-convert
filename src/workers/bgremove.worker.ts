import * as Comlink from "comlink"
import * as ort from "onnxruntime-web/wasm"
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url"
import { applyMask, normalizeMask, toCHW } from "@/lib/ai/mask"
import { BG_MODELS, type BgModelId } from "@/lib/ai/models"
import { getDecoder } from "@/lib/codecs/registry"
import { ConvertError, type InputFormat } from "@/lib/codecs/types"
import { detectFormat, SNIFF_BYTES } from "@/lib/engine/detect"

ort.env.wasm.wasmPaths = { wasm: wasmUrl }
// Multi-threaded WASM needs a cross-origin-isolated page (COOP/COEP headers); otherwise run on one thread.
ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1

const MODEL_CACHE = "meoden-ai-models"

export type AiPhase = "download" | "init" | "run"
export type AiProgress = (phase: AiPhase, loaded: number, total: number) => void

const sessions = new Map<BgModelId, Promise<ort.InferenceSession>>()

/** Downloads (once, then from Cache Storage) with byte-level progress. */
async function fetchModel(id: BgModelId, onProgress?: AiProgress): Promise<Uint8Array> {
  const spec = BG_MODELS[id]
  let cache: Cache | null = null
  try {
    cache = await caches.open(MODEL_CACHE)
    const hit = await cache.match(spec.url)
    if (hit) return new Uint8Array(await hit.arrayBuffer())
  } catch {
    cache = null // Cache Storage unavailable (e.g. private mode): just download
  }
  const res = await fetch(spec.url, { mode: "cors" })
  if (!res.ok || !res.body) throw new Error(`model download failed: HTTP ${res.status}`)
  const total = Number(res.headers.get("content-length")) || spec.bytes
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let loaded = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.length
    onProgress?.("download", loaded, total)
  }
  const bytes = new Uint8Array(loaded)
  let off = 0
  for (const c of chunks) {
    bytes.set(c, off)
    off += c.length
  }
  try {
    await cache?.put(spec.url, new Response(bytes, { headers: { "content-type": "application/octet-stream" } }))
  } catch {
    // quota exceeded: fine, we'll download again next time
  }
  return bytes
}

function session(id: BgModelId, onProgress?: AiProgress): Promise<ort.InferenceSession> {
  let s = sessions.get(id)
  if (!s) {
    s = (async () => {
      const bytes = await fetchModel(id, onProgress)
      onProgress?.("init", 0, 1)
      return ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" })
    })()
    s.catch(() => sessions.delete(id)) // let a later call retry
    sessions.set(id, s)
  }
  return s
}

async function decode(file: Blob): Promise<{ image: ImageData; inputFormat: InputFormat }> {
  const inputFormat = detectFormat(new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer()))
  const decoder = getDecoder(inputFormat)
  if (!decoder) throw new ConvertError("unsupported", inputFormat)
  try {
    return { image: await decoder.decode(file), inputFormat }
  } catch (e) {
    throw new ConvertError("decode", e instanceof Error ? e.message : String(e))
  }
}

export interface RawImage {
  width: number
  height: number
  data: ArrayBuffer
  inputFormat: InputFormat
}

const api = {
  /** Warms up a model (download + init) so the first image doesn't pay for it silently. */
  async prepare(id: BgModelId, onProgress?: AiProgress) {
    await session(id, onProgress)
  },

  /** Decodes, predicts the foreground mask and returns RGBA with a transparent background. */
  async remove(file: Blob, id: BgModelId, onProgress?: AiProgress): Promise<RawImage> {
    const { image, inputFormat } = await decode(file)
    const spec = BG_MODELS[id]
    const sess = await session(id, onProgress)
    onProgress?.("run", 0, 1)

    const S = spec.inputSize
    const small = new OffscreenCanvas(S, S)
    const ctx = small.getContext("2d", { willReadFrequently: true })!
    const bitmap = await createImageBitmap(image)
    ctx.drawImage(bitmap, 0, 0, S, S) // models take a square, unpadded input
    bitmap.close()
    const input = new ort.Tensor("float32", toCHW(ctx.getImageData(0, 0, S, S).data, S, spec.mean, spec.std), [1, 3, S, S])
    const out = await sess.run({ [sess.inputNames[0]]: input })
    const mask = normalizeMask(out[sess.outputNames[0]].data as Float32Array, S * S, spec.post)
    input.dispose()
    Object.values(out).forEach((t) => t.dispose())

    applyMask(image.data, image.width, image.height, mask, S)
    onProgress?.("run", 1, 1)
    const data = image.data.buffer as ArrayBuffer
    return Comlink.transfer({ width: image.width, height: image.height, data, inputFormat }, [data])
  },
}

export type BgRemoveWorkerApi = typeof api

Comlink.expose(api)
