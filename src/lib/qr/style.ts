import type { CornerDotType, CornerSquareType, DotType, ErrorCorrectionLevel, Gradient, Options } from "qr-code-styling"

export type GradientKind = "linear" | "radial"

export interface QrStyle {
  dotType: DotType
  dotColor: string
  gradient: boolean
  gradientColor: string
  gradientType: GradientKind
  gradientRotation: number // degrees
  cornerSquareType: CornerSquareType
  cornerSquareColor: string
  cornerDotType: CornerDotType
  cornerDotColor: string
  bgColor: string
  bgTransparent: boolean
  /** Data URL (downscaled on upload) or null. */
  logo: string | null
  logoSize: number // 0.15–0.5 of the code
  logoMargin: number
  hideBackgroundDots: boolean
  margin: number // px at 512 px, scaled with export size
  ecl: ErrorCorrectionLevel
  shape: "square" | "circle"
}

export const DEFAULT_STYLE: QrStyle = {
  dotType: "rounded",
  dotColor: "#1d1a26",
  gradient: false,
  gradientColor: "#6d4aff",
  gradientType: "linear",
  gradientRotation: 45,
  cornerSquareType: "extra-rounded",
  cornerSquareColor: "#1d1a26",
  cornerDotType: "dot",
  cornerDotColor: "#a87400",
  bgColor: "#ffffff",
  bgTransparent: false,
  logo: null,
  logoSize: 0.3,
  logoMargin: 4,
  hideBackgroundDots: true,
  margin: 16,
  ecl: "M",
  shape: "square",
}

/** Error correction actually used: a logo covers modules, so it needs H. */
export const effectiveEcl = (s: QrStyle): ErrorCorrectionLevel => (s.logo ? "H" : s.ecl)

/** Every colour drawn as a "dark" module (for contrast checks). */
export const foregroundColors = (s: QrStyle) =>
  [s.dotColor, s.gradient && s.gradientColor, s.cornerSquareColor, s.cornerDotColor].filter(Boolean) as string[]

/**
 * qr-code-styling feeds each UTF-16 char as one byte (Latin-1). Handing it the UTF-8 bytes
 * as a "binary string" makes Vietnamese, emoji, etc. decode correctly on phones.
 */
export function toByteString(text: string): string {
  let out = ""
  for (const b of new TextEncoder().encode(text)) out += String.fromCharCode(b)
  return out
}

export function toQrOptions(style: QrStyle, data: string, size: number, forceOpaque = false): Partial<Options> {
  const scale = size / 512
  const gradient: Gradient | undefined = style.gradient
    ? {
        type: style.gradientType,
        rotation: (style.gradientRotation * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: style.dotColor },
          { offset: 1, color: style.gradientColor },
        ],
      }
    : undefined
  const transparent = style.bgTransparent && !forceOpaque

  return {
    width: size,
    height: size,
    data: toByteString(data),
    margin: Math.round(style.margin * scale),
    shape: style.shape,
    image: style.logo ?? undefined,
    qrOptions: { errorCorrectionLevel: effectiveEcl(style), mode: "Byte" },
    imageOptions: {
      hideBackgroundDots: style.hideBackgroundDots,
      imageSize: style.logoSize,
      margin: Math.round(style.logoMargin * scale),
      crossOrigin: "anonymous",
    },
    dotsOptions: { type: style.dotType, color: style.dotColor, gradient },
    cornersSquareOptions: { type: style.cornerSquareType, color: style.cornerSquareColor },
    cornersDotOptions: { type: style.cornerDotType, color: style.cornerDotColor },
    backgroundOptions: { color: transparent ? "transparent" : style.bgColor },
  }
}
