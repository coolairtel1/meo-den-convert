import { FlipHorizontal2, FlipVertical2, Loader2, RotateCcw, RotateCw, Undo2 } from "lucide-react"
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { rasterizeSvg } from "@/lib/codecs/svg"
import { FULL, moveCrop, nudgeCrop, resizeCrop, type Handle } from "@/lib/edit/cropBox"
import { ASPECTS, centeredCrop, cropPixels, hasEdits, NO_EDITS, orientedSize, type CropRect, type Edits, type Rotation } from "@/lib/edit/transform"
import { convertInPool } from "@/lib/engine/pool"
import { gsap, prefersReducedMotion } from "@/lib/motion/gsap"
import { cn } from "@/lib/utils"
import { useConverterStore, type ConvertItem } from "./store"

/** Formats an <img> can show directly (with EXIF rotation applied, like the pipeline). */
const NATIVE_PREVIEW = new Set(["jpeg", "png", "webp", "gif", "bmp", "avif", "ico", "svg"])
const HANDLES_FREE: Handle[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"]
const HANDLES_LOCKED: Handle[] = ["ne", "nw", "se", "sw"]

interface EditorDialogProps {
  item: ConvertItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditorDialog({ item, open, onOpenChange }: EditorDialogProps) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("editor.cancel")} aria-describedby={undefined} className="max-w-3xl">
        <DialogTitle>{t("editor.title")}</DialogTitle>
        <DialogDescription className="-mt-2 truncate">{item.file.name}</DialogDescription>
        {open && <Editor item={item} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

/** Loads a preview the browser can draw: the original for web formats, a worker-rendered JPEG otherwise. */
function usePreview(item: ConvertItem) {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [exact, setExact] = useState(false) // preview has the real pixel size
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let revoked: string | null = null
    let cancelled = false
    void (async () => {
      try {
        let url = item.previewUrl
        const native = NATIVE_PREVIEW.has(item.inputFormat ?? "")
        if (!native) {
          const source = item.inputFormat === "svg" ? await rasterizeSvg(item.file) : item.file
          const res = await convertInPool(source, {
            format: "jpeg",
            quality: 80,
            background: "#ffffff",
            resize: { mode: "max", max: 1600, percent: 100 },
            target: { enabled: false, kb: 0 },
          })
          url = revoked = URL.createObjectURL(res.blob)
        }
        const el = new Image()
        el.src = url
        await el.decode()
        if (!cancelled) {
          setImg(el)
          setExact(native && item.inputFormat !== "svg")
        }
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
      if (revoked) URL.revokeObjectURL(revoked)
    }
  }, [item])

  return { img, exact, failed }
}

function Editor({ item, onDone }: { item: ConvertItem; onDone: () => void }) {
  const { t } = useTranslation()
  const setEdits = useConverterStore((s) => s.setEdits)
  const convertOne = useConverterStore((s) => s.convertOne)
  const convertAll = useConverterStore((s) => s.convertAll)
  const applyOrientationToAll = useConverterStore((s) => s.applyOrientationToAll)
  const itemsCount = useConverterStore((s) => s.items.length)
  const start = item.edits ?? NO_EDITS

  const [rotate, setRotate] = useState<Rotation>(start.rotate)
  const [flipX, setFlipX] = useState(start.flipX)
  const [flipY, setFlipY] = useState(start.flipY)
  const [crop, setCrop] = useState<CropRect>(start.crop ?? FULL)
  const [aspect, setAspect] = useState(start.aspect ?? "free")
  const { img, exact, failed } = usePreview(item)

  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [view, setView] = useState({ w: 0, h: 0 })
  const drag = useRef<{ kind: Handle | "move"; x: number; y: number; start: CropRect } | null>(null)
  const cropTween = useRef<gsap.core.Tween | null>(null)

  const oriented = img ? orientedSize(img.naturalWidth, img.naturalHeight, rotate) : { width: 1, height: 1 }
  const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null
  /** Aspect in fraction space (w/h) for the crop math. */
  const k = ratio ? (ratio * oriented.height) / oriented.width : null

  // Fit the oriented image into the stage and draw it rotated/flipped.
  useLayoutEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (!img || !stage || !canvas) return
    const draw = () => {
      const maxW = stage.clientWidth
      const maxH = Math.min(window.innerHeight * 0.55, 520)
      const s = Math.min(maxW / oriented.width, maxH / oriented.height)
      const w = Math.round(oriented.width * s)
      const h = Math.round(oriented.height * s)
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext("2d")!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.translate(w / 2, h / 2)
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1) // applied after rotation, as in the pipeline
      ctx.rotate((rotate * Math.PI) / 180)
      const iw = img.naturalWidth * s
      const ih = img.naturalHeight * s
      ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih)
      setView({ w, h })
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [img, rotate, flipX, flipY, oriented.width, oriented.height])

  /** Glide the crop box to a new rectangle. */
  const animateCrop = (to: CropRect) => {
    cropTween.current?.kill()
    if (prefersReducedMotion()) return setCrop(to)
    const state = { ...crop }
    // Copy only x/y/w/h: GSAP tags tweened objects with an internal `_gsap` field (with functions),
    // which would ride along into the edits and fail to clone into the worker.
    cropTween.current = gsap.to(state, {
      ...to,
      duration: 0.35,
      ease: "power3.out",
      onUpdate: () => setCrop({ x: state.x, y: state.y, w: state.w, h: state.h }),
    })
  }

  const chooseAspect = (id: string) => {
    setAspect(id)
    const r = ASPECTS.find((a) => a.id === id)?.ratio
    if (r) animateCrop(centeredCrop(r, oriented.width, oriented.height))
  }

  const turn = (dir: 1 | -1) => {
    const next = (((rotate + dir * 90) % 360) + 360) % 360 as Rotation
    setRotate(next)
    // The old box doesn't mean much after a turn: recentre (keeping the aspect) or reset to full.
    const o = img ? orientedSize(img.naturalWidth, img.naturalHeight, next) : oriented
    setCrop(ratio ? centeredCrop(ratio, o.width, o.height) : FULL)
    if (!prefersReducedMotion() && canvasRef.current)
      gsap.fromTo(canvasRef.current, { rotation: -dir * 90, scale: 0.85 }, { rotation: 0, scale: 1, duration: 0.45, ease: "back.out(1.6)" })
  }

  const flip = (axis: "x" | "y") => {
    if (axis === "x") setFlipX((f) => !f)
    else setFlipY((f) => !f)
    // Mirror the box too, so it stays over the same part of the picture.
    setCrop((c) => (axis === "x" ? { ...c, x: 1 - c.x - c.w } : { ...c, y: 1 - c.y - c.h }))
    if (!prefersReducedMotion() && canvasRef.current)
      gsap.fromTo(canvasRef.current, axis === "x" ? { scaleX: -1 } : { scaleY: -1 }, { scaleX: 1, scaleY: 1, duration: 0.4, ease: "power2.out" })
  }

  const reset = () => {
    setRotate(0)
    setFlipX(false)
    setFlipY(false)
    setAspect("free")
    animateCrop(FULL)
  }

  const onPointerDown = (kind: Handle | "move") => (e: ReactPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    cropTween.current?.kill()
    drag.current = { kind, x: e.clientX, y: e.clientY, start: crop }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d || !view.w) return
    const dx = (e.clientX - d.x) / view.w
    const dy = (e.clientY - d.y) / view.h
    setCrop(d.kind === "move" ? moveCrop(d.start, dx, dy) : resizeCrop(d.start, d.kind, dx, dy, k))
  }
  const onPointerUp = () => {
    drag.current = null
  }

  const edits: Edits = {
    rotate,
    flipX,
    flipY,
    crop: crop.x <= 0.0005 && crop.y <= 0.0005 && crop.w >= 0.9995 && crop.h >= 0.9995 ? null : crop,
    aspect,
  }
  const out = img && exact ? cropPixels(edits.crop ?? FULL, oriented.width, oriented.height) : null

  const save = (all: boolean) => {
    setEdits(item.id, hasEdits(edits) ? edits : undefined)
    if (all) applyOrientationToAll(edits)
    const { items } = useConverterStore.getState()
    // Refresh results that were already made, so the change shows up right away.
    if (all ? items.some((it) => it.status === "done") : item.status === "done") void (all ? convertAll() : convertOne(item.id))
    onDone()
  }

  return (
    <div className="space-y-4">
      <div ref={stageRef} className="grid min-h-48 place-items-center overflow-hidden rounded-2xl bg-[conic-gradient(var(--muted)_25%,transparent_0_50%,var(--muted)_0_75%,transparent_0)] bg-[length:16px_16px] p-2">
        {!img && !failed && <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label={t("editor.loading")} />}
        {failed && <p className="text-sm text-destructive">{t("editor.previewFailed")}</p>}
        {img && (
          <div className="relative" style={{ width: view.w, height: view.h }}>
            <canvas ref={canvasRef} className="block" aria-hidden />
            {/* Crop box: dims the outside with a huge shadow; drag to move, handles to resize. */}
            <div
              role="group"
              aria-label={t("editor.cropBox")}
              tabIndex={0}
              onPointerDown={onPointerDown("move")}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onKeyDown={(e) => {
                const next = nudgeCrop(crop, e.key, e.shiftKey ? 0.05 : 0.01)
                if (next) {
                  e.preventDefault()
                  setCrop(next)
                }
              }}
              className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] outline-none focus-visible:border-brand"
              style={{ left: crop.x * view.w, top: crop.y * view.h, width: crop.w * view.w, height: crop.h * view.h }}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }, (_, i) => (
                  <span key={i} className="border-[0.5px] border-white/40" />
                ))}
              </div>
              {(k ? HANDLES_LOCKED : HANDLES_FREE).map((h) => (
                <span
                  key={h}
                  data-handle={h}
                  onPointerDown={onPointerDown(h)}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  className={cn(
                    "absolute size-4 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-2 border-white bg-brand shadow",
                    h.includes("n") ? "top-0" : h.includes("s") ? "top-full" : "top-1/2",
                    h.includes("w") ? "left-0" : h.includes("e") ? "left-full" : "left-1/2",
                    { n: "cursor-n-resize", s: "cursor-s-resize", e: "cursor-e-resize", w: "cursor-w-resize", ne: "cursor-ne-resize", sw: "cursor-sw-resize", nw: "cursor-nw-resize", se: "cursor-se-resize" }[h],
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label={t("editor.aspect")} className="flex flex-wrap gap-1.5">
          {ASPECTS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={aspect === a.id}
              onClick={() => chooseAspect(a.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold transition-[background-color,scale] active:scale-95",
                aspect === a.id ? "border-brand bg-brand/15" : "hover:bg-muted",
              )}
            >
              {a.id === "free" ? t("editor.free") : a.id}
            </button>
          ))}
        </div>
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={() => turn(-1)} aria-label={t("editor.rotateLeft")} title={t("editor.rotateLeft")}>
            <RotateCcw aria-hidden />
          </Button>
          <Button variant="outline" size="icon" onClick={() => turn(1)} aria-label={t("editor.rotateRight")} title={t("editor.rotateRight")}>
            <RotateCw aria-hidden />
          </Button>
          <Button
            variant={flipX ? "secondary" : "outline"}
            size="icon"
            aria-pressed={flipX}
            onClick={() => flip("x")}
            aria-label={t("editor.flipH")}
            title={t("editor.flipH")}
          >
            <FlipHorizontal2 aria-hidden />
          </Button>
          <Button
            variant={flipY ? "secondary" : "outline"}
            size="icon"
            aria-pressed={flipY}
            onClick={() => flip("y")}
            aria-label={t("editor.flipV")}
            title={t("editor.flipV")}
          >
            <FlipVertical2 aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" onClick={reset} aria-label={t("editor.reset")} title={t("editor.reset")}>
            <Undo2 aria-hidden />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {out ? t("editor.outputSize", { w: out.width, h: out.height }) : t("editor.hint")}
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        {itemsCount > 1 && (
          <Button variant="ghost" onClick={() => save(true)} disabled={!img}>
            {t("editor.applyAll")}
          </Button>
        )}
        <Button variant="outline" onClick={onDone}>
          {t("editor.cancel")}
        </Button>
        <Button onClick={() => save(false)} disabled={!img}>
          {t("editor.save")}
        </Button>
      </div>
    </div>
  )
}
