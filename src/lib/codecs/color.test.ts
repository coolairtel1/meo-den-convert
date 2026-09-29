import { describe, expect, it } from "vitest"
import { isDisplayP3, p3ToSrgb } from "./color"

describe("isDisplayP3", () => {
  it("finds the profile description in ASCII or UTF-16BE", () => {
    const utf16 = Uint8Array.from([1, 2, ...[..."Display P3"].flatMap((c) => [0, c.charCodeAt(0)]), 3])
    expect(isDisplayP3(utf16)).toBe(true)
    expect(isDisplayP3(new TextEncoder().encode("xx Display P3 yy"))).toBe(true)
    expect(isDisplayP3(new TextEncoder().encode("sRGB IEC61966-2.1"))).toBe(false)
  })
})

describe("p3ToSrgb", () => {
  it("leaves greys and alpha untouched", () => {
    const px = new Uint8ClampedArray([0, 0, 0, 10, 128, 128, 128, 20, 255, 255, 255, 30])
    expect([...p3ToSrgb(px)]).toEqual([0, 0, 0, 10, 128, 128, 128, 20, 255, 255, 255, 30])
  })

  it("clips out-of-gamut P3 primaries to sRGB primaries", () => {
    expect([...p3ToSrgb(new Uint8ClampedArray([255, 0, 0, 255]))]).toEqual([255, 0, 0, 255])
    expect([...p3ToSrgb(new Uint8ClampedArray([0, 255, 0, 255]))]).toEqual([0, 255, 0, 255])
  })

  it("makes in-gamut colours more saturated, as sRGB needs larger values for the same colour", () => {
    const [r, g, b] = p3ToSrgb(new Uint8ClampedArray([200, 120, 100, 255]))
    expect(r).toBeGreaterThan(200)
    expect(g).toBeLessThanOrEqual(120)
    expect(b).toBeLessThan(100)
  })
})
