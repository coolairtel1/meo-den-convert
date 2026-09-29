/**
 * Minimal colour management for decoders that hand back raw pixels (libheif, UTIF).
 * Browser-native decoding is already colour-managed; these paths are not, and iPhone
 * photos are Display P3, which looks wrong when its values are read as sRGB.
 */

const P3_ASCII = new TextEncoder().encode("Display P3")
const P3_UTF16 = Uint8Array.from([..."Display P3"].flatMap((c) => [0, c.charCodeAt(0)]))

const indexOf = (hay: Uint8Array, needle: Uint8Array) => {
  outer: for (let i = 0; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer
    return i
  }
  return -1
}

/** True when an ICC profile (or a byte range containing one) is Apple's Display P3. */
export const isDisplayP3 = (bytes: Uint8Array) => indexOf(bytes, P3_UTF16) >= 0 || indexOf(bytes, P3_ASCII) >= 0

// Display P3 and sRGB share the D65 white point and the sRGB transfer curve; only the primaries differ.
const M = [
  [1.2249401, -0.2249404, 0],
  [-0.0420569, 1.0420571, 0],
  [-0.0196376, -0.0786361, 1.0982735],
]

const TO_LINEAR = Float32Array.from({ length: 256 }, (_, i) => {
  const c = i / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})

const ENC_STEPS = 4096
const FROM_LINEAR = Uint8ClampedArray.from({ length: ENC_STEPS + 1 }, (_, i) => {
  const l = i / ENC_STEPS
  return Math.round((l <= 0.0031308 ? l * 12.92 : 1.055 * l ** (1 / 2.4) - 0.055) * 255)
})

const encode = (l: number) => FROM_LINEAR[Math.round(Math.min(1, Math.max(0, l)) * ENC_STEPS)]

/** Converts RGBA pixels from Display P3 to sRGB in place (out-of-gamut colours are clipped). */
export function p3ToSrgb(data: Uint8ClampedArray): Uint8ClampedArray {
  for (let i = 0; i < data.length; i += 4) {
    const r = TO_LINEAR[data[i]]
    const g = TO_LINEAR[data[i + 1]]
    const b = TO_LINEAR[data[i + 2]]
    data[i] = encode(M[0][0] * r + M[0][1] * g + M[0][2] * b)
    data[i + 1] = encode(M[1][0] * r + M[1][1] * g + M[1][2] * b)
    data[i + 2] = encode(M[2][0] * r + M[2][1] * g + M[2][2] * b)
  }
  return data
}
