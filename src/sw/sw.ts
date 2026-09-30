/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core"
import { ExpirationPlugin } from "workbox-expiration"
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching"
import { NavigationRoute, registerRoute } from "workbox-routing"
import { CacheFirst } from "workbox-strategies"
import { FILENAME_HEADER, SHARE_ACTION, SHARE_CACHE, SHARE_FLAG } from "./shared"

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | { url: string; revision: string | null })[] }

// Android share sheet → "Mèo Đen Convert": the OS POSTs the images here (manifest share_target).
// Registered first so it runs before Workbox's routing (which only handles GET anyway).
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)
  if (event.request.method === "POST" && url.pathname.endsWith(`/${SHARE_ACTION}`)) {
    event.respondWith(receiveShare(event.request))
  }
})

async function receiveShare(request: Request): Promise<Response> {
  const app = new URL("./", self.registration.scope)
  try {
    const form = await request.formData()
    const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0)
    // Park the files in Cache Storage; the app picks them up on load and clears the cache.
    await caches.delete(SHARE_CACHE)
    const cache = await caches.open(SHARE_CACHE)
    await Promise.all(
      files.map((file, i) =>
        cache.put(
          new Request(new URL(`__shared__/${i}`, self.registration.scope)),
          new Response(file, {
            headers: {
              "content-type": file.type || "application/octet-stream",
              [FILENAME_HEADER]: encodeURIComponent(file.name || `image-${i + 1}`),
            },
          }),
        ),
      ),
    )
    app.searchParams.set(SHARE_FLAG, String(files.length))
  } catch {
    app.searchParams.set(SHARE_FLAG, "0")
  }
  app.hash = "/convert"
  return Response.redirect(app.href, 303)
}

// Same behaviour the generated worker had: precache the app, SPA fallback, lazy caches.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")))
// The AVIF encoder (2 × 3.5 MB) and rarely used font subsets are cached on first use instead of precached.
registerRoute(
  ({ url }) => /\/assets\/(avif_enc|.*-(cyrillic|greek|devanagari))/.test(url.pathname),
  new CacheFirst({ cacheName: "meoden-lazy-assets", plugins: [new ExpirationPlugin({ maxEntries: 20 })] }),
)

// Control the page on the very first visit; later updates wait for the in-app "Update" prompt.
clientsClaim()
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting()
})
