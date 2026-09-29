import * as Comlink from "comlink"
import type { ConvertWorkerApi } from "@/workers/convert.worker"
import type { ConvertOptions, ConvertResult, ProgressFn } from "./pipeline"

type Remote = Comlink.Remote<ConvertWorkerApi>

const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

/** Few workers on phones (tight memory), up to 4 elsewhere. */
export const POOL_SIZE = Math.max(1, Math.min(isMobile() ? 2 : 4, (navigator.hardwareConcurrency || 2) - 1))

const spawn = (): Remote =>
  Comlink.wrap<ConvertWorkerApi>(
    new Worker(new URL("../../workers/convert.worker.ts", import.meta.url), { type: "module", name: "convert" }),
  )

const idle: Remote[] = []
const waiting: ((w: Remote) => void)[] = []
let spawned = 0

async function acquire(): Promise<Remote> {
  const w = idle.pop()
  if (w) return w
  if (spawned < POOL_SIZE) {
    spawned++
    return spawn()
  }
  return new Promise((resolve) => waiting.push(resolve))
}

function release(w: Remote) {
  const next = waiting.shift()
  if (next) next(w)
  else idle.push(w)
}

/** Queues a conversion on the shared worker pool (workers are created lazily and reused). */
export async function convertInPool(file: Blob, options: ConvertOptions, onProgress?: ProgressFn): Promise<ConvertResult> {
  const w = await acquire()
  try {
    return await w.convertImage(file, options, onProgress ? Comlink.proxy(onProgress) : undefined)
  } finally {
    release(w)
  }
}
