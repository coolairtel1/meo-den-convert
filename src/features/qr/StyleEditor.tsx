import type { CornerDotType, CornerSquareType, DotType, ErrorCorrectionLevel } from "qr-code-styling"
import { Grid3x3, ImagePlus, Palette, Plus, RotateCcw, Settings2, Sparkles, Square, SquareDashed, Trash2, X } from "lucide-react"
import { useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { SegmentedControl } from "@/components/motion/SegmentedControl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { fileToDownscaledDataUrl } from "@/lib/image"
import { gsap, prefersReducedMotion } from "@/lib/motion/gsap"
import { BUILT_IN_PRESETS, presetPreview, type QrPreset } from "@/lib/qr/presets"
import { DEFAULT_STYLE, type QrStyle } from "@/lib/qr/style"
import { cn } from "@/lib/utils"
import { ColorField } from "./ColorField"
import { MiniQr } from "./MiniQr"
import { Section } from "./Section"
import { useQrStore } from "./store"

const DOT_TYPES: DotType[] = ["square", "dots", "rounded", "extra-rounded", "classy", "classy-rounded"]
const CORNER_SQUARE_TYPES: CornerSquareType[] = ["square", "extra-rounded", "dot"]
const CORNER_DOT_TYPES: CornerDotType[] = ["square", "dot"]

// Neutral swatch look so option tiles don't re-render on every colour tweak.
const SWATCH: QrStyle = {
  ...DEFAULT_STYLE,
  dotColor: "#1d1a26",
  cornerSquareColor: "#1d1a26",
  cornerDotColor: "#1d1a26",
  bgColor: "#ffffff",
  gradient: false,
}

export function StyleEditor() {
  const { t } = useTranslation()
  const style = useQrStore((s) => s.style)
  const setStyle = useQrStore((s) => s.setStyle)
  const resetStyle = useQrStore((s) => s.resetStyle)

  return (
    <div className="space-y-3">
      <PresetsSection />

      <Section title={t("qr.sections.dots")} icon={<Grid3x3 className="size-4 text-brand" aria-hidden />}>
        <TileGroup
          label={t("qr.style.dotType")}
          value={style.dotType}
          options={DOT_TYPES}
          labelOf={(v) => t(`qr.dotTypes.${v}`)}
          previewOf={(v) => ({ ...SWATCH, dotType: v, cornerSquareType: "square", cornerDotType: "square" })}
          onChange={(dotType) => setStyle({ dotType })}
        />
        <div className="flex flex-wrap items-end gap-4">
          <ColorField label={t("qr.style.color")} value={style.dotColor} onChange={(dotColor) => setStyle({ dotColor })} />
          <ToggleRow label={t("qr.style.gradient")} checked={style.gradient} onChange={(gradient) => setStyle({ gradient })} />
        </div>
        {style.gradient && (
          <div className="grid gap-4 rounded-xl bg-muted/50 p-3 sm:grid-cols-2">
            <ColorField
              label={t("qr.style.gradientColor")}
              value={style.gradientColor}
              onChange={(gradientColor) => setStyle({ gradientColor })}
            />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t("qr.style.gradientType")}</p>
              <SegmentedControl
                label={t("qr.style.gradientType")}
                value={style.gradientType}
                onChange={(gradientType) => setStyle({ gradientType })}
                options={[
                  { value: "linear", label: t("qr.style.linear") },
                  { value: "radial", label: t("qr.style.radial") },
                ]}
              />
            </div>
            {style.gradientType === "linear" && (
              <SliderRow
                label={t("qr.style.rotation")}
                value={style.gradientRotation}
                min={0}
                max={360}
                step={5}
                format={(v) => `${v}°`}
                onChange={(gradientRotation) => setStyle({ gradientRotation })}
                className="sm:col-span-2"
              />
            )}
          </div>
        )}
      </Section>

      <Section title={t("qr.sections.corners")} icon={<SquareDashed className="size-4 text-brand" aria-hidden />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <TileGroup
            label={t("qr.style.cornerSquare")}
            value={style.cornerSquareType}
            options={CORNER_SQUARE_TYPES}
            labelOf={(v) => t(`qr.cornerTypes.${v}`)}
            previewOf={(v) => ({ ...SWATCH, dotType: "square", cornerSquareType: v, cornerDotType: "square" })}
            onChange={(cornerSquareType) => setStyle({ cornerSquareType })}
            compact
          />
          <TileGroup
            label={t("qr.style.cornerDot")}
            value={style.cornerDotType}
            options={CORNER_DOT_TYPES}
            labelOf={(v) => t(`qr.cornerTypes.${v}`)}
            previewOf={(v) => ({ ...SWATCH, dotType: "square", cornerSquareType: "square", cornerDotType: v })}
            onChange={(cornerDotType) => setStyle({ cornerDotType })}
            compact
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <ColorField
            label={t("qr.style.cornerSquareColor")}
            value={style.cornerSquareColor}
            onChange={(cornerSquareColor) => setStyle({ cornerSquareColor })}
          />
          <ColorField
            label={t("qr.style.cornerDotColor")}
            value={style.cornerDotColor}
            onChange={(cornerDotColor) => setStyle({ cornerDotColor })}
          />
        </div>
      </Section>

      <Section title={t("qr.sections.background")} icon={<Square className="size-4 text-brand" aria-hidden />}>
        <div className="flex flex-wrap items-end gap-4">
          <ColorField
            label={t("qr.style.bgColor")}
            value={style.bgColor}
            disabled={style.bgTransparent}
            onChange={(bgColor) => setStyle({ bgColor })}
          />
          <ToggleRow
            label={t("qr.style.transparent")}
            checked={style.bgTransparent}
            onChange={(bgTransparent) => setStyle({ bgTransparent })}
          />
        </div>
      </Section>

      <LogoSection />

      <Section
        title={t("qr.sections.advanced")}
        icon={<Settings2 className="size-4 text-brand" aria-hidden />}
        defaultOpen={false}
      >
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("qr.style.ecl")}</p>
          <SegmentedControl<ErrorCorrectionLevel>
            label={t("qr.style.ecl")}
            value={style.logo ? "H" : style.ecl}
            disabled={!!style.logo}
            onChange={(ecl) => setStyle({ ecl })}
            options={(["L", "M", "Q", "H"] as const).map((v) => ({ value: v, label: v }))}
          />
          <p className="text-xs text-muted-foreground">{style.logo ? t("qr.style.logoEcl") : t("qr.style.eclHint")}</p>
        </div>
        <SliderRow
          label={t("qr.style.margin")}
          value={style.margin}
          min={0}
          max={48}
          step={2}
          format={(v) => `${v}px`}
          onChange={(margin) => setStyle({ margin })}
        />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("qr.style.shape")}</p>
          <SegmentedControl
            label={t("qr.style.shape")}
            value={style.shape}
            onChange={(shape) => setStyle({ shape })}
            options={[
              { value: "square", label: t("qr.style.square") },
              { value: "circle", label: t("qr.style.circle") },
            ]}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={resetStyle}>
          <RotateCcw aria-hidden />
          {t("qr.style.reset")}
        </Button>
      </Section>
    </div>
  )
}

