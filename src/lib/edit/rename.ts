/**
 * Batch rename patterns. Tokens:
 *   {name}  original file name without extension
 *   {n}     running number (zero-padded to the batch size), starting at `start`
 *   {date}  today, YYYY-MM-DD
 *   {w} {h} output width / height
 * Characters that are invalid in file names are replaced with "-".
 */
export interface RenameOptions {
  enabled: boolean
  pattern: string
  start: number
}

export interface RenameContext {
  originalName: string
  extension: string
  index: number
  total: number
  width?: number
  height?: number
  date?: Date
}

const stripExtension = (name: string) => name.replace(/\.[^./\\]+$/, "") || name

export function renderName(o: RenameOptions, c: RenameContext): string {
  const base = stripExtension(c.originalName)
  if (!o.enabled || !o.pattern.trim()) return `${base}.${c.extension}`
  const last = o.start + c.total - 1
  const n = String(o.start + c.index).padStart(String(last).length, "0")
  const d = c.date ?? new Date()
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const name = o.pattern
    .replaceAll("{name}", base)
    .replaceAll("{n}", n)
    .replaceAll("{date}", date)
    .replaceAll("{w}", c.width ? String(c.width) : "")
    .replaceAll("{h}", c.height ? String(c.height) : "")
    // eslint-disable-next-line no-control-regex -- control characters are invalid in file names
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .trim()
  return `${name || base}.${c.extension}`
}
