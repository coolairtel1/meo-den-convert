import jsQR from "jsqr"

export type ScanResult = "ok" | "mismatch" | "unreadable"

/**
 * Decodes a rendered QR the way a phone would (on white, both polarities)
 * and checks it reproduces exactly the expected payload bytes.
 */
export async function verifyScan(png: Blob, expected: string): Promise<ScanResult> {
  const bitmap = await createImageBitmap(png)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  ctx.fillStyle = "#fff" // transparent backgrounds are usually printed/shown on white
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const result = jsQR(data, width, height, { inversionAttempts: "attemptBoth" })
  if (!result) return "unreadable"
  const want = new TextEncoder().encode(expected)
  const got = Uint8Array.from(result.binaryData)
  return got.length === want.length && got.every((b, i) => b === want[i]) ? "ok" : "mismatch"
}
