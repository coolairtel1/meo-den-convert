import QRCodeStyling, { type FileExtension } from "qr-code-styling"
import { toQrOptions, type QrStyle } from "./style"

export type ExportFormat = "png" | "jpeg" | "webp" | "svg"

/** Renders the code off-screen and returns the file. JPEG has no alpha, so it gets the solid background. */
export async function renderQrBlob(style: QrStyle, data: string, size: number, format: ExportFormat): Promise<Blob> {
  const qr = new QRCodeStyling({
    ...toQrOptions(style, data, size, format === "jpeg"),
    type: format === "svg" ? "svg" : "canvas",
  })
  const raw = await qr.getRawData(format as FileExtension)
  if (!(raw instanceof Blob)) throw new Error("QR render failed")
  return raw
}

export const isOverflowError = (e: unknown) => String(e).includes("code length overflow")