function PresetsSection() {
  const { t } = useTranslation()
  const style = useQrStore((s) => s.style)
  const setStyle = useQrStore((s) => s.setStyle)
  const userPresets = useQrStore((s) => s.userPresets)
  const savePreset = useQrStore((s) => s.savePreset)
  const deletePreset = useQrStore((s) => s.deletePreset)
  const [name, setName] = useState("")
  const nameId = useId()

  const apply = (p: QrPreset, el: HTMLElement) => {
    setStyle(p.style)
    if (!prefersReducedMotion()) gsap.fromTo(el, { scale: 0.9 }, { scale: 1, duration: 0.45, ease: "back.out(3)" })
  }
  const label = (p: QrPreset) => (p.builtIn ? t(p.name) : p.name)
  const isActive = (p: QrPreset) => Object.entries(p.style).every(([k, v]) => style[k as keyof QrStyle] === v)

  const tile = (p: QrPreset) => (
    <div key={p.id} className="group relative">
      <button
        type="button"
        onClick={(e) => apply(p, e.currentTarget)}
        aria-label={t("qr.presets.apply", { name: label(p) })}
        aria-pressed={isActive(p)}
        className={cn(
          "flex w-full flex-col items-center gap-1 rounded-xl border bg-card p-1.5 text-[11px] font-semibold transition-[border-color,box-shadow,scale] hover:-translate-y-0.5 active:scale-95",
          isActive(p) ? "border-brand ring-3 ring-brand/25" : "hover:border-ring/40",
        )}
      >
        <MiniQr style={presetPreview(p)} className="size-14 overflow-hidden rounded-lg" />
        <span className="w-full truncate text-center">{label(p)}</span>
      </button>
      {!p.builtIn && (
        <button
          type="button"
          onClick={() => deletePreset(p.id)}
          aria-label={t("qr.presets.delete", { name: p.name })}
          className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border bg-card text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-destructive"
        >
          <X className="size-3" aria-hidden />
        </button>
      )}
    </div>
  )

  return (
    <Section title={t("qr.sections.presets")} icon={<Sparkles className="size-4 text-brand" aria-hidden />}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{BUILT_IN_PRESETS.map(tile)}</div>
      {userPresets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{t("qr.presets.saved")}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{userPresets.map(tile)}</div>
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          savePreset(name.trim())
          setName("")
        }}
      >
        <label htmlFor={nameId} className="sr-only">
          {t("qr.presets.namePlaceholder")}
        </label>
        <Input
          id={nameId}
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("qr.presets.namePlaceholder")}
          className="h-8"
        />
        <Button type="submit" size="sm" variant="outline" disabled={!name.trim()}>
          <Plus aria-hidden />
          {t("qr.presets.save")}
        </Button>
      </form>
    </Section>
  )
}

