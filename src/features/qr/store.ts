import { create } from "zustand"
import { persist } from "zustand/middleware"
import { EMPTY_FIELDS, type QrFields, type QrKind } from "@/lib/qr/content"
import type { QrPreset } from "@/lib/qr/presets"
import type { ExportFormat } from "@/lib/qr/render"
import { DEFAULT_STYLE, type QrStyle } from "@/lib/qr/style"
import { safeStorage } from "@/lib/storage"

interface QrState {
  kind: QrKind
  /** Every kind keeps its own draft, so switching tabs never loses input. */
  fields: QrFields
  style: QrStyle
  userPresets: QrPreset[]
  exportFormat: ExportFormat
  exportSize: number
  setKind: (kind: QrKind) => void
  setField: <K extends QrKind>(kind: K, patch: Partial<QrFields[K]>) => void
  setStyle: (patch: Partial<QrStyle>) => void
  resetStyle: () => void
  savePreset: (name: string) => void
  deletePreset: (id: string) => void
  setExport: (patch: { exportFormat?: ExportFormat; exportSize?: number }) => void
}

// Style keys a preset captures (a logo is personal, so presets keep whatever logo is set).
const PRESET_KEYS = [
  "dotType",
  "dotColor",
  "gradient",
  "gradientColor",
  "gradientType",
  "gradientRotation",
  "cornerSquareType",
  "cornerSquareColor",
  "cornerDotType",
  "cornerDotColor",
  "bgColor",
  "bgTransparent",
  "shape",
] as const satisfies readonly (keyof QrStyle)[]

export const useQrStore = create<QrState>()(
  persist(
    (set) => ({
      kind: "url",
      fields: EMPTY_FIELDS,
      style: DEFAULT_STYLE,
      userPresets: [],
      exportFormat: "png",
      exportSize: 1024,

      setKind: (kind) => set({ kind }),
      setField: (kind, patch) => set((s) => ({ fields: { ...s.fields, [kind]: { ...s.fields[kind], ...patch } } })),
      setStyle: (patch) => set((s) => ({ style: { ...s.style, ...patch } })),
      resetStyle: () => set({ style: DEFAULT_STYLE }),
      savePreset: (name) =>
        set((s) => ({
          userPresets: [
            ...s.userPresets,
            {
              id: crypto.randomUUID(),
              name,
              style: Object.fromEntries(PRESET_KEYS.map((k) => [k, s.style[k]])) as Partial<QrStyle>,
            },
          ],
        })),
      deletePreset: (id) => set((s) => ({ userPresets: s.userPresets.filter((p) => p.id !== id) })),
      setExport: (patch) => set(patch),
    }),
    {
      name: "meoden.qr",
      storage: safeStorage,
      version: 1,
      // Fill in fields added in later versions.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<QrState>
        return {
          ...current,
          ...p,
          fields: Object.fromEntries(
            Object.entries(EMPTY_FIELDS).map(([k, v]) => [k, { ...v, ...(p.fields?.[k as QrKind] ?? {}) }]),
          ) as unknown as QrFields,
          style: { ...DEFAULT_STYLE, ...p.style },
        }
      },
    },
  ),
)
