import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ResizeOptions } from "@/lib/codecs/resize"
import { EXTENSION, HAS_ALPHA, isDecodable, LOSSY } from "@/lib/codecs/support"
import { rasterizeSvg } from "@/lib/codecs/svg"
import { ConvertError, parseConvertError, type ConvertErrorCode, type InputFormat, type OutputFormat } from "@/lib/codecs/types"
import { detectFormat, SNIFF_BYTES } from "@/lib/engine/detect"
import { targetApplies, type TargetSizeOptions } from "@/lib/engine/target"
import type { WatermarkJob } from "@/lib/edit/composite"
import { removeBackground } from "@/lib/ai/client"
import type { BgModelId } from "@/lib/ai/models"
import type { RawInput } from "@/lib/engine/pipeline"
import { convertInPool } from "@/lib/engine/pool"
import { replaceExtension } from "@/lib/format"
import { renderName, type RenameOptions } from "@/lib/edit/rename"
import { editsKey, type Edits } from "@/lib/edit/transform"
import type { Orientation, PageSize } from "@/lib/pdf"
import { safeStorage } from "@/lib/storage"
import { useCatStore } from "@/features/mascot/catStore"
import { buildWatermarkJob, DEFAULT_WATERMARK, watermarkKey, type WatermarkSettings } from "./watermarkMark"

export type ItemStatus = "queued" | "processing" | "done" | "error"

export interface ConvertItem {
  id: string
  file: File
  previewUrl: string
  inputFormat?: InputFormat
  /** Crop / rotate / flip for this image only. */
  edits?: Edits
  status: ItemStatus
  progress: number
  result?: {
    blob: Blob
    url: string
    name: string
    width: number
    height: number
    settingsKey: string
    fit?: { targetBytes: number; reached: boolean; quality: number | null }
  }
  error?: { code: ConvertErrorCode; detail: string }
}

export type PdfQuality = "high" | "medium" | "small"

export interface PdfSettings {
  pageSize: PageSize
  orientation: Orientation
  marginMm: number
  quality: PdfQuality
}

export interface ConvertSettings {
  format: OutputFormat
  quality: number
  background: string
  resize: ResizeOptions
  target: TargetSizeOptions
  /** Not part of settingsKey: PDF export re-renders from the originals. */
  pdf: PdfSettings
  watermark: WatermarkSettings
  /** On-device AI background removal, applied before crop/resize/watermark. */
  removeBg: { enabled: boolean; model: BgModelId }
  /** Not part of settingsKey: names are computed when showing/saving results. */
  rename: RenameOptions
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
  setTarget: (patch: Partial<TargetSizeOptions>) => void
  setPdf: (patch: Partial<PdfSettings>) => void
  setWatermark: (patch: Partial<WatermarkSettings>) => void
  setRename: (patch: Partial<RenameOptions>) => void
  setRemoveBg: (patch: Partial<ConvertSettings["removeBg"]>) => void
  setEdits: (id: string, edits: Edits | undefined) => void
  /** Copies rotation/flip (not crop) to every image. */
  applyOrientationToAll: (edits: Pick<Edits, "rotate" | "flipX" | "flipY">) => void
  /** Moves an item to `toIndex` (page order for PDF export). */
  moveItem: (id: string, toIndex: number) => void
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
    targetApplies(s) ? s.target.kb : "",
    watermarkKey(s.watermark),
    s.removeBg.enabled ? `bg:${s.removeBg.model}` : "",
  ].join("|")

/** The key a single item's result must carry: shared settings + that image's own edits. */
export const itemKey = (base: string, item: ConvertItem) => `${base}|${editsKey(item.edits)}`

/** Output file names in list order, following the rename pattern (numbered over finished items). */
export function outputNames(items: ConvertItem[], rename: RenameOptions): Map<string, string> {
  const done = items.filter((it) => it.result)
  return new Map(
    done.map((it, index) => [
      it.id,
      renderName(rename, {
        originalName: it.file.name,
        extension: it.result!.name.split(".").pop() ?? "",
        index,
        total: done.length,
        width: it.result!.width,
        height: it.result!.height,
      }),
    ]),
  )
}

/**
 * Items that a "Convert" click would (re)process. Unsupported and unreadable files are skipped:
 * retrying them with other settings can't help (the per-file Retry button still can).
 */
