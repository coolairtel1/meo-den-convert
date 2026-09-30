import { CloudOff, RefreshCw, WifiOff, X } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useRegisterSW } from "virtual:pwa-register/react"
import { Button } from "@/components/ui/button"
import { useCatStore } from "@/features/mascot/catStore"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap"

/** Service-worker lifecycle (offline ready / update available) and connectivity, as small toasts. */
export function PwaToasts() {
  const { t } = useTranslation()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  const online = useOnline()

  useEffect(() => {
    if (!offlineReady) return
    const id = window.setTimeout(() => setOfflineReady(false), 5000)
    return () => window.clearTimeout(id)
  }, [offlineReady, setOfflineReady])

  // The cat comments when the connection drops: everything keeps working locally.
  useEffect(() => {
    if (!online) useCatStore.getState().say(t("pwa.offlineCat"))
  }, [online, t])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {needRefresh && (
        <Toast icon={<RefreshCw className="size-4 text-brand" aria-hidden />} onClose={() => setNeedRefresh(false)}>
          <span className="flex-1">{t("pwa.update")}</span>
          <Button
            size="sm"
            onClick={() => {
              // The plugin only reloads when this page load started under a service worker; on a
              // first visit the new worker takes over silently, so reload on the switch ourselves.
              navigator.serviceWorker?.addEventListener("controllerchange", () => window.location.reload(), { once: true })
              void updateServiceWorker(true)
            }}
          >
            {t("pwa.reload")}
          </Button>
        </Toast>
      )}
      {offlineReady && (
        <Toast icon={<CloudOff className="size-4 text-brand" aria-hidden />} onClose={() => setOfflineReady(false)}>
          <span className="flex-1">{t("pwa.offlineReady")}</span>
        </Toast>
      )}
      {!online && (
        <Toast icon={<WifiOff className="size-4 text-brand" aria-hidden />}>
          <span className="flex-1">{t("pwa.offline")}</span>
        </Toast>
      )}
    </div>
  )
}

function Toast({ icon, children, onClose }: { icon: ReactNode; children: ReactNode; onClose?: () => void }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    if (!prefersReducedMotion()) gsap.from(ref.current, { y: 24, opacity: 0, scale: 0.95, duration: 0.45, ease: "back.out(2)" })
  })
  return (
    <div
      ref={ref}
      role="status"
      className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm font-medium text-card-foreground shadow-lg"
    >
      {icon}
      {children}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label={t("pwa.dismiss")}
          className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  )
}

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])
  return online
}
