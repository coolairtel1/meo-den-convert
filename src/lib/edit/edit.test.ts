import { describe, expect, it } from "vitest"
import { renderName } from "./rename"
import { applyEdits, centeredCrop, cropPixels, editsKey, NO_EDITS, type Edits, type Pixels } from "./transform"
import { placeMark } from "./watermark"

/** w×h image whose pixel at (x,y) has red = its original index, to track where pixels go. */
const grid = (w: number, h: number): Pixels => {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) data.set([i, 0, 0, 255], i * 4)
  return { width: w, height: h, data }
}
/** Rows of red values, top to bottom. */
const rows = (p: Pixels) =>
  Array.from({ length: p.height }, (_, y) => Array.from({ length: p.width }, (_, x) => p.data[(y * p.width + x) * 4]))

const edit = (e: Partial<Edits>): Edits => ({ ...NO_EDITS, ...e })

// 3×2 source:
//   0 1 2
//   3 4 5
describe("applyEdits", () => {
  it("returns the same image when there's nothing to do", () => {
    const p = grid(3, 2)
    expect(applyEdits(p, NO_EDITS)).toBe(p)
    expect(applyEdits(p, edit({ crop: { x: 0, y: 0, w: 1, h: 1 } }))).toBe(p)
  })

  it("rotates clockwise", () => {
    expect(rows(applyEdits(grid(3, 2), edit({ rotate: 90 })))).toEqual([
      [3, 0],
      [4, 1],
      [5, 2],
    ])
    expect(rows(applyEdits(grid(3, 2), edit({ rotate: 180 })))).toEqual([
      [5, 4, 3],
      [2, 1, 0],
    ])
    expect(rows(applyEdits(grid(3, 2), edit({ rotate: 270 })))).toEqual([
      [2, 5],
      [1, 4],
      [0, 3],
    ])
  })

  it("flips horizontally and vertically", () => {
    expect(rows(applyEdits(grid(3, 2), edit({ flipX: true })))).toEqual([
      [2, 1, 0],
      [5, 4, 3],
    ])
    expect(rows(applyEdits(grid(3, 2), edit({ flipY: true })))).toEqual([
      [3, 4, 5],
      [0, 1, 2],
    ])
  })

  it("crops in the rotated image's coordinates", () => {
    // rotate 90 → 2×3 [[3,0],[4,1],[5,2]]; keep the bottom-right 1×2
    const r = applyEdits(grid(3, 2), edit({ rotate: 90, crop: { x: 0.5, y: 1 / 3, w: 0.5, h: 2 / 3 } }))
    expect(rows(r)).toEqual([[1], [2]])
  })

  it("keeps alpha and other channels", () => {
    const p: Pixels = { width: 2, height: 1, data: new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8]) }
    expect([...applyEdits(p, edit({ flipX: true })).data]).toEqual([5, 6, 7, 8, 1, 2, 3, 4])
  })
})

describe("crop helpers", () => {
  it("converts fractions to a clamped pixel rect", () => {
    expect(cropPixels({ x: 0.25, y: 0, w: 0.5, h: 1 }, 400, 300)).toEqual({ x: 100, y: 0, width: 200, height: 300 })
    expect(cropPixels({ x: 0.99, y: 0.99, w: 0.5, h: 0.5 }, 100, 100)).toEqual({ x: 99, y: 99, width: 1, height: 1 })
  })

  it("centres the largest crop of a given aspect", () => {
    expect(centeredCrop(1, 400, 200)).toEqual({ x: 0.25, y: 0, w: 0.5, h: 1 })
    const c = centeredCrop(16 / 9, 300, 400)
    expect(c.w).toBe(1)
    expect((c.w * 300) / (c.h * 400)).toBeCloseTo(16 / 9, 5)
  })

  it("keys edits stably and ignores no-ops", () => {
    expect(editsKey(NO_EDITS)).toBe("")
    expect(editsKey(edit({ rotate: 90, flipX: true }))).toBe("90h")
    expect(editsKey(edit({ crop: { x: 0.1, y: 0, w: 0.5, h: 1 } }))).toBe("0c0.1000,0.0000,0.5000,1.0000")
  })
})

describe("renderName", () => {
  const ctx = { originalName: "IMG_0001.HEIC", extension: "jpg", index: 1, total: 12, width: 800, height: 600, date: new Date(2026, 8, 30) }

  it("keeps the original name when renaming is off", () => {
    expect(renderName({ enabled: false, pattern: "x", start: 1 }, ctx)).toBe("IMG_0001.jpg")
  })

  it("fills tokens and pads numbers to the batch size", () => {
    expect(renderName({ enabled: true, pattern: "hoso_{n}", start: 1 }, ctx)).toBe("hoso_02.jpg")
    expect(renderName({ enabled: true, pattern: "{date}_{name}_{w}x{h}", start: 1 }, ctx)).toBe("2026-09-30_IMG_0001_800x600.jpg")
  })

  it("sanitizes characters that are illegal in file names", () => {
    expect(renderName({ enabled: true, pattern: 'a/b:c*"d"', start: 1 }, ctx)).toBe("a-b-c--d-.jpg")
  })
})

describe("placeMark", () => {
  const base = { scale: 0.25, opacity: 0.8, margin: 0.02 }
  it("anchors to corners with a margin and keeps the mark's aspect", () => {
    expect(placeMark({ ...base, position: "br" }, 1000, 500, 200, 100)).toEqual({ x: 740, y: 365, w: 250, h: 125 })
    expect(placeMark({ ...base, position: "tl" }, 1000, 500, 200, 100)).toEqual({ x: 10, y: 10, w: 250, h: 125 })
  })
  it("centres", () => {
    const r = placeMark({ ...base, position: "mc" }, 1000, 500, 200, 100)
    expect([r.x, r.y]).toEqual([375, 187.5])
  })
})
