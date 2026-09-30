import * as Comlink from "comlink"
import { create } from "zustand"
import type { BgRemoveWorkerApi, RawImage } from "@/workers/bgremove.worker"
import type { BgModelId } from "./models"

/** Live state of the on-device model, for progress UI and Tủm's comments. */
interface AiState {
  phase: "idle" | "download" | "init" | "run" | "ready" | "error"
  model: BgModelId | null
  loaded: number
  total: number
  /** Set when the quality model failed and the fast one took over. */
  fellBack: boolean
}

export const useAiStore = create<AiState>(() => ({ phase: "idle", model: null, loaded: 0, total: 0, fellBack: false }))

let remote: Comlink.Remote<BgRemoveWorkerApi> | null = null
/** One AI worker for the whole app: the model is big, so it's loaded once and inferences run one at a time. */
const worker = () =>
  (remote ??= Comlink.wrap<BgRemoveWorkerApi>(
    new Worker(new URL("../../workers/bgremove.worker.ts", import.meta.url), { type: "module", name: "bgremove" }),
  ))

let queue: Promise<unknown> = Promise.resolve()
const serial = <T>(job: () => Promise<T>): Promise<T> => {
  const next = queue.then(job, job)
  queue = next.catch(() => undefined)
  return next
}

const progress = (model: BgModelId) =>
  Comlink.proxy((phase: "download" | "init" | "run", loaded: number, total: number) =>
    useAiStore.setState({ phase, model, loaded, total }),
  )

/** Out-of-memory and similar engine failures are worth retrying with the small model. */
const isResourceError = (e: unknown) => /bad_alloc|memory|OrtRun|out of|allocation/i.test(String(e))

/**
 * Removes the background (decode happens in the AI worker, so HEIC/TIFF work too).
 * If the quality model can't run on this device, falls back to the fast one.
 */
export function removeBackground(file: Blob, model: BgModelId): Promise<RawImage & { model: BgModelId }> {
  return serial(async () => {
    try {
      const out = await worker().remove(file, model, progress(model))
      useAiStore.setState({ phase: "ready", model })
      return { ...out, model }
    } catch (e) {
      if (model === "quality" && isResourceError(e)) {
        useAiStore.setState({ fellBack: true })
        const out = await worker().remove(file, "fast", progress("fast"))
        useAiStore.setState({ phase: "ready", model: "fast" })
        return { ...out, model: "fast" as const }
      }
      useAiStore.setState({ phase: "error" })
      throw e
    }
  })
}

/** Downloads and initialises a model ahead of time (e.g. before going offline). */
export function prepareModel(model: BgModelId): Promise<void> {
  return serial(async () => {
    try {
      await worker().prepare(model, progress(model))
      useAiStore.setState({ phase: "ready", model })
    } catch (e) {
      useAiStore.setState({ phase: "error" })
      throw e
    }
  })
}
