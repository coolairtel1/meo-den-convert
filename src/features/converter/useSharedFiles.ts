import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useCatStore } from "@/features/mascot/catStore"
import { useNavStore } from "@/stores/nav"
import { FILENAME_HEADER, SHARE_CACHE, SHARE_FLAG } from "@/sw/shared"
import { useConverterStore } from "./store"

let handled = false

/**
 * Android share target: the service worker parks shared images in Cache Storage and opens
 * the app with ?shared=N. Pick them up once, add them to the converter, then clean up.
 */
export function useSharedFiles() {
  const { t } = useTranslation()

  useEffect(() => {
    const url = new URL(window.location.href)
    if (handled || !url.searchParams.has(SHARE_FLAG)) return
    handled = true
    url.searchParams.delete(SHARE_FLAG)
    window.history.replaceState(null, "", url.pathname + url.search + url.hash)

    void (async () => {
      const files: File[] = []
      try {
        const cache = await caches.open(SHARE_CACHE)
        const index = (r: Request) => Number(r.url.split("/").pop())
        const keys = [...(await cache.keys())].sort((a, b) => index(a) - index(b))
        for (const key of keys) {
          const res = await cache.match(key)
          if (!res) continue
          const blob = await res.blob()
          const name = decodeURIComponent(res.headers.get(FILENAME_HEADER) ?? "image")
          files.push(new File([blob], name, { type: blob.type }))
        }
        await caches.delete(SHARE_CACHE)
      } catch {
        // Cache Storage unavailable: nothing to pick up.
      }
      const { say } = useCatStore.getState()
      if (files.length) {
        useNavStore.getState().setTab("convert")
        useConverterStore.getState().addFiles(files)
        say(t("share.received", { count: files.length }))
      } else {
        say(t("share.receivedNone"))
      }
    })()
  }, [t])
}
