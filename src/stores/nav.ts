import { create } from "zustand"

export const TABS = ["convert", "qr"] as const
export type Tab = (typeof TABS)[number]

const tabFromHash = (): Tab => {
  const h = window.location.hash.replace(/^#\/?/, "")
  return (TABS as readonly string[]).includes(h) ? (h as Tab) : "convert"
}

interface NavState {
  tab: Tab
  setTab: (tab: Tab) => void
}

// Hash-based so the static build works from any host or file path.
export const useNavStore = create<NavState>((set) => ({
  tab: tabFromHash(),
  setTab: (tab) => {
    window.location.hash = `/${tab}`
    set({ tab })
  },
}))

window.addEventListener("hashchange", () => useNavStore.setState({ tab: tabFromHash() }))
