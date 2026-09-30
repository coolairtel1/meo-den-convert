import { AlertCircle, Check, Crop, Download, GripVertical, RotateCcw, Scissors, Share2, X } from "lucide-react"
import { lazy, Suspense, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { FORMAT_LABEL } from "@/lib/codecs/support"
import { shareWithCat } from "@/features/share/shareWithCat"
import { downloadUrl } from "@/lib/download"
import { blobToFile, canShareFiles } from "@/lib/share"
import { formatBytes, kbLabel } from "@/lib/format"
import { Draggable, gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap"
import { cn } from "@/lib/utils"
import { hasEdits } from "@/lib/edit/transform"
import { itemKey, type ConvertItem } from "./store"


// The editor (crop UI, dialog) only loads when someone opens it.
const EditorDialog = lazy(() => import("./EditorDialog").then((m) => ({ default: m.EditorDialog })))
interface FileCardProps {
  item: ConvertItem
  index: number
  total: number
  currentKey: string
  /** Name to save/share the result as (rename pattern applied). */
  outputName?: string
  onRemove: (id: string, el: HTMLElement) => void
  onRetry: (id: string) => void
  /** Present when the list can be reordered (page order for PDF). */
  onDrop?: (id: string, el: HTMLElement) => void
  onNudge?: (id: string, delta: number) => void
}

export function FileCard({ item, index, total, currentKey, outputName, onRemove, onRetry, onDrop, onNudge }: FileCardProps) {
  const { t, i18n } = useTranslation()
  const ref = useRef<HTMLLIElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const [editing, setEditing] = useState(false)
  const edited = hasEdits(item.edits)
  const prevStatus = useRef(item.status)
  // Remember which src failed (e.g. HEIC preview in Chrome) so the converted result can still show.
  const [failedSrc, setFailedSrc] = useState<string>()
  const lang = i18n.resolvedLanguage
  const { status, result, error, inputFormat, file } = item

  // Progress bar: jump to each real step, then creep toward the next one (WASM gives no finer signal).
  useGSAP(
    () => {
      const reduce = prefersReducedMotion()
      const bar = ".fc-bar"
      const paw = ".fc-paw"
      // The bar scales; a little paw print rides its leading edge.
      const to = (p: number, vars: gsap.TweenVars, tl: gsap.core.Timeline) =>
        tl.to(bar, { scaleX: p, ...vars }).to(paw, { left: `${p * 100}%`, ...vars }, "<")
      if (status === "processing") {
        gsap.set(".fc-track", { opacity: 1 })
        const next = item.progress < 0.45 ? 0.42 : 0.93
        const tl = gsap.timeline()
        to(item.progress, { duration: reduce ? 0 : 0.3, ease: "power2.out" }, tl)
        to(next, { duration: reduce ? 0 : 4, ease: "power1.out" }, tl)
        if (!reduce && prevStatus.current !== "processing")
          gsap.to(paw, { rotation: 18, yoyo: true, repeat: -1, duration: 0.25, ease: "sine.inOut" })
      } else if (status === "done") {
        const tl = gsap.timeline()
        to(1, { duration: reduce ? 0 : 0.2 }, tl)
        tl.to(".fc-track", { opacity: 0, duration: 0.3, delay: 0.3 })
        gsap.killTweensOf(paw, "rotation")
      } else {
        gsap.set(bar, { scaleX: 0 })
        gsap.set(paw, { left: "0%" })
        gsap.set(".fc-track", { opacity: 0 })
        gsap.killTweensOf(paw, "rotation")
      }

      if (reduce || prevStatus.current === status) return
      if (status === "done") {
        gsap.from(".fc-check", { scale: 0, rotation: -90, duration: 0.5, ease: "back.out(3)" })
        gsap.fromTo(ref.current, { backgroundColor: "color-mix(in oklch, var(--brand) 18%, transparent)" }, { backgroundColor: "transparent", duration: 1.2, clearProps: "backgroundColor" })
      } else if (status === "error") {
        gsap.fromTo(ref.current, { x: 0 }, { keyframes: { x: [0, -8, 8, -5, 5, 0] }, duration: 0.45, ease: "none" })
      }
      prevStatus.current = status
    },
    { scope: ref, dependencies: [status, item.progress] },
  )

  // Drag the grip to reorder; the list works out the new slot on release.
  useGSAP(
    () => {
      if (!onDrop || !ref.current || !handleRef.current) return
      const el = ref.current
      Draggable.create(el, {
        type: "y",
        trigger: handleRef.current,
        zIndexBoost: true,
        onPress: () => {
          el.dataset.dragging = "true"
          if (!prefersReducedMotion()) gsap.to(el, { scale: 1.02, duration: 0.15 })
        },
        onRelease: () => {
          delete el.dataset.dragging
          gsap.to(el, { scale: 1, duration: 0.15 })
          onDrop(item.id, el)
        },
      })
    },
    { scope: ref, dependencies: [!!onDrop] },
  )

  const thumbSrc = result?.url ?? item.previewUrl
  const saveName = outputName || result?.name || file.name
  const stale = status === "done" && result?.settingsKey !== itemKey(currentKey, item)
  const outFormat = result ? (result.name.split(".").pop() ?? "") : ""
  const delta = result ? result.blob.size / file.size - 1 : 0

  const errorText = () => {
    if (!error) return ""
    if (error.code === "unsupported") return t("converter.errors.unsupported", { format: FORMAT_LABEL[inputFormat ?? "unknown"] })
    return t(`converter.errors.${error.code}`)
  }

  return (
    <li
      ref={ref}
      data-item-id={item.id}
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-3 pr-10 sm:gap-4 data-dragging:shadow-xl data-dragging:ring-2 data-dragging:ring-brand/40",
        onDrop && "pl-1.5",
        status === "error" && "border-destructive/40",
      )}
    >
      {onDrop && (
        <button
          ref={handleRef}
          type="button"
          aria-label={t("converter.pdf.reorder", { page: index + 1, total })}
          title={t("converter.pdf.reorderHint")}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && index > 0) {
              e.preventDefault()
              onNudge?.(item.id, -1)
            } else if (e.key === "ArrowDown" && index < total - 1) {
              e.preventDefault()
              onNudge?.(item.id, 1)
            }
          }}
          className="grid h-12 w-5 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      )}

      {/* thumbnail on a checkerboard so transparency is visible */}
      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[conic-gradient(var(--muted)_25%,transparent_0_50%,var(--muted)_0_75%,transparent_0)] bg-[length:12px_12px]">
        {failedSrc === thumbSrc ? (
          <span className="grid size-full place-items-center text-xs font-bold text-muted-foreground">
            {FORMAT_LABEL[inputFormat ?? "unknown"]}
          </span>
        ) : (
          <img
            src={thumbSrc}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailedSrc(thumbSrc)}
            className="size-full object-cover"
          />
        )}
        {status === "done" && (
          <span className="fc-check absolute right-0.5 bottom-0.5 grid size-5 place-items-center rounded-full bg-brand text-brand-foreground shadow">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-semibold" title={file.name}>
          {edited && (
            <Scissors className="size-3.5 shrink-0 text-brand" aria-label={t("editor.edited")} />
          )}
          <span className="truncate">{result ? saveName : file.name}</span>
        </p>
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-semibold">{FORMAT_LABEL[inputFormat ?? "unknown"]}</span>
          <span>{formatBytes(file.size, lang)}</span>
          {result && (
            <>
              <span aria-hidden>→</span>
              <span className="font-semibold text-foreground">{outFormat.toUpperCase()}</span>
              <span className="text-foreground">{formatBytes(result.blob.size, lang)}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-px font-semibold",
                  delta <= 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                )}
              >
                {delta <= 0 ? "−" : "+"}
                {Math.abs(Math.round(delta * 100))}%
              </span>
              <span className="hidden sm:inline">
                · {result.width}×{result.height}
              </span>
            </>
          )}
        </p>
        {status === "error" && (
          <p className="flex items-center gap-1 text-xs font-medium text-destructive">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden />
            {errorText()}
          </p>
        )}
        {status === "done" && result?.fit && (
          <p
            className={cn(
              "text-xs font-medium",
              result.fit.reached ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400",
            )}
          >
            {result.fit.reached
              ? t("converter.target.reached", { target: kbLabel(result.fit.targetBytes / 1000) }) +
                (result.fit.quality !== null ? t("converter.target.quality", { q: result.fit.quality }) : "")
              : t("converter.target.missed", {
                  target: kbLabel(result.fit.targetBytes / 1000),
                  size: formatBytes(result.blob.size, lang),
                })}
          </p>
        )}
        {status === "done" && inputFormat === "gif" && (
          <p className="text-xs text-muted-foreground">{t("converter.notes.gifFirstFrame")}</p>
        )}
        {stale && <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{t("converter.status.stale")}</p>}
      </div>

      <div className="flex shrink-0 items-center">
        {status === "queued" && <span className="text-xs text-muted-foreground">{t("converter.status.queued")}</span>}
        {status === "processing" && (
          <span className="text-xs font-medium text-muted-foreground">{t("converter.status.processing")}</span>
        )}
        {status !== "processing" && error?.code !== "unsupported" && error?.code !== "decode" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            aria-label={t("editor.open", { name: file.name })}
            title={t("editor.title")}
            className="mr-1 active:scale-95"
          >
            <Crop aria-hidden />
          </Button>
        )}
        {status === "done" && result && canShareFiles() && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => shareWithCat([blobToFile(result.blob, saveName)])}
            aria-label={t("share.shareFile", { name: saveName })}
            className="mr-1.5 active:scale-95"
          >
            <Share2 aria-hidden />
            <span className="hidden sm:inline">{t("share.button")}</span>
          </Button>
        )}
        {status === "done" && result && (
          <Button
            size="sm"
            onClick={() => downloadUrl(result.url, saveName)}
            aria-label={`${t("converter.actions.download")} ${saveName}`}
            className="active:scale-95"
          >
            <Download aria-hidden />
            <span className="hidden sm:inline">{t("converter.actions.download")}</span>
          </Button>
        )}
        {status === "error" && error?.code !== "unsupported" && (
          <Button size="sm" variant="outline" onClick={() => onRetry(item.id)} aria-label={t("converter.actions.retry")}>
            <RotateCcw aria-hidden />
            <span className="hidden sm:inline">{t("converter.actions.retry")}</span>
          </Button>
        )}
      </div>

      <button
        type="button"
        onClick={() => ref.current && onRemove(item.id, ref.current)}
        aria-label={t("converter.actions.remove")}
        disabled={status === "processing"}
        className="absolute top-2 right-2 grid size-7 place-items-center rounded-full text-muted-foreground transition-[background-color,color,scale] hover:bg-muted hover:text-foreground active:scale-90 disabled:opacity-30"
      >
        <X className="size-4" aria-hidden />
      </button>

      {/* progress */}
      <div className="fc-track pointer-events-none absolute inset-x-0 bottom-0 h-1 opacity-0">
        <div className="fc-bar h-full origin-left scale-x-0 bg-brand" />
        <svg className="fc-paw absolute bottom-1 left-0 size-3 -translate-x-1/2 text-brand" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <ellipse cx="12" cy="15.5" rx="5.5" ry="4.5" />
          <circle cx="5.5" cy="10" r="2.3" />
          <circle cx="9.5" cy="6" r="2.3" />
          <circle cx="14.5" cy="6" r="2.3" />
          <circle cx="18.5" cy="10" r="2.3" />
        </svg>
      </div>
      {editing && (
        <Suspense fallback={null}>
          <EditorDialog item={item} open={editing} onOpenChange={setEditing} />
        </Suspense>
      )}
    </li>
  )
}
