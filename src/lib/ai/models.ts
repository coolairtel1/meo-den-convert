/**
 * Background-removal models (ONNX, run on-device with onnxruntime-web / WASM).
 * Chosen from a spike on portrait/cat/tiger/interior samples; see the feature notes.
 */
export type BgModelId = "quality" | "fast"

export type PostProcess = "minmax" | "none"

export interface BgModel {
  id: BgModelId
  url: string
  /** Approximate download size in bytes (for progress when the server omits Content-Length). */
  bytes: number
  inputSize: number
  mean: [number, number, number]
  std: [number, number, number]
  post: PostProcess
  name: string
  license: string
  licenseUrl: string
}

export const BG_MODELS: Record<BgModelId, BgModel> = {
  // BRIA RMBG-1.4 (quantized): best quality in the spike. Source-available, non-commercial only —
  // loaded straight from Hugging Face so this app doesn't redistribute it.
  quality: {
    id: "quality",
    url: "https://huggingface.co/briaai/RMBG-1.4/resolve/main/onnx/model_quantized.onnx",
    bytes: 44_403_226,
    inputSize: 1024,
    mean: [0.5, 0.5, 0.5],
    std: [1, 1, 1],
    post: "minmax",
    name: "RMBG-1.4 (BRIA AI)",
    license: "BRIA RMBG-1.4 — non-commercial",
    licenseUrl: "https://huggingface.co/briaai/RMBG-1.4",
  },
  // U²-Netp: 4.4 MB, ~10× faster; shipped with the app (Apache-2.0). Also the fallback on low memory.
  fast: {
    id: "fast",
    url: `${import.meta.env.BASE_URL}models/u2netp.onnx`,
    bytes: 4_574_861,
    inputSize: 320,
    mean: [0.485, 0.456, 0.406],
    std: [0.229, 0.224, 0.225],
    post: "minmax",
    name: "U²-Netp",
    license: "Apache-2.0",
    licenseUrl: "https://github.com/xuebinqin/U-2-Net",
  },
}