function LogoSection() {
  const { t } = useTranslation()
  const style = useQrStore((s) => s.style)
  const setStyle = useQrStore((s) => s.setStyle)
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState(false)

  return (
    <Section title={t("qr.sections.logo")} icon={<Palette className="size-4 text-brand" aria-hidden />}>
      <div className="flex flex-wrap items-center gap-3">
        {style.logo && (
          <img src={style.logo} alt="" className="size-12 rounded-lg border bg-[conic-gradient(var(--muted)_25%,transparent_0_50%,var(--muted)_0_75%,transparent_0)] bg-[length:10px_10px] object-contain p-1" />
        )}
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <ImagePlus aria-hidden />
          {style.logo ? t("qr.style.logoChange") : t("qr.style.logoUpload")}
        </Button>
        {style.logo && (
          <Button variant="ghost" size="sm" onClick={() => setStyle({ logo: null })}>
            <Trash2 aria-hidden />
            {t("qr.style.logoRemove")}
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (!file) return
            try {
              setStyle({ logo: await fileToDownscaledDataUrl(file) })
              setError(false)
            } catch {
              setError(true)
            }
          }}
        />
      </div>
      {error && <p className="text-xs text-destructive">{t("qr.style.logoInvalid")}</p>}
      {style.logo && (
        <>
          <SliderRow
            label={t("qr.style.logoSize")}
            value={Math.round(style.logoSize * 100)}
            min={15}
            max={45}
            step={1}
            format={(v) => `${v}%`}
            onChange={(v) => setStyle({ logoSize: v / 100 })}
          />
          <ToggleRow
            label={t("qr.style.hideDots")}
            checked={style.hideBackgroundDots}
            onChange={(hideBackgroundDots) => setStyle({ hideBackgroundDots })}
          />
          <p className="text-xs text-muted-foreground">{t("qr.style.logoEcl")}</p>
        </>
      )}
    </Section>
  )
}

interface TileGroupProps<T extends string> {
  label: string
  value: T
  options: T[]
  labelOf: (v: T) => string
  previewOf: (v: T) => QrStyle
  onChange: (v: T) => void
  compact?: boolean
}

function TileGroup<T extends string>({ label, value, options, labelOf, previewOf, onChange, compact }: TileGroupProps<T>) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div role="radiogroup" aria-label={label} className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-6")}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={o === value}
            title={labelOf(o)}
            onClick={(e) => {
              onChange(o)
              if (!prefersReducedMotion())
                gsap.fromTo(e.currentTarget, { scale: 0.88 }, { scale: 1, duration: 0.4, ease: "back.out(3)" })
            }}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border bg-white p-1.5 text-[11px] font-semibold text-neutral-700 transition-[border-color,box-shadow] dark:bg-white/95",
              o === value ? "border-brand ring-3 ring-brand/25" : "hover:border-ring/50",
            )}
          >
            <MiniQr style={previewOf(o)} className="size-11" />
            <span className="w-full truncate text-center">{labelOf(o)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex h-8 items-center gap-2.5">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  )
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  onChange: (v: number) => void
  className?: string
}

function SliderRow({ label, value, min, max, step, format, onChange, className }: SliderRowProps) {
  const id = useId()
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between">
        <p id={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
        <span className="text-xs font-semibold tabular-nums">{format(value)}</span>
      </div>
      <Slider aria-labelledby={id} value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} className="py-1.5" />
    </div>
  )
}
