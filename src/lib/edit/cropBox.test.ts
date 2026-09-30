import { describe, expect, it } from "vitest"
import { moveCrop, resizeCrop } from "./cropBox"

const box = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 }
const near = (r: { x: number; y: number; w: number; h: number }) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, +v.toFixed(4)]))

describe("moveCrop", () => {
  it("moves and stays inside the image", () => {
    expect(moveCrop(box, 0.1, -0.1)).toEqual({ ...box, x: 0.35, y: 0.15 })
    expect(moveCrop(box, 1, 1)).toEqual({ ...box, x: 0.5, y: 0.5 })
  })
})

describe("resizeCrop (free)", () => {
  it("drags edges and corners", () => {
    expect(near(resizeCrop(box, "e", 0.1, 0, null))).toEqual({ x: 0.25, y: 0.25, w: 0.6, h: 0.5 })
    expect(near(resizeCrop(box, "nw", -0.1, -0.2, null))).toEqual({ x: 0.15, y: 0.05, w: 0.6, h: 0.7 })
  })
  it("never flips or leaves the image", () => {
    const r = resizeCrop(box, "w", 0.9, 0, null)
    expect(r.w).toBeCloseTo(0.05)
    expect(r.x + r.w).toBeCloseTo(0.75)
    expect(resizeCrop(box, "se", 5, 5, null)).toEqual({ x: 0.25, y: 0.25, w: 0.75, h: 0.75 })
  })
})

describe("resizeCrop (locked aspect)", () => {
  it("keeps the ratio while growing from the opposite corner", () => {
    const r = resizeCrop(box, "se", 0.1, 0, 1)
    expect(near(r)).toEqual({ x: 0.25, y: 0.25, w: 0.6, h: 0.6 })
    const nw = resizeCrop(box, "nw", -0.1, 0, 1)
    expect(near(nw)).toEqual({ x: 0.15, y: 0.15, w: 0.6, h: 0.6 })
  })
  it("stops at the image bounds, still at the ratio", () => {
    const r = resizeCrop(box, "se", 1, 0, 2) // w/h = 2
    expect(r.x + r.w).toBeLessThanOrEqual(1 + 1e-9)
    expect(r.y + r.h).toBeLessThanOrEqual(1 + 1e-9)
    expect(r.w / r.h).toBeCloseTo(2)
  })
})
