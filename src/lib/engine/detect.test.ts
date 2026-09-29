import { describe, expect, it } from "vitest"
import { detectFormat } from "./detect"

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)))

const ftyp = (major: string, ...compat: string[]) => {
  const size = 16 + compat.length * 4
  return bytes([0, 0, 0, size], "ftyp", major, [0, 0, 0, 0], ...compat)
}

describe("detectFormat", () => {
  it.each([
    ["jpeg", bytes([0xff, 0xd8, 0xff, 0xe0])],
    ["png", bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a])],
    ["webp", bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 ")],
    ["gif", bytes("GIF89a")],
    ["bmp", bytes("BM", [0, 0, 0, 0])],
    ["tiff", bytes([0x49, 0x49, 0x2a, 0])],
    ["tiff", bytes([0x4d, 0x4d, 0, 0x2a])],
    ["ico", bytes([0, 0, 1, 0, 1, 0])],
    ["svg", bytes('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg">')],
    ["svg", bytes("  <svg viewBox='0 0 1 1'>")],
  ] as const)("detects %s", (expected, input) => {
    expect(detectFormat(input)).toBe(expected)
  })

  it("detects iPhone HEIC by major brand", () => {
    expect(detectFormat(ftyp("heic", "mif1", "heic"))).toBe("heic")
  })

  it("detects HEIF listed only as mif1", () => {
    expect(detectFormat(ftyp("mif1", "heic"))).toBe("heic")
  })

  it("prefers AVIF when mif1 is also listed", () => {
    expect(detectFormat(ftyp("mif1", "avif", "miaf"))).toBe("avif")
    expect(detectFormat(ftyp("avif", "mif1"))).toBe("avif")
  })

  it("returns unknown for short or unrecognised input", () => {
    expect(detectFormat(bytes([1, 2]))).toBe("unknown")
    expect(detectFormat(bytes("hello world"))).toBe("unknown")
  })
})
