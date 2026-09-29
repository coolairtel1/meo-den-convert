import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ResizeOptions } from "@/lib/codecs/resize"
import { EXTENSION, HAS_ALPHA, isDecodable, LOSSY } from "@/lib/codecs/support"
import { rasterizeSvg } from "@/lib/codecs/svg"
import { ConvertError, parseConvertError, type ConvertErrorCode, type InputFormat, type OutputFormat } from "@/lib/codecs/types"
import { detectFormat, SNIFF_BYTES } from "@/lib/engine/detect"
import { convertInPool } from "@/lib/engine/pool"
import { replaceExtension } from "@/lib/format"
import { safeStorage } from "@/lib/storage"
import { useCatStore } from "@/features/mascot/catStore"

export type ItemStatus = "queued" | "processing" | "done" | "error"

export interface ConvertItem {
  id: string
  file: File
  previewUrl: string
  inputFormat?: InputFormat
  status: ItemStatus
  progress: number
  result?: { blob: Blob; url: string; name: string; width: number; height: number; settingsKey: string }
  error?: { code: ConvertErrorCode; detail: string }
}

export interface ConvertSettings {
  format: OutputFormat
  quality: number
  background: string
  resize: ResizeOptions
}

interface ConverterState {
  items: ConvertItem[]
  settings: ConvertSettings
  busy: boolean
  addFiles: (files: File[]) => void
  removeItem: (id: string) => void
  clear: () => void
  setSettings: (patch: Partial<ConvertSettings>) => void
  setResize: (patch: Partial<ResizeOptions>) => void
  convertAll: () => Promise<void>
  convertOne: (id: string) => Promise<void>
}

/** Identifies the output a result was produced with, so stale results get re-converted. */
export const settingsKey = (s: ConvertSettings) =>
  [
    s.format,
    LOSSY[s.format] ? s.quality : "",
    HAS_ALPHA[s.format] ? "" : s.background,
    s.resize.mode,
    s.resize.mode === "max" ? s.resize.max : s.resize.mode === "percent" ? s.resize.percent : "",
  ].join("|")

/**
 * Items that a "Convert" click would (re)process. Unsupported and unreadable files are skipped:
 * retrying them with other settings can't help (the per-file Retry button still can).
 */
export const needsConversion = (item: ConvertItem, key: string) =>
  item.error?.code !== "unsupported" &&
  item.error?.code !== "decode" &&
  item.status !== "processing" &&
  (item.status !== "done" || item.result?.settingsKey !== key)

const revoke = (item: ConvertItem) => {
  URL.revokeObjectURL(item.previewUrl)
  if (item.result) URL.revokeObjectURL(item.result.url)
}

export const useConverterStore = create<ConverterState>()(
  persist(
    (set, get) => {
      const patch = (id: string, p: Partial<ConvertItem> | ((it: ConvertItem) => Partial<ConvertItem>)) =>
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, ...(typeof p === "function" ? p(it) : p) } : it)),
        }))

      const run = async (item: ConvertItem, settings: ConvertSettings, onProgress: (p: number) => void) => {
        const key = settingsKey(settings)
        if (item.result) URL.revokeObjectURL(item.result.url)
        patch(item.id, { status: "processing", progress: 0, error: undefined, result: undefined })
        try {
          // SVG needs the DOM to render, so it's rasterized here and the worker gets a PNG.
          let source: Blob = item.file
          if (item.inputFormat === "svg") {
            try {
              source = await rasterizeSvg(item.file)
            } catch (e) {
              throw new ConvertError("decode", e instanceof Error ? e.message : String(e))
            }
          }
          const res = await convertInPool(source, settings, (progress) => {
            patch(item.id, { progress })
            onProgress(progress)
          })
          // The item may have been removed while converting.
          if (!get().items.some((it) => it.id === item.id)) return true
          patch(item.id, {
            status: "done",
            progress: 1,
            inputFormat: item.inputFormat === "svg" ? "svg" : res.inputFormat,
            result: {
              blob: res.blob,
              url: URL.createObjectURL(res.blob),
              name: replaceExtension(item.file.name, EXTENSION[settings.format]),
              width: res.width,
              height: res.height,
              settingsKey: key,
            },
          })
          return true
        } catch (err) {
          patch(item.id, { status: "error", error: parseConvertError(err) })
          onProgress(1)
          return false
        }
      }

      const runBatch = async (batch: ConvertItem[]) => {
        if (!batch.length) return
        const { setMood, setProgress } = useCatStore.getState()
        set({ busy: true })
        setProgress(0)
        setMood("working")
        const settings = get().settings
        // Batch progress (average over items) drives how fast the cat plays.
        const progress = new Map<string, number>()
        const report = (id: string) => (p: number) => {
          progress.set(id, p)
          setProgress([...progress.values()].reduce((a, b) => a + b, 0) / batch.length)
        }
        const outcomes = await Promise.all(batch.map((it) => run(it, settings, report(it.id))))
        set({ busy: get().items.some((it) => it.status === "processing") })
        setMood(outcomes.every(Boolean) ? "success" : "error")
      }

      return {
        items: [],
        settings: { format: "jpeg", quality: 85, background: "#ffffff", resize: { mode: "none", max: 1920, percent: 50 } },
        busy: false,

        addFiles: (files) => {
          const added: ConvertItem[] = files.map((file) => ({
            id: crypto.randomUUID(),
            file,
            previewUrl: URL.createObjectURL(file),
            status: "queued",
            progress: 0,
          }))
          set((s) => ({ items: [...s.items, ...added] }))

          // Sniff real formats up front so unsupported files are flagged before converting.
          added.forEach(async (it) => {
            const head = new Uint8Array(await it.file.slice(0, SNIFF_BYTES).arrayBuffer())
            const inputFormat = detectFormat(head)
            patch(it.id, (cur) =>
              isDecodable(inputFormat) || cur.status !== "queued"
                ? { inputFormat }
                : { inputFormat, status: "error", error: { code: "unsupported", detail: inputFormat } },
            )
          })
        },

        removeItem: (id) =>
          set((s) => {
            const item = s.items.find((it) => it.id === id)
            if (item) revoke(item)
            return { items: s.items.filter((it) => it.id !== id) }
          }),

        clear: () =>
          set((s) => {
            s.items.forEach(revoke)
            return { items: [] }
          }),

        setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
        setResize: (p) => set((s) => ({ settings: { ...s.settings, resize: { ...s.settings.resize, ...p } } })),

        convertAll: () => {
          const key = settingsKey(get().settings)
          return runBatch(get().items.filter((it) => needsConversion(it, key)))
        },

        convertOne: (id) => {
          const item = get().items.find((it) => it.id === id)
          return runBatch(item ? [item] : [])
        },
      }
    },
    {
      name: "meoden.convert-settings",
      storage: safeStorage,
      partialize: (s) => ({ settings: s.settings }),
      // Older saves predate `resize`; fill in defaults for any missing keys.
      merge: (persisted, current) => {
        const saved = (persisted as { settings?: Partial<ConvertSettings> } | undefined)?.settings ?? {}
        return {
          ...current,
          settings: { ...current.settings, ...saved, resize: { ...current.settings.resize, ...saved.resize } },
        }
      },
    },
  ),
)
