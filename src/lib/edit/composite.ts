import { placeMark, type WatermarkPlacement } from "./watermark"

/** A watermark ready for the worker: the rendered mark (text or logo) plus where to put it. */
export interface WatermarkJob extends WatermarkPlacement {
  mark: Blob
}

/** Draws the mark onto the image (worker side, OffscreenCanvas). */
export async function compositeWatermark(image: ImageData, job: WatermarkJob): Promise<ImageData> {
  const mark = await createImageBitmap(job.mark)
  try {
    const { width: W, height: H } = image
    const canvas = new OffscreenCanvas(W, H)
    const ctx = canvas.getContext("2d")!
    ctx.putImageData(image, 0, 0)
    ctx.globalAlpha = job.opacity
    ctx.imageSmoothingQuality = "high"

    if (job.position === "tile") {
      // Diagonal repeat across the whole image, like a stock-photo watermark.
      const w = Math.max(1, W * job.scale)
      const h = (w * mark.height) / mark.width
      const diag = Math.hypot(W, H)
      ctx.translate(W / 2, H / 2)
      ctx.rotate(-Math.PI / 6)
      const stepX = w * 1.6
      const stepY = h * 3
      for (let row = 0, y = -diag / 2; y < diag / 2; y += stepY, row++) {
        for (let x = -diag / 2 + (row % 2) * (stepX / 2); x < diag / 2; x += stepX) ctx.drawImage(mark, x, y, w, h)
      }
    } else {
      const r = placeMark(job, W, H, mark.width, mark.height)
      ctx.drawImage(mark, r.x, r.y, r.w, r.h)
    }
    return ctx.getImageData(0, 0, W, H)
  } finally {
    mark.close()
  }
}
