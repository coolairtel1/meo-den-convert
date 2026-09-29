import { useRef } from "react"
import { useTranslation } from "react-i18next"
import { SegmentedControl } from "@/components/motion/SegmentedControl"
import { useSlidingPill } from "@/components/motion/useSlidingPill"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import type { ResizeMode } from "@/lib/codecs/resize"
import { FORMAT_LABEL, HAS_ALPHA, LOSSY, OUTPUT_FORMATS } from "@/lib/codecs/support"
import type { OutputFormat } from "@/lib/codecs/types"
import { cn } from "@/lib/utils"
import { useConverterStore } from "./store"

const BG_SWATCHES = ["#ffffff", "#000000", "#f5efe0", "#1d1a26"]
const MAX_PRESETS = [800, 1280, 1920, 2560, 3840]

export function SettingsPanel() {
  const { t } = useTranslation()
  const settings = useConverterStore((s) => s.settings)
  const setSettings = useConverterStore((s) => s.setSettings)
  const busy = useConverterStore((s) => s.busy)
  const { format, quality, background } = settings

  return (
    <div className="grid gap-5 rounded-2xl border bg-background/60 p-4 sm:grid-cols-2 sm:p-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("converter.settings.format")}</p>
        <FormatPicker value={format} disabled={busy} onChange={(f) => setSettings({ format: f })} />
        <p className="text-xs text-muted-foreground">{t(`converter.formatHints.${format}`)}</p>
      </div>

      <div className="space-y-2">
        {LOSSY[format] ? (
          <>
            <div className="flex items-baseline justify-between">
              <p id="quality-label" className="text-sm font-semibold">
                {t("converter.settings.quality")}
              </p>
              <span className="font-display text-lg font-bold text-brand tabular-nums">{quality}</span>
            </div>
            <Slider
              aria-labelledby="quality-label"
              min={1}
              max={100}
              step={1}
              value={[quality]}
              disabled={busy}
              onValueChange={([q]) => setSettings({ quality: q })}
              className="py-2"
            />
            <p className="text-xs text-muted-foreground">{t("converter.settings.qualityHint")}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold">{t("converter.settings.quality")}</p>
            <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
              {t(`converter.settings.lossless_${format}`, { defaultValue: t("converter.settings.lossless") })}
            </p>
          </>
        )}
      </div>

      <ResizeControls />

      {!HAS_ALPHA[format] && (
        <div className="space-y-2 sm:col-span-2">
          <p className="text-sm font-semibold">{t("converter.settings.background")}</p>
          <div className="flex flex-wrap items-center gap-2">
            {BG_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                disabled={busy}
                aria-label={c}
                aria-pressed={background.toLowerCase() === c}
                onClick={() => setSettings({ background: c })}
                style={{ background: c }}
                className={cn(
                  "size-8 rounded-full border-2 shadow-sm transition-[scale,box-shadow] hover:scale-110 active:scale-90",
                  background.toLowerCase() === c ? "border-brand ring-3 ring-brand/30" : "border-border",
                )}
              />
            ))}
            <label className="relative flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors hover:bg-muted">
              <span className="size-4 rounded-full border" style={{ background }} />
              {background.toUpperCase()}
              <input
                type="color"
                value={background}
                disabled={busy}
                onChange={(e) => setSettings({ background: e.target.value })}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">{t("converter.settings.backgroundHint")}</p>
        </div>
      )}
    </div>
  )
}

/** 4×2 grid of output formats with a highlight that glides between cells. */
function FormatPicker({
  value,
  disabled,
  onChange,
}: {
  value: OutputFormat
  disabled: boolean
  onChange: (f: OutputFormat) => void
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  useSlidingPill(ref, pillRef, value, undefined, "both")

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={t("converter.settings.format")}
      className={cn("relative grid grid-cols-4 gap-1 rounded-xl bg-muted p-1", disabled && "opacity-60")}
    >
      <span ref={pillRef} aria-hidden className="absolute top-0 left-0 rounded-lg bg-card shadow-sm" />
      {OUTPUT_FORMATS.map((f) => (
        <button
          key={f}
          type="button"
          role="radio"
          aria-checked={f === value}
          data-pill-key={f}
          disabled={disabled}
          onClick={() => onChange(f)}
          className={cn(
            "relative z-10 rounded-lg px-2 py-1.5 text-sm font-semibold transition-[color,scale] active:scale-95",
            f === value ? "text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {FORMAT_LABEL[f]}
        </button>
      ))}
    </div>
  )
}

function ResizeControls() {
  const { t } = useTranslation()
  const resize = useConverterStore((s) => s.settings.resize)
  const setResize = useConverterStore((s) => s.setResize)
  const busy = useConverterStore((s) => s.busy)

  return (
    <div className="space-y-2 sm:col-span-2">
      <p className="text-sm font-semibold">{t("converter.resize.title")}</p>
      <SegmentedControl<ResizeMode>
        label={t("converter.resize.title")}
        value={resize.mode}
        disabled={busy}
        onChange={(mode) => setResize({ mode })}
        options={[
          { value: "none", label: t("converter.resize.none") },
          { value: "max", label: t("converter.resize.max") },
          { value: "percent", label: t("converter.resize.percent") },
        ]}
        className="max-w-md"
      />
      {resize.mode === "max" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <Input
              type="number"
              min={16}
              max={16384}
              step={1}
              inputMode="numeric"
              value={resize.max}
              disabled={busy}
              aria-label={t("converter.resize.maxLabel")}
              onChange={(e) => {
                const v = Math.round(Number(e.target.value))
                if (v > 0) setResize({ max: Math.min(16384, v) })
              }}
              className="h-8 w-24"
            />
            px
          </label>
          {MAX_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              onClick={() => setResize({ max: p })}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-[background-color,scale] active:scale-95",
                resize.max === p ? "border-brand bg-brand/15" : "hover:bg-muted",
              )}
            >
              {p}
            </button>
          ))}
        </div>
      )}
      {resize.mode === "percent" && (
        <div className="flex max-w-md items-center gap-3">
          <Slider
            aria-label={t("converter.resize.percent")}
            min={5}
            max={100}
            step={5}
            value={[resize.percent]}
            disabled={busy}
            onValueChange={([percent]) => setResize({ percent })}
            className="py-2"
          />
          <span className="w-12 text-right font-display text-lg font-bold text-brand tabular-nums">{resize.percent}%</span>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t(`converter.resize.hint_${resize.mode}`)}</p>
    </div>
  )
}
