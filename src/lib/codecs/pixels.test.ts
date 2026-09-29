import { describe, expect, it } from "vitest"
import { flattenAlpha, hasTransparency, parseHexColor } from "./pixels"

describe("parseHexColor", () => {
  it("parses long and short hex", () => {
    expect(parseHexColor("#ff8000")).toEqual([255, 128, 0])
    expect(parseHexColor("#0f0")).toEqual([0, 255, 0])
  })
  it("falls back to white on garbage", () => {
    expect(parseHexColor("nope")).toEqual([255, 255, 255])
  })
})

describe("flattenAlpha", () => {
  it("composites over the background and makes pixels opaque", () => {
    const px = new Uint8ClampedArray([
      255, 0, 0, 255, // opaque red stays
      0, 0, 0, 0, // transparent → background
      0, 0, 255, 128, // half blue over white
    ])
    flattenAlpha(px, "#ffffff")
    expect([...px.slice(0, 4)]).toEqual([255, 0, 0, 255])
    expect([...px.slice(4, 8)]).toEqual([255, 255, 255, 255])
    expect([...px.slice(8, 12)]).toEqual([127, 127, 255, 255])
    expect(hasTransparency(px)).toBe(false)
  })
})