export const needsConversion = (item: ConvertItem, key: string) =>
  item.error?.code !== "unsupported" &&
  item.error?.code !== "decode" &&
  item.status !== "processing" &&
  (item.status !== "done" || item.result?.settingsKey !== itemKey(key, item))

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

      const run = async (
        item: ConvertItem,
        settings: ConvertSettings,
        watermark: WatermarkJob | null,
        onProgress: (p: number) => void,
      ) => {
        const key = itemKey(settingsKey(settings), item)
        if (item.result) URL.revokeObjectURL(item.result.url)
        patch(item.id, { status: "processing", progress: 0, error: undefined, result: undefined })
        try {
          // SVG needs the DOM to render, so it's rasterized here and the worker gets a PNG.
          let source: Blob | RawInput = item.file
          if (item.inputFormat === "svg") {
            try {
              source = await rasterizeSvg(item.file)
            } catch (e) {
              throw new ConvertError("decode", e instanceof Error ? e.message : String(e))
            }
          }
          // Background removal runs first in the AI worker; its RGBA output is handed on without a copy.
          const bg = settings.removeBg.enabled
          if (bg) {
            patch(item.id, { progress: 0.05 })
            onProgress(0.05)
            try {
              source = await removeBackground(source, settings.removeBg.model)
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e)
              throw /^(unsupported|decode):/.test(msg) ? e : new ConvertError("ai", msg)
            }
          }
          const res = await convertInPool(source, { ...settings, edits: item.edits ?? null, watermark }, (p) => {
            const progress = bg ? 0.5 + p / 2 : p
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
              fit: res.fit,
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
        // The watermark is rendered once per batch on the main thread (fonts live here).
        const watermark = await buildWatermarkJob(settings.watermark).catch(() => null)
        const outcomes = await Promise.all(batch.map((it) => run(it, settings, watermark, report(it.id))))
        set({ busy: get().items.some((it) => it.status === "processing") })
        setMood(outcomes.every(Boolean) ? "success" : "error")
      }

      return {
        items: [],
        settings: {
          format: "jpeg",
          quality: 85,
          background: "#ffffff",
          resize: { mode: "none", max: 1920, percent: 50 },
          target: { enabled: false, kb: 500 },
          pdf: { pageSize: "a4", orientation: "auto", marginMm: 10, quality: "medium" },
          watermark: DEFAULT_WATERMARK,
          rename: { enabled: false, pattern: "{name}_{n}", start: 1 },
          removeBg: { enabled: false, model: "quality" },
        },
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
        setTarget: (p) => set((s) => ({ settings: { ...s.settings, target: { ...s.settings.target, ...p } } })),
        setPdf: (p) => set((s) => ({ settings: { ...s.settings, pdf: { ...s.settings.pdf, ...p } } })),
        setWatermark: (p) => set((s) => ({ settings: { ...s.settings, watermark: { ...s.settings.watermark, ...p } } })),
        setRename: (p) => set((s) => ({ settings: { ...s.settings, rename: { ...s.settings.rename, ...p } } })),
        setRemoveBg: (p) => set((s) => ({ settings: { ...s.settings, removeBg: { ...s.settings.removeBg, ...p } } })),
        setEdits: (id, edits) => patch(id, { edits }),
        applyOrientationToAll: ({ rotate, flipX, flipY }) =>
          set((s) => ({
            items: s.items.map((it) => ({ ...it, edits: { crop: null, ...it.edits, rotate, flipX, flipY } })),
          })),

        moveItem: (id, toIndex) =>
          set((s) => {
            const from = s.items.findIndex((it) => it.id === id)
            const to = Math.max(0, Math.min(s.items.length - 1, toIndex))
            if (from < 0 || from === to) return s
            const items = [...s.items]
            items.splice(to, 0, ...items.splice(from, 1))
            return { items }
          }),

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
          settings: {
            ...current.settings,
            ...saved,
            resize: { ...current.settings.resize, ...saved.resize },
            target: { ...current.settings.target, ...saved.target },
            pdf: { ...current.settings.pdf, ...saved.pdf },
            watermark: { ...current.settings.watermark, ...saved.watermark },
            rename: { ...current.settings.rename, ...saved.rename },
            removeBg: { ...current.settings.removeBg, ...saved.removeBg },
          },
        }
      },
    },
  ),
)
