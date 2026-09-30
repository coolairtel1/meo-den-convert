import { FileText, Loader2 } from "lucide-react"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { SegmentedControl } from "@/components/motion/SegmentedControl"
import { Button } from "@/components/ui/button"
import { useCatStore } from "@/features/mascot/catStore"
import { downloadUrl } from "@/lib/download"
import { formatBytes } from "@/lib/format"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap"
import type { Orientation, PageSize } from "@/lib/pdf"
import { makePdf, pdfEligible } from "./makePdf"
import { useConverterStore, type PdfQuality } from "./store"

/** Options + "Create PDF" for combining the current list (in its order) into one document. */
export function PdfPanel() {
  const { t, i18n } = useTranslation()
  const items = useConverterStore((s) => s.items)
  const pdf = useConverterStore((s) => s.settings.pdf)
  const setPdf = useConverterStore((s) => s.setPdf)
  const busyConverting = useConverterStore((s) => s.busy)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [last, setLast] = useState<{ pages: number; size: number; failed: string[] } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const pages = items.filter(pdfEligible)

  useGSAP(
    () => {
      if (!prefersReducedMotion()) gsap.from(ref.current, { height: 0, opacity: 0, duration: 0.35, ease: "power2.out", clearProps: "height" })
    },
    { scope: ref },
  )

  const create = async () => {
    const { setMood, setProgress: setCatProgress, say } = useCatStore.getState()
    setBusy(true)
    setLast(null)
    setProgress(0)
    setMood("working")
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")
      const name = `meoden-${stamp}`
      const res = await makePdf(pages, pdf, name, (p) => {
        setProgress(p)
        setCatProgress(p)
      })
      const url = URL.createObjectURL(res.blob)
      downloadUrl(url, `${name}.pdf`)
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setLast({ pages: res.pages, size: res.blob.size, failed: res.failed })
      setMood(res.failed.length ? "error" : "success")
      say(t("converter.pdf.done", { count: res.pages }))
    } catch {
      setMood("error")
      say(t("converter.pdf.failed"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={ref} className="space-y-4 overflow-hidden rounded-2xl border border-brand/40 bg-brand/5 p-4">
      <p className="text-xs text-muted-foreground">{t("converter.pdf.orderHint")}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("converter.pdf.pageSize")}>
          <SegmentedControl<PageSize>
            label={t("converter.pdf.pageSize")}
            value={pdf.pageSize}
            disabled={busy}
            onChange={(pageSize) => setPdf({ pageSize })}
            options={[
              { value: "a4", label: "A4" },
              { value: "letter", label: "Letter" },
              { value: "fit", label: t("converter.pdf.fit") },
            ]}
          />
        </Field>
        <Field label={t("converter.pdf.orientation")}>
          <SegmentedControl<Orientation>
            label={t("converter.pdf.orientation")}
            value={pdf.orientation}
            disabled={busy || pdf.pageSize === "fit"}
            onChange={(orientation) => setPdf({ orientation })}
            options={[
              { value: "auto", label: t("converter.pdf.auto") },
              { value: "portrait", label: t("converter.pdf.portrait") },
              { value: "landscape", label: t("converter.pdf.landscape") },
            ]}
          />
        </Field>
        <Field label={t("converter.pdf.margin")}>
          <SegmentedControl
            label={t("converter.pdf.margin")}
            value={String(pdf.marginMm)}
            disabled={busy}
            onChange={(v) => setPdf({ marginMm: Number(v) })}
            options={[0, 10, 20].map((m) => ({ value: String(m), label: m ? `${m} mm` : t("converter.pdf.noMargin") }))}
          />
        </Field>
        <Field label={t("converter.pdf.quality")} hint={t(`converter.pdf.qualityHint_${pdf.quality}`)}>
          <SegmentedControl<PdfQuality>
            label={t("converter.pdf.quality")}
            value={pdf.quality}
            disabled={busy}
            onChange={(quality) => setPdf({ quality })}
            options={[
              { value: "high", label: t("converter.pdf.high") },
              { value: "medium", label: t("converter.pdf.medium") },
              { value: "small", label: t("converter.pdf.small") },
            ]}
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={create} disabled={busy || busyConverting || pages.length === 0} className="active:scale-95">
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <FileText aria-hidden />}
          {busy ? t("converter.pdf.creating") : t("converter.pdf.create", { count: pages.length })}
        </Button>
        {busy && (
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)}>
            <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
        )}
        {last && !busy && (
          <p role="status" className="text-sm text-muted-foreground">
            {t("converter.pdf.summary", { count: last.pages, size: formatBytes(last.size, i18n.resolvedLanguage) })}
          </p>
        )}
      </div>
      {last?.failed.length ? (
        <p className="text-xs text-destructive">{t("converter.pdf.skipped", { files: last.failed.join(", ") })}</p>
      ) : null}
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
