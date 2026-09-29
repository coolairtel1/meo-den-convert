import { Languages } from "lucide-react"
import { useTranslation } from "react-i18next"
import { FlipText } from "@/components/motion/FlipText"

export function LangToggle() {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage === "en" ? "en" : "vi"
  const next = current === "vi" ? "en" : "vi"

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      title={t("lang.toggle")}
      aria-label={t("lang.toggle")}
      className="flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-[background-color,scale] hover:bg-muted active:scale-90"
    >
      <Languages className="size-4" aria-hidden />
      <FlipText text={current.toUpperCase()} />
    </button>
  )
}
