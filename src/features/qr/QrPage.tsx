import { PenLine } from "lucide-react"
import { useDeferredValue } from "react"
import { useTranslation } from "react-i18next"
import { buildPayload } from "@/lib/qr/content"
import { ContentForm } from "./ContentForm"
import { QrPreview } from "./QrPreview"
import { StyleEditor } from "./StyleEditor"
import { useQrStore } from "./store"

export function QrPage() {
  const { t } = useTranslation()
  const kind = useQrStore((s) => s.kind)
  const fields = useQrStore((s) => s.fields)
  const style = useQrStore((s) => s.style)
  // Keep typing and colour dragging snappy; the preview catches up a frame later.
  const payload = useDeferredValue(buildPayload(kind, fields[kind]))
  const deferredStyle = useDeferredValue(style)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{t("qr.title")}</h1>
        <p className="text-muted-foreground">{t("qr.subtitle")}</p>
      </div>

      {/* Mobile: content → preview → style. Desktop: preview sticks on the right. */}
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px] md:items-start">
        <section className="space-y-3" aria-labelledby="qr-content-heading">
          <h2 id="qr-content-heading" className="flex items-center gap-2 text-lg font-semibold">
            <PenLine className="size-4 text-brand" aria-hidden />
            {t("qr.sections.content")}
          </h2>
          <ContentForm />
        </section>

        <aside className="md:sticky md:top-24 md:row-span-2">
          <QrPreview payload={payload} style={deferredStyle} />
        </aside>

        <StyleEditor />
      </div>
    </div>
  )
}
