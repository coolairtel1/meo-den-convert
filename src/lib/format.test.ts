import { describe, expect, it } from "vitest"
import { formatBytes, kbLabel, replaceExtension } from "./format"

describe("formatBytes", () => {
  it("scales units", () => {
    expect(formatBytes(512, "en")).toBe("512 B")
    expect(formatBytes(1536, "en")).toBe("1.5 KB")
    expect(formatBytes(5 * 1024 * 1024, "en")).toBe("5 MB")
  })
})

describe("replaceExtension", () => {
  it("swaps or appends the extension", () => {
    expect(replaceExtension("IMG_0001.HEIC", "jpg")).toBe("IMG_0001.jpg")
    expect(replaceExtension("my.photo.png", "webp")).toBe("my.photo.webp")
    expect(replaceExtension("noext", "png")).toBe("noext.png")
  })
})

describe("kbLabel", () => {
  it("uses decimal KB/MB like upload limits do", () => {
    expect(kbLabel(500)).toBe("500 KB")
    expect(kbLabel(2000)).toBe("2 MB")
    expect(kbLabel(1500)).toBe("1.5 MB")
  })
})
