import { Download } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/** "Install app" link, shown only where the browser offers installation (Chromium). */
export function InstallButton() {
  const { t } = useTranslation()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (!deferred) return null
  return (
    <button
      type="button"
      onClick={async () => {
        await deferred.prompt()
        await deferred.userChoice
        setDeferred(null)
      }}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold text-foreground transition-[background-color,scale] hover:bg-muted active:scale-95"
    >
      <Download className="size-3.5" aria-hidden />
      {t("pwa.install")}
    </button>
  )
}
