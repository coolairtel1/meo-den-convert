import { ImageIcon, QrCode } from "lucide-react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { FlipText } from "@/components/motion/FlipText"
import { useSlidingPill } from "@/components/motion/useSlidingPill"
import { cn } from "@/lib/utils"
import { TABS, useNavStore, type Tab } from "@/stores/nav"

const ICONS: Record<Tab, typeof ImageIcon> = { convert: ImageIcon, qr: QrCode }

export function NavTabs() {
  const { t, i18n } = useTranslation()
  const tab = useNavStore((s) => s.tab)
  const setTab = useNavStore((s) => s.setTab)
  const listRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)

  useSlidingPill(listRef, pillRef, tab, i18n.resolvedLanguage)

  return (
    <div ref={listRef} role="tablist" className="relative flex rounded-full bg-muted p-1">
      <span ref={pillRef} aria-hidden className="absolute top-1 bottom-1 left-0 rounded-full bg-card shadow-sm" />
      {TABS.map((id) => {
        const Icon = ICONS[id]
        const active = id === tab
        return (
          <button
            key={id}
            data-pill-key={id}
            role="tab"
            aria-selected={active}
            onClick={() => setTab(id)}
            className={cn(
              "relative z-10 flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-[color,scale] active:scale-95 sm:px-4",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            <FlipText text={t(`nav.${id}`)} />
          </button>
        )
      })}
    </div>
  )
}
