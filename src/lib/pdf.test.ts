import { describe, expect, it } from "vitest"
import { layoutPage } from "./pdf"

const A4 = { pageSize: "a4", orientation: "auto", marginMm: 0 } as const

describe("layoutPage", () => {
  it("fills an A4 portrait page with a portrait photo, centred", () => {
    const l = layoutPage(3000, 4000, A4)
    expect([l.pageWidth, l.pageHeight]).toEqual([595.28, 841.89])
    expect(l.width).toBeCloseTo(595.28, 1)
    expect(l.x).toBeCloseTo(0, 1)
    expect(l.y).toBeCloseTo((841.89 - l.height) / 2, 5)
  })

  it("turns the page for landscape images in auto mode", () => {
    const l = layoutPage(4000, 3000, A4)
    expect([l.pageWidth, l.pageHeight]).toEqual([841.89, 595.28])
  })

  it("respects forced orientation and margins", () => {
    const l = layoutPage(4000, 3000, { pageSize: "letter", orientation: "portrait", marginMm: 10 })
    const m = (10 * 72) / 25.4
    expect([l.pageWidth, l.pageHeight]).toEqual([612, 792])
    expect(l.width).toBeCloseTo(612 - 2 * m, 3)
    expect(l.x).toBeCloseTo(m, 3)
  })

  it("sizes 'fit' pages to the image with A4's long side", () => {
    const l = layoutPage(1000, 500, { pageSize: "fit", orientation: "auto", marginMm: 0 })
    expect(l.pageWidth).toBeCloseTo(841.89, 2)
    expect(l.pageHeight).toBeCloseTo(420.945, 2)
    expect([l.x, l.y]).toEqual([0, 0])
  })
})
