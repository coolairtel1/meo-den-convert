export function formatBytes(bytes: number, locale?: string): string {
  const units = ["B", "KB", "MB", "GB"]
  let v = bytes
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  const digits = i === 0 || v >= 100 ? 0 : 1
  return `${v.toLocaleString(locale, { maximumFractionDigits: digits })} ${units[i]}`
}

/** "photo.HEIC" → "photo.jpg" */
export const replaceExtension = (name: string, ext: string) => `${name.replace(/\.[^./\\]+$/, "") || name}.${ext}`
