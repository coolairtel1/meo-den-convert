/** Parses "#rgb" / "#rrggbb" into [r, g, b]; falls back to white. */
export function parseHexColor(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, "")
  if (h.length === 3) h = [...h].map((c) => c + c).join("")
  if (!/^[0-9a-f]{6}$/i.test(h)) return [255, 255, 255]
  const n = parseInt(h, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Composites every pixel over a solid background and makes it fully opaque (in place). */
export function flattenAlpha(data: Uint8ClampedArray, background: string): Uint8ClampedArray {
  const [br, bg, bb] = parseHexColor(background)
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a === 255) continue
    const t = a / 255
    data[i] = data[i] * t + br * (1 - t)
    data[i + 1] = data[i + 1] * t + bg * (1 - t)
    data[i + 2] = data[i + 2] * t + bb * (1 - t)
    data[i + 3] = 255
  }
  return data
}

export function hasTransparency(data: Uint8ClampedArray): boolean {
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) return true
  return false
}
