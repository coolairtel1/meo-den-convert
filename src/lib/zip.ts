/** "photo.jpg" twice → "photo.jpg", "photo (2).jpg" */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((name) => {
    const key = name.toLowerCase()
    const n = (seen.get(key) ?? 0) + 1
    seen.set(key, n)
    if (n === 1) return name
    const dot = name.lastIndexOf(".")
    const candidate = dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`
    seen.set(candidate.toLowerCase(), 1)
    return candidate
  })
}

/** Bundles files into a .zip. Images are already compressed, so entries are stored, not deflated. */
export async function zipFiles(files: { name: string; blob: Blob }[]): Promise<Blob> {
  const { zipSync } = await import("fflate")
  const names = uniqueNames(files.map((f) => f.name))
  const entries: Record<string, [Uint8Array, { level: 0 }]> = {}
  for (let i = 0; i < files.length; i++) entries[names[i]] = [new Uint8Array(await files[i].blob.arrayBuffer()), { level: 0 }]
  return new Blob([zipSync(entries)], { type: "application/zip" })
}
