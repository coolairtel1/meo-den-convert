/**
 * Rasterizes an SVG to PNG on the main thread (workers have no DOM/Image to render SVG).
 * Vector art is rendered crisp at a useful size: the longest side is at least `minSide`.
 * Loaded through <img>, so scripts and external resources inside the SVG never run.
 */
export async function rasterizeSvg(file: Blob, minSide = 1024, maxSide = 4096): Promise<Blob> {
  const doc = new DOMParser().parseFromString(await file.text(), "image/svg+xml")
  const svg = doc.documentElement
  if (svg.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) throw new Error("invalid SVG")

  const len = (attr: string | null) => (attr && !attr.trim().endsWith("%") ? parseFloat(attr) : NaN)
  let w = len(svg.getAttribute("width"))
  let h = len(svg.getAttribute("height"))
  const vb = svg.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number)
  const hasViewBox = vb?.length === 4 && vb[2] > 0 && vb[3] > 0
  if (!(w > 0 && h > 0)) {
    if (hasViewBox) [w, h] = [vb![2], vb![3]]
    else [w, h] = [300, 150] // CSS default replaced-element size
  }
  if (!hasViewBox) svg.setAttribute("viewBox", `0 0 ${w} ${h}`)

  const longest = Math.min(maxSide, Math.max(minSide, w, h))
  const scale = longest / Math.max(w, h)
  const W = Math.max(1, Math.round(w * scale))
  const H = Math.max(1, Math.round(h * scale))
  svg.setAttribute("width", String(W))
  svg.setAttribute("height", String(H))

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement("canvas")
    canvas.width = W
    canvas.height = H
    canvas.getContext("2d")!.drawImage(img, 0, 0, W, H)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("SVG render failed"))), "image/png"),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
