import { DEFAULT_STYLE, type QrStyle } from "./style"

export interface QrPreset {
  id: string
  /** i18n key for built-ins, literal name for user presets. */
  name: string
  builtIn?: boolean
  style: Partial<QrStyle>
}

/** Built-in looks. They leave logo, margin and error correction alone. */
export const BUILT_IN_PRESETS: QrPreset[] = [
  {
    id: "meoden",
    name: "qr.presets.meoden",
    builtIn: true,
    style: {
      dotType: "classy-rounded",
      dotColor: "#1d1a26",
      gradient: false,
      cornerSquareType: "extra-rounded",
      cornerSquareColor: "#1d1a26",
      cornerDotType: "dot",
      cornerDotColor: "#a87400",
      bgColor: "#fffaf0",
      bgTransparent: false,
    },
  },
  {
    id: "vietqr",
    name: "qr.presets.vietqr",
    builtIn: true,
    style: {
      dotType: "rounded",
      dotColor: "#00529c",
      gradient: false,
      cornerSquareType: "extra-rounded",
      cornerSquareColor: "#da251d",
      cornerDotType: "dot",
      cornerDotColor: "#da251d",
      bgColor: "#ffffff",
      bgTransparent: false,
    },
  },
  {
    id: "classic",
    name: "qr.presets.classic",
    builtIn: true,
    style: {
      dotType: "square",
      dotColor: "#000000",
      gradient: false,
      cornerSquareType: "square",
      cornerSquareColor: "#000000",
      cornerDotType: "square",
      cornerDotColor: "#000000",
      bgColor: "#ffffff",
      bgTransparent: false,
    },
  },
  {
    id: "sunset",
    name: "qr.presets.sunset",
    builtIn: true,
    style: {
      dotType: "rounded",
      dotColor: "#c2185b",
      gradient: true,
      gradientColor: "#e65100",
      gradientType: "linear",
      gradientRotation: 45,
      cornerSquareType: "extra-rounded",
      cornerSquareColor: "#6a1b4d",
      cornerDotType: "dot",
      cornerDotColor: "#6a1b4d",
      bgColor: "#fff8f0",
      bgTransparent: false,
    },
  },
  {
    id: "ocean",
    name: "qr.presets.ocean",
    builtIn: true,
    style: {
      dotType: "dots",
      dotColor: "#0d47a1",
      gradient: true,
      gradientColor: "#0097a7",
      gradientType: "radial",
      gradientRotation: 0,
      cornerSquareType: "extra-rounded",
      cornerSquareColor: "#0b3060",
      cornerDotType: "dot",
      cornerDotColor: "#0b3060",
      bgColor: "#f0f8ff",
      bgTransparent: false,
    },
  },
  {
    id: "candy",
    name: "qr.presets.candy",
    builtIn: true,
    style: {
      dotType: "extra-rounded",
      dotColor: "#b0245f",
      gradient: false,
      cornerSquareType: "dot",
      cornerSquareColor: "#7b1fa2",
      cornerDotType: "dot",
      cornerDotColor: "#7b1fa2",
      bgColor: "#fff0f6",
      bgTransparent: false,
    },
  },
  {
    id: "forest",
    name: "qr.presets.forest",
    builtIn: true,
    style: {
      dotType: "classy",
      dotColor: "#1b5e20",
      gradient: true,
      gradientColor: "#33691e",
      gradientType: "linear",
      gradientRotation: 90,
      cornerSquareType: "square",
      cornerSquareColor: "#10381a",
      cornerDotType: "square",
      cornerDotColor: "#10381a",
      bgColor: "#f4fbef",
      bgTransparent: false,
    },
  },
]

export const presetPreview = (p: QrPreset): QrStyle => ({ ...DEFAULT_STYLE, ...p.style })
