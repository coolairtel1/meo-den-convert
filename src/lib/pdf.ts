/** Images → PDF. Layout math is pure (tested); pdf-lib is loaded only when a PDF is actually built. */

export type PageSize = "a4" | "letter" | "fit"
export type Orientation = "auto" | "portrait" | "landscape"

export interface PdfLayoutOptions {
  pageSize: PageSize
  orientation: Orientation
  marginMm: number
}

export interface PageLayout {
  pageWidth: number
  pageHeight: number
  /** Image box inside the page, in PDF points (origin bottom-left). */
  x: number
  y: number
  width: number
  height: number
}

/** Paper sizes in PDF points (1/72 inch), portrait. */
const PAPER: Record<Exclude<PageSize, "fit">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
}
const PT_PER_MM = 72 / 25.4
/** "Fit to image" pages get A4's long side, so they print at a sensible physical size. */
const FIT_LONG_SIDE = 841.89

export function layoutPage(imageWidth: number, imageHeight: number, o: PdfLayoutOptions): PageLayout {
  const margin = Math.max(0, o.marginMm) * PT_PER_MM
  let pageWidth: number
  let pageHeight: number

  if (o.pageSize === "fit") {
    const s = FIT_LONG_SIDE / Math.max(imageWidth, imageHeight)
    pageWidth = imageWidth * s + 2 * margin
    pageHeight = imageHeight * s + 2 * margin
  } else {
    const [short, long] = PAPER[o.pageSize]
    const landscape = o.orientation === "landscape" || (o.orientation === "auto" && imageWidth > imageHeight)
    ;[pageWidth, pageHeight] = landscape ? [long, short] : [short, long]
  }

  // Contain the image inside the margins, centred.
  const scale = Math.min((pageWidth - 2 * margin) / imageWidth, (pageHeight - 2 * margin) / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return { pageWidth, pageHeight, width, height, x: (pageWidth - width) / 2, y: (pageHeight - height) / 2 }
}

export interface PdfPage {
  jpeg: ArrayBuffer
  width: number
  height: number
}

export async function buildPdf(pages: PdfPage[], o: PdfLayoutOptions, title: string): Promise<Blob> {
  const { PDFDocument } = await import("pdf-lib")
  const doc = await PDFDocument.create()
  doc.setTitle(title)
  doc.setCreator("Mèo Đen Convert")
  doc.setProducer("Mèo Đen Convert (pdf-lib)")
  for (const p of pages) {
    const img = await doc.embedJpg(p.jpeg)
    const l = layoutPage(p.width, p.height, o)
    doc.addPage([l.pageWidth, l.pageHeight]).drawImage(img, { x: l.x, y: l.y, width: l.width, height: l.height })
  }
  const bytes = await doc.save()
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" })
}
