import { describe, expect, it } from "vitest"
import { applyMask, normalizeMask, toCHW } from "./mask"

describe("toCHW", () => {
  it("splits channels into planes and normalizes", () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]) // 2×2
    const out = toCHW(rgba, 2, [0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
    expect(Array.from(out)).toEqual([1, -1, -1, 1, -1, 1, -1, 1, -1, -1, 1, 1])
  })
})

describe("normalizeMask", () => {
  it("min-max scales to 0…1", () => {
    expect(Array.from(normalizeMask([2, 4, 6], 3, "minmax"))).toEqual([0, 0.5, 1])
  })
  it("only clamps when no post-processing is needed", () => {
    expect(Array.from(normalizeMask([-0.5, 0.25, 1.5], 3, "none"))).toEqual([0, 0.25, 1])
  })
})

describe("applyMask", () => {
  it("keeps the foreground and clears the background at full resolution", () => {
    // 2×2 mask: left column foreground, right column background; image 4×2.
    const mask = new Float32Array([1, 0, 1, 0])
    const rgba = new Uint8ClampedArray(4 * 2 * 4).fill(255)
    applyMask(rgba, 4, 2, mask, 2)
    const alpha = (x: number, y: number) => rgba[(y * 4 + x) * 4 + 3]
    expect(alpha(0, 0)).toBe(255)
    expect(alpha(3, 1)).toBe(0)
    // Upsampled edge blends smoothly between the two cells.
    expect(alpha(1, 0)).toBeGreaterThan(alpha(2, 0))
    expect(alpha(1, 0)).toBeLessThan(255)
  })

  it("multiplies existing transparency instead of overwriting it", () => {
    const rgba = new Uint8ClampedArray([10, 20, 30, 100])
    applyMask(rgba, 1, 1, new Float32Array([0.5]), 1)
    expect(rgba[3]).toBe(50)
  })
})
