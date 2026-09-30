import { rasterizeSvg } from "@/lib/codecs/svg"
import { convertInPool } from "@/lib/engine/pool"
import { buildPdf, type PdfPage } from "@/lib/pdf"
import type { ConvertItem, PdfQuality, PdfSettings } from "./store"

/** Page image quality presets (A4 at ~300 dpi is 2480 × 3508 px). */
const QUALITY: Record<PdfQuality, { quality: number; maxSide: number | null }> = {
  high: { quality: 92, maxSide: null },
  medium: { quality: 80, maxSide: 2480 },
  small: { quality: 65, maxSide: 1600 },
}

/** Items that can become pages (readable and in a supported format). */
export const pdfEligible = (it: ConvertItem) =>
  it.error?.code !== "unsupported" && it.error?.code !== "decode" && it.inputFormat !== undefined

/**
 * Renders every eligible item (in list order) to a white-background JPEG on the worker pool,
 * which also applies EXIF rotation, then lays the pages out with pdf-lib.
 */
export async function makePdf(
  items: ConvertItem[],
  settings: PdfSettings,
  title: string,
  onProgress?: (fraction: number) => void,
): Promise<{ blob: Blob; pages: number; failed: string[] }> {
  const q = QUALITY[settings.quality]
  const progress = new Map<string, number>()
  const report = (id: string) => (p: number) => {
    progress.set(id, p)
    // Rendering pages is ~90% of the work; assembling the PDF is the rest.
    onProgress?.((0.9 * [...progress.values()].reduce((a, b) => a + b, 0)) / items.length)
  }

  const rendered = await Promise.all(
    items.map(async (it): Promise<PdfPage | null> => {
      try {
        const source = it.inputFormat === "svg" ? await rasterizeSvg(it.file) : it.file
        const res = await convertInPool(
          source,
          {
            format: "jpeg",
            quality: q.quality,
            background: "#ffffff",
            resize: q.maxSide ? { mode: "max", max: q.maxSide, percent: 100 } : { mode: "none", max: 0, percent: 100 },
            target: { enabled: false, kb: 0 },
          },
          report(it.id),
        )
        return { jpeg: await res.blob.arrayBuffer(), width: res.width, height: res.height }
      } catch {
        return null
      }
    }),
  )

  const pages = rendered.filter((p): p is PdfPage => p !== null)
  const failed = items.filter((_, i) => rendered[i] === null).map((it) => it.file.name)
  if (!pages.length) throw new Error("no pages")
  const blob = await buildPdf(pages, settings, title)
  onProgress?.(1)
  return { blob, pages: pages.length, failed }
}
