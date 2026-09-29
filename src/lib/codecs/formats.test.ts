import { describe, expect, it } from "vitest"
import { encodeBmp } from "./bmp"
import { buildIco, iconSizesFor } from "./ico"
import { targetSize } from "./resize"

const img = (width: number, height: number, rgba: number[]) =>
  ({ width, height, data: new Uint8ClampedArray(rgba) }) as unknown as ImageData

describe("encodeBmp", () => {
  it("writes a 24-bit bottom-up BMP with padded rows", () => {
    // 1×2: top red, bottom blue
    const buf = encodeBmp(img(1, 2, [255, 0, 0, 255, 0, 0, 255, 255]))
    const v = new DataView(buf)
    expect(String.fromCharCode(v.getUint8(0), v.getUint8(1))).toBe("BM")
    expect(v.getUint32(2, true)).toBe(buf.byteLength)
    expect(v.getInt32(18, true)).toBe(1)
    expect(v.getInt32(22, true)).toBe(2)
    expect(v.getUint16(28, true)).toBe(24)
    // each row padded to 4 bytes; first stored row is the bottom (blue) in BGR order
    expect(buf.byteLength).toBe(54 + 4 * 2)
    expect([...new Uint8Array(buf, 54, 3)]).toEqual([255, 0, 0])
    expect([...new Uint8Array(buf, 58, 3)]).toEqual([0, 0, 255])
  })
})

describe("buildIco", () => {
  it("writes a directory entry per image and appends PNG payloads", () => {
    const a = new Uint8Array([1, 2, 3]).buffer
    const b = new Uint8Array([4, 5]).buffer
    const buf = buildIco([
      { size: 16, png: a },
      { size: 256, png: b },
    ])
    const v = new DataView(buf)
    expect(v.getUint16(2, true)).toBe(1)
    expect(v.getUint16(4, true)).toBe(2)
    expect(v.getUint8(6)).toBe(16)
    expect(v.getUint8(6 + 16)).toBe(0) // 256 is stored as 0
    const off1 = v.getUint32(6 + 12, true)
    const off2 = v.getUint32(6 + 16 + 12, true)
    expect(off1).toBe(6 + 32)
    expect([...new Uint8Array(buf, off1, 3)]).toEqual([1, 2, 3])
    expect([...new Uint8Array(buf, off2, 2)]).toEqual([4, 5])
  })

  it("picks icon sizes up to the source size", () => {
    expect(iconSizesFor(1000)).toEqual([16, 24, 32, 48, 64, 128, 256])
    expect(iconSizesFor(50)).toEqual([16, 24, 32, 48])
    expect(iconSizesFor(10)).toEqual([16])
  })
})

describe("targetSize", () => {
  it("keeps size when not resizing or already small enough", () => {
    expect(targetSize(4000, 3000, { mode: "none", max: 1000, percent: 50 })).toBeNull()
    expect(targetSize(800, 600, { mode: "max", max: 1920, percent: 50 })).toBeNull()
  })
  it("fits the longest side and scales by percent", () => {
    expect(targetSize(4000, 3000, { mode: "max", max: 1920, percent: 50 })).toEqual({ width: 1920, height: 1440 })
    expect(targetSize(3000, 4000, { mode: "max", max: 1000, percent: 50 })).toEqual({ width: 750, height: 1000 })
    expect(targetSize(1001, 501, { mode: "percent", max: 0, percent: 50 })).toEqual({ width: 501, height: 251 })
  })
})
