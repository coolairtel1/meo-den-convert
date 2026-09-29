import { useCallback } from "react"
import { useTranslation } from "react-i18next"

export type LineKey = "dragover" | "working" | "success" | "error" | "wake" | "pet" | "easterEgg" | "present"

/** Picks a random localized line for the cat to say. */
export function useCatLines() {
  const { t } = useTranslation()
  return useCallback(
    (key: LineKey) => {
      const lines = t(`cat.lines.${key}`, { returnObjects: true }) as unknown
      if (!Array.isArray(lines) || !lines.length) return ""
      return String(lines[Math.floor(Math.random() * lines.length)])
    },
    [t],
  )
}
