import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { CAT_MOODS, useCatStore } from "./catStore"

/** Dev-only panel to preview every mood. */
export function MoodPlayground() {
  const { t } = useTranslation()
  const mood = useCatStore((s) => s.mood)
  const setMood = useCatStore((s) => s.setMood)

  return (
    <div className="rounded-2xl border bg-card/80 p-3 text-center">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("cat.playground")}</p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {CAT_MOODS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMood(m)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-[background-color,scale] active:scale-90",
              m === mood ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent",
            )}
          >
            {t(`cat.moods.${m}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
