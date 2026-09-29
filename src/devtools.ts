import { useConverterStore } from "@/features/converter/store"
import { useCatStore } from "@/features/mascot/catStore"
import { useQrStore } from "@/features/qr/store"
import { useThemeStore } from "@/stores/theme"

/** Dev-only handle on the live stores for poking at the app from the console. */
const stores = { cat: useCatStore, qr: useQrStore, converter: useConverterStore, theme: useThemeStore }

declare global {
  interface Window {
    __meoden?: typeof stores
  }
}

window.__meoden = stores
