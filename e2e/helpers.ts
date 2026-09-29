import path from "node:path"
import type { Download, Page } from "@playwright/test"

export const fixture = (name: string) => path.join(import.meta.dirname, "fixtures", name)

/** The converter's hidden <input type=file>. */
export const addFiles = (page: Page, ...names: string[]) =>
  page.locator('input[type="file"]').first().setInputFiles(names.map(fixture))

export async function downloadBytes(download: Download): Promise<Buffer> {
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(c as Buffer)
  return Buffer.concat(chunks)
}
