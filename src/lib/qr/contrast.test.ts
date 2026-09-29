import { describe, expect, it } from "vitest"
import { contrastIssue, contrastRatio } from "./contrast"

describe("contrast", () => {
  it("computes WCAG ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0)
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5)
  })

  it("flags low contrast and inverted codes", () => {
    expect(contrastIssue(["#000000"], "#ffffff")).toBeNull()
    expect(contrastIssue(["#dddddd"], "#ffffff")).toBe("low")
    expect(contrastIssue(["#ffffff"], "#000000")).toBe("inverted")
  })
})
