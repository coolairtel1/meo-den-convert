import QRCodeStyling from "qr-code-styling"
import { AlertTriangle, CheckCircle2, ClipboardCopy, Download, Loader2, ScanLine, Share2, XCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { SegmentedControl } from "@/components/motion/SegmentedControl"
import { useMagnetic } from "@/components/motion/useMagnetic"
import { Button } from "@/components/ui/button"
import { useCatStore } from "@/features/mascot/catStore"
import { shareWithCat } from "@/features/share/shareWithCat"
import { downloadUrl } from "@/lib/download"
import { blobToFile, canShareFiles } from "@/lib/share"
import { blobToDataUrl } from "@/lib/image"
import { gsap, prefersReducedMotion } from "@/lib/motion/gsap"
import { contrastIssue } from "@/lib/qr/contrast"
import { isOverflowError, renderQrBlob, type ExportFormat } from "@/lib/qr/render"
import { verifyScan, type ScanResult } from "@/lib/qr/scan"
import { foregroundColors, toQrOptions, type QrStyle } from "@/lib/qr/style"
import { cn } from "@/lib/utils"
import { useQrStore } from "./store"

const PREVIEW_SIZE = 512
const PLACEHOLDER = "https://meoden.app"
const SIZES = [512, 1024, 2048]
const SCAN_SIZES = [480, 960]
const EXT: Record<ExportFormat, string> = { png: "png", jpeg: "jpg", webp: "webp", svg: "svg" }

type ScanState = ScanResult | "checking" | "idle"

export function QrPreview({ payload, style }: { payload: string; style: QrStyle }) {
  const { t } = useTranslation()
  const kind = useQrStore((s) => s.kind)
  const exportFormat = useQrStore((s) => s.exportFormat)
  const exportSize = useQrStore((s) => s.exportSize)
  const setExport = useQrStore((s) => s.setExport)
  const { present, say } = useCatStore.getState()

  const boxRef = useRef<HTMLDivElement>(null)
  const downloadRef = useMagnetic<HTMLButtonElement>(0.2)
  const qrRef = useRef<QRCodeStyling | null>(null)
  const [overflow, setOverflow] = useState(false)
  const [scan, setScan] = useState<ScanState>("idle")
  const [busy, setBusy] = useState<"download" | "copy" | "share" | null>(null)
  /** Last rendered share file, so a retry after Safari's "needs a tap" error shares instantly. */
  const shareCache = useRef<{ key: string; file: File } | null>(null)
  const empty = payload === ""

  // Live preview: one SVG instance, updated in place.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const opts = toQrOptions(style, empty ? PLACEHOLDER : payload, PREVIEW_SIZE)
    try {
      if (!qrRef.current) {
        qrRef.current = new QRCodeStyling({ ...opts, type: "svg" })
        qrRef.current.append(box)
      } else {
        qrRef.current.update(opts)
      }
      setOverflow(false)
    } catch (e) {
      if (isOverflowError(e)) setOverflow(true)
      else throw e
    }
  }, [payload, style, empty])

  // A little pulse when the content (not just a colour) changes.
  useEffect(() => {
    if (empty || prefersReducedMotion() || !boxRef.current) return
    gsap.fromTo(boxRef.current, { scale: 0.96 }, { scale: 1, duration: 0.35, ease: "back.out(2.5)", overwrite: true })
  }, [payload, empty])

  // Debounced "phone test": render, decode with jsQR, compare bytes.
  useEffect(() => {
    if (empty || overflow) {
      setScan("idle")
      return
    }
    setScan("checking")
    let cancelled = false
    const id = window.setTimeout(async () => {
      try {
        // jsQR struggles with small round dots that phone cameras read fine, so retry larger before warning.
        let result: ScanResult = "unreadable"
        for (const size of SCAN_SIZES) {
          result = await verifyScan(await renderQrBlob(style, payload, size, "png"), payload)
          if (result !== "unreadable" || cancelled) break
        }
        if (!cancelled) setScan(result)
      } catch {
        if (!cancelled) setScan("unreadable")
      }
    }, 450)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
  }, [payload, style, empty, overflow])

  const contrast = style.bgTransparent ? null : contrastIssue(foregroundColors(style), style.bgColor)
  const canExport = !empty && !overflow && !busy

  const showOff = async () => {
    // The cat holds up a small copy of the code.
    const thumb = await renderQrBlob({ ...style, bgTransparent: false }, payload, 256, "png")
    present(await blobToDataUrl(thumb))
  }

  const onDownload = async () => {
    setBusy("download")
    try {
      const blob = await renderQrBlob(style, payload, exportSize, exportFormat)
      const url = URL.createObjectURL(blob)
      downloadUrl(url, `meoden-qr-${kind}.${EXT[exportFormat]}`)
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
      await showOff()
    } finally {
      setBusy(null)
    }
  }

  const onShare = async () => {
    const key = JSON.stringify([payload, style, exportSize, exportFormat, kind])
    setBusy("share")
    try {
      let file = shareCache.current?.key === key ? shareCache.current.file : null
      if (!file) {
        const blob = await renderQrBlob(style, payload, exportSize, exportFormat)
        file = blobToFile(blob, `meoden-qr-${kind}.${EXT[exportFormat]}`)
        shareCache.current = { key, file }
      }
      if ((await shareWithCat([file])) === "shared") await showOff()
    } finally {
      setBusy(null)
    }
  }

  const onCopy = async () => {
    setBusy("copy")
    try {
      // Safari needs the ClipboardItem created synchronously inside the click, with a promised blob.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": renderQrBlob(style, payload, exportSize, "png") })])
      say(t("qr.export.copied"))
      await showOff()
    } catch {
      say(t("qr.export.copyFail"))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square w-full max-w-72 overflow-hidden rounded-2xl border bg-[conic-gradient(var(--muted)_25%,transparent_0_50%,var(--muted)_0_75%,transparent_0)] bg-[length:16px_16px] shadow-sm">
        <div
          ref={boxRef}
          role="img"
          aria-label={empty ? t("qr.preview.empty") : t("qr.preview.label")}
          className={cn(
            "size-full transition-[opacity,filter] duration-300 [&_svg]:size-full",
            (empty || overflow) && "opacity-15 blur-[1px]",
          )}
        />
        {(empty || overflow) && (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm font-semibold text-balance">
            {overflow ? t("qr.preview.overflow") : t("qr.preview.empty")}
          </p>
        )}
      </div>

      <ScanBadge scan={scan} />
      {contrast && !empty && (
        <p className="flex items-start gap-1.5 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
          {t(contrast === "low" ? "qr.preview.lowContrast" : "qr.preview.inverted")}
        </p>
      )}

      <div className="space-y-3 rounded-2xl border bg-background/60 p-3">
        <SegmentedControl<ExportFormat>
          label={t("qr.export.format")}
          value={exportFormat}
          onChange={(f) => setExport({ exportFormat: f })}
          options={[
            { value: "png", label: "PNG" },
            { value: "jpeg", label: "JPG" },
            { value: "webp", label: "WebP" },
            { value: "svg", label: "SVG" },
          ]}
        />
        {exportFormat === "svg" ? (
          <p className="px-1 text-xs text-muted-foreground">{t("qr.export.svgHint")}</p>
        ) : (
          <SegmentedControl
            label={t("qr.export.size")}
            value={String(exportSize)}
            onChange={(v) => setExport({ exportSize: Number(v) })}
            options={SIZES.map((s) => ({ value: String(s), label: `${s}px` }))}
          />
        )}
        <div className="flex gap-2">
          <Button ref={downloadRef} size="lg" className="flex-1 active:scale-95" disabled={!canExport} onClick={onDownload}>
            {busy === "download" ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
            {t("qr.export.download")}
          </Button>
          {canShareFiles() && (
            <Button
              size="lg"
              variant="outline"
              disabled={!canExport}
              onClick={onShare}
              aria-label={t("share.button")}
              title={t("share.button")}
              className="active:scale-95"
            >
              {busy === "share" ? <Loader2 className="animate-spin" aria-hidden /> : <Share2 aria-hidden />}
            </Button>
          )}
          {"ClipboardItem" in window && (
            <Button
              size="lg"
              variant="outline"
              disabled={!canExport}
              onClick={onCopy}
              aria-label={t("qr.export.copy")}
              title={t("qr.export.copy")}
              className="active:scale-95"
            >
              {busy === "copy" ? <Loader2 className="animate-spin" aria-hidden /> : <ClipboardCopy aria-hidden />}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function ScanBadge({ scan }: { scan: ScanState }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (scan === "ok" && ref.current && !prefersReducedMotion())
      gsap.fromTo(ref.current.querySelector("svg"), { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: 0.45, ease: "back.out(3)" })
  }, [scan])

  if (scan === "idle") return null
  const look = {
    checking: { Icon: Loader2, cls: "text-muted-foreground", spin: true },
    ok: { Icon: CheckCircle2, cls: "text-emerald-700 dark:text-emerald-400", spin: false },
    mismatch: { Icon: XCircle, cls: "text-destructive", spin: false },
    unreadable: { Icon: AlertTriangle, cls: "text-amber-700 dark:text-amber-400", spin: false },
  }[scan]

  return (
    <p ref={ref} role="status" className={cn("flex items-center justify-center gap-1.5 text-xs font-semibold", look.cls)}>
      <ScanLine className="size-3.5 opacity-60" aria-hidden />
      <look.Icon className={cn("size-3.5", look.spin && "animate-spin")} aria-hidden />
      {t(`qr.preview.${scan}`)}
    </p>
  )
}
