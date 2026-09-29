import { ImagePlus } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useCatStore } from "@/features/mascot/catStore"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap"
import { cn } from "@/lib/utils"

const ACCEPT = "image/*,.heic,.heif,.avif,.ico,.tif,.tiff,.svg"

interface DropzoneProps {
  onFiles: (files: File[]) => void
  compact?: boolean
  disabled?: boolean
}

export function Dropzone({ onFiles, compact, disabled }: DropzoneProps) {
  const { t } = useTranslation()
  const setMood = useCatStore((s) => s.setMood)
  const [over, setOver] = useState(false)
  const depth = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // Stop the browser from opening files dropped outside the zone.
  useEffect(() => {
    const block = (e: DragEvent) => e.preventDefault()
    window.addEventListener("dragover", block)
    window.addEventListener("drop", block)
    return () => {
      window.removeEventListener("dragover", block)
      window.removeEventListener("drop", block)
    }
  }, [])

  // Icon bobs while something hovers the zone.
  useGSAP(
    () => {
      if (!over || prefersReducedMotion()) return
      gsap.to(".dz-icon", { y: -6, rotation: -8, duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: -1 })
    },
    { scope: rootRef, dependencies: [over], revertOnUpdate: true },
  )

  const reset = () => {
    depth.current = 0
    setOver(false)
    if (useCatStore.getState().mood === "dragover") setMood("idle")
  }

  const take = (list: FileList | null) => {
    const files = list ? [...list] : []
    if (files.length) onFiles(files)
  }

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      aria-label={`${t("converter.dropTitle")} — ${t("converter.dropHint")}`}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onDragEnter={(e) => {
        e.preventDefault()
        if (disabled) return
        if (depth.current++ === 0) {
          setOver(true)
          setMood("dragover")
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        if (--depth.current <= 0) reset()
      }}
      onDrop={(e) => {
        e.preventDefault()
        reset()
        if (!disabled) take(e.dataTransfer.files)
      }}
      className={cn(
        "group relative grid cursor-pointer place-items-center rounded-2xl text-center outline-none transition-[background-color,scale,min-height] duration-300 focus-visible:ring-3 focus-visible:ring-ring/50",
        compact ? "min-h-28 p-4" : "min-h-64 p-8",
        over ? "scale-[1.01] bg-brand/10" : "bg-muted/50 hover:bg-muted",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden>
        <rect
          x="1"
          y="1"
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx="16"
          fill="none"
          stroke={over ? "var(--brand)" : "var(--border)"}
          strokeWidth="2"
          strokeDasharray="10 14"
          className="marching-ants"
        />
      </svg>

      <div className={cn("flex items-center gap-4", compact ? "flex-row text-left" : "flex-col")}>
        <div
          className={cn(
            "dz-icon grid shrink-0 place-items-center rounded-2xl bg-card shadow-sm transition-transform group-hover:-rotate-6",
            compact ? "size-11" : "size-14",
          )}
        >
          <ImagePlus className={cn("text-brand", compact ? "size-5" : "size-7")} aria-hidden />
        </div>
        <div className="space-y-1">
          <p className={cn("font-display font-semibold", compact ? "text-base" : "text-xl")}>
            {over ? t("converter.dropActive") : t("converter.dropTitle")}
          </p>
          <p className="text-sm text-muted-foreground">{t("converter.dropHint")}</p>
          {!compact && <p className="pt-2 text-xs text-muted-foreground/80">{t("converter.pasteHint")}</p>}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ""
        }}
      />
    </div>
  )
}
