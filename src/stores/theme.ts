import { create } from "zustand"
import { persist } from "zustand/middleware"

export type ThemeMode = "light" | "dark" | "system"

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)")

export const resolveTheme = (mode: ThemeMode): "light" | "dark" =>
  mode === "system" ? (darkQuery.matches ? "dark" : "light") : mode

interface ThemeState {
  mode: ThemeMode
  resolved: "light" | "dark"
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system",
      resolved: resolveTheme("system"),
      setMode: (mode) => set({ mode, resolved: resolveTheme(mode) }),
    }),
    {
      name: "meoden.theme",
      partialize: (s) => ({ mode: s.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) state.resolved = resolveTheme(state.mode)
      },
    },
  ),
)

// Follow the OS setting while in "system" mode.
darkQuery.addEventListener("change", () => {
  const { mode } = useThemeStore.getState()
  if (mode === "system") useThemeStore.setState({ resolved: resolveTheme(mode) })
})

export const applyThemeClass = (resolved: "light" | "dark") => {
  document.documentElement.classList.toggle("dark", resolved === "dark")
  document.documentElement.style.colorScheme = resolved
}
