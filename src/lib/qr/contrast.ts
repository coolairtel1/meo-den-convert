import { parseHexColor } from "@/lib/codecs/pixels"

/** WCAG relative luminance of a hex colour. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHexColor(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export type ContrastIssue = "low" | "inverted" | null

/**
 * Scanners want dark modules on a light background with decent contrast.
 * `foregrounds` are every colour used for modules (gradient stops, corners).
 */
export function contrastIssue(foregrounds: string[], background: string): ContrastIssue {
  if (foregrounds.some((fg) => contrastRatio(fg, background) < 2.5)) return "low"
  if (foregrounds.some((fg) => luminance(fg) > luminance(background))) return "inverted"
  return null
}
