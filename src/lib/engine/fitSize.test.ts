import { describe, expect, it } from "vitest"
import { fitToSize, type FitImage } from "./fitSize"

// Fake codec: size grows with pixel count and quality, like a real lossy encoder.
const fakeEncode = (bytesPerPixelAtQ100: number) => async (img: FitImage, q: number) =>
  new ArrayBuffer(Math.round(img.width * img.height * bytesPerPixelAtQ100 * (0.1 + (0.9 * q) / 100)))
const fakeResize = async (_: FitImage, width: number, height: number) => ({ width, height })

const base = {
  lossy: true,
  maxQuality: 85,
  bitsPerPixel: 0, // disable the up-front estimate unless a test wants it
  encode: fakeEncode(1),
  resize: fakeResize,
}

describe("fitToSize", () => {
  it("keeps the chosen quality when it already fits", async () => {
    const r = await fitToSize({ ...base, image: { width: 100, height: 100 }, targetBytes: 1_000_000 })
    expect(r).toMatchObject({ reached: true, quality: 85, image: { width: 100, height: 100 } })
  })

  it("finds the highest quality that fits without resizing", async () => {
    // 10 000 px: q85 ≈ 8650 B, q40 ≈ 4600 B → budget 6000 B lands in between.
    const r = await fitToSize({ ...base, image: { width: 100, height: 100 }, targetBytes: 6000 })
    expect(r.reached).toBe(true)
    expect(r.bytes.byteLength).toBeLessThanOrEqual(6000)
    expect(r.image).toEqual({ width: 100, height: 100 })
    // One quality step higher must not fit.
    const next = await fakeEncode(1)(r.image, r.quality! + 1)
    expect(next.byteLength).toBeGreaterThan(6000)
  })

  it("shrinks the image when even the minimum quality is too big", async () => {
    const r = await fitToSize({ ...base, image: { width: 1000, height: 800 }, targetBytes: 20_000 })
    expect(r.reached).toBe(true)
    expect(r.bytes.byteLength).toBeLessThanOrEqual(20_000)
    expect(r.image.width).toBeLessThan(1000)
    expect(r.image.width / r.image.height).toBeCloseTo(1.25, 1)
  })

  it("only shrinks lossless formats", async () => {
    const r = await fitToSize({ ...base, lossy: false, image: { width: 400, height: 400 }, targetBytes: 40_000 })
    expect(r).toMatchObject({ reached: true, quality: null })
    expect(r.bytes.byteLength).toBeLessThanOrEqual(40_000)
  })

  it("gives up gracefully with the smallest attempt when the budget is impossible", async () => {
    const r = await fitToSize({ ...base, image: { width: 200, height: 200 }, targetBytes: 10 })
    expect(r.reached).toBe(false)
    expect(Math.min(r.image.width, r.image.height)).toBeGreaterThanOrEqual(16)
  })

  it("pre-shrinks huge images from the bits-per-pixel estimate to save encodes", async () => {
    let encodes = 0
    const r = await fitToSize({
      ...base,
      bitsPerPixel: 8,
      encode: async (img, q) => {
        encodes++
        return fakeEncode(1)(img, q)
      },
      image: { width: 6000, height: 4000 },
      targetBytes: 500_000,
    })
    expect(r.reached).toBe(true)
    expect(encodes).toBeLessThanOrEqual(10)
  })
})
