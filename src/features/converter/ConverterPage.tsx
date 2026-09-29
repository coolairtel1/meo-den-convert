import { FileArchive, Loader2, PawPrint, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useMagnetic } from "@/components/motion/useMagnetic"
import { Button } from "@/components/ui/button"
import { useCatStore } from "@/features/mascot/catStore"
import { downloadUrl } from "@/lib/download"
import { formatBytes } from "@/lib/format"
import { zipFiles } from "@/lib/zip"
import { gsap, prefersReducedMotion } from "@/lib/motion/gsap"
import { Dropzone } from "./Dropzone"
import { FileList } from "./FileList"
import { SettingsPanel } from "./SettingsPanel"
import { needsConversion, settingsKey, useConverterStore } from "./store"

const FORMATS = ["HEIC", "JPG", "PNG", "WebP", "AVIF", "GIF", "BMP", "TIFF", "ICO", "SVG"]

export function ConverterPage() {
  const { t, i18n } = useTranslation()
  const items = useConverterStore((s) => s.items)
  const settings = useConverterStore((s) => s.settings)
  const busy = useConverterStore((s) => s.busy)
  const addFiles = useConverterStore((s) => s.addFiles)
  const convertAll = useConverterStore((s) => s.convertAll)
  const clear = useConverterStore((s) => s.clear)
  const listWrapRef = useRef<HTMLDivElement>(null)
  const [zipping, setZipping] = useState(false)
  const convertRef = useMagnetic<HTMLButtonElement>()

  const key = settingsKey(settings)
  const pending = items.filter((it) => needsConversion(it, key)).length
  const done = items.filter((it) => it.status === "done")
  const saved = done.reduce((sum, it) => sum + it.file.size - (it.result?.blob.size ?? 0), 0)

  // Paste images straight from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/") || /\.hei[cf]$/i.test(f.name))
      if (files.length) addFiles(files)
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [addFiles])

  const onZip = async () => {
    setZipping(true)
    try {
      const zip = await zipFiles(done.map((it) => ({ name: it.result!.name, blob: it.result!.blob })))
      const url = URL.createObjectURL(zip)
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")
      downloadUrl(url, `meoden-convert-${stamp}.zip`)
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
      useCatStore.getState().say(t("converter.zip.done", { count: done.length }))
    } finally {
      setZipping(false)
    }
  }

  const onClear = () => {
    const cards = listWrapRef.current?.querySelectorAll("[data-item-id]")
    if (!cards?.length || prefersReducedMotion()) return clear()
    gsap.to(cards, { opacity: 0, y: 12, scale: 0.97, duration: 0.2, stagger: 0.03, ease: "power2.in", onComplete: clear })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{t("converter.title")}</h1>
        <p className="text-muted-foreground">{t("converter.subtitle")}</p>
      </div>

      <Dropzone onFiles={addFiles} compact={items.length > 0} />

      <SettingsPanel />

      {items.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {FORMATS.map((f) => (
            <span key={f} className="rounded-full border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              {f}
            </span>
          ))}
        </div>
      ) : (
        <div ref={listWrapRef} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {t("converter.summary.progress", { done: done.length, total: items.length })}
              </span>
              {done.length > 0 && saved !== 0 && (
                <>
                  {" · "}
                  {saved > 0
                    ? t("converter.summary.saved", { size: formatBytes(saved, i18n.resolvedLanguage) })
                    : t("converter.summary.grew", { size: formatBytes(-saved, i18n.resolvedLanguage) })}
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {done.length >= 2 && (
                <Button variant="outline" onClick={onZip} disabled={busy || zipping} className="active:scale-95">
                  {zipping ? <Loader2 className="animate-spin" aria-hidden /> : <FileArchive aria-hidden />}
                  {t("converter.zip.button", { count: done.length })}
                </Button>
              )}
              <Button variant="ghost" onClick={onClear} disabled={busy}>
                <Trash2 aria-hidden />
                {t("converter.actions.clear")}
              </Button>
              <Button ref={convertRef} size="lg" onClick={convertAll} disabled={busy || pending === 0} className="px-4 active:scale-95">
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : <PawPrint aria-hidden />}
                {busy
                  ? t("converter.actions.converting")
                  : pending === 0
                    ? t("converter.actions.allDone")
                    : t("converter.actions.convertCount", { count: pending })}
              </Button>
            </div>
          </div>
          <FileList items={items} currentKey={key} />
        </div>
      )}
    </div>
  )
}
