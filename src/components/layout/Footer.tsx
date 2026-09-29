import { ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { InstallButton } from "@/features/pwa/InstallButton"

export function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
      <p className="flex items-center gap-1.5">
        <ShieldCheck className="size-4 text-brand" aria-hidden />
        {t("footer.privacy")}
      </p>
      <div className="flex items-center gap-3">
        <InstallButton />
        <p>{t("footer.made")}</p>
      </div>
    </footer>
  )
}
