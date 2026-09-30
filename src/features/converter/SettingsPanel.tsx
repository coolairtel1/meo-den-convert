import { useEffect, useId, useRef } from "react"
import { useTranslation } from "react-i18next"
import { SegmentedControl } from "@/components/motion/SegmentedControl"
import { useSlidingPill } from "@/components/motion/useSlidingPill"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import type { ResizeMode } from "@/lib/codecs/resize"
import { EXTENSION, FORMAT_LABEL, HAS_ALPHA, LOSSY, OUTPUT_FORMATS } from "@/lib/codecs/support"
import type { OutputFormat } from "@/lib/codecs/types"
import { formatBytes, kbLabel } from "@/lib/format"
import { prepareModel, useAiStore } from "@/lib/ai/client"
import { BG_MODELS, type BgModelId } from "@/lib/ai/models"
import { useCatStore } from "@/features/mascot/catStore"
import { renderName } from "@/lib/edit/rename"
import { WATERMARK_POSITIONS, type WatermarkPosition } from "@/lib/edit/watermark"
import { fileToDownscaledDataUrl } from "@/lib/image"
import { cn } from "@/lib/utils"
import { useConverterStore } from "./store"

const BG_SWATCHES = ["#ffffff", "#000000", "#f5efe0", "#1d1a26"]
const MAX_PRESETS = [800, 1280, 1920, 2560, 3840]
const TARGET_PRESETS = [100, 200, 500, 1000, 2000]


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

      <RemoveBgControls />
      <ResizeControls />
      <TargetControls />
      <WatermarkControls />
      <RenameControls />

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

/** Optional max file size: the engine lowers quality, then shrinks, until the file fits. */
function TargetControls() {
  const { t } = useTranslation()
  const target = useConverterStore((s) => s.settings.target)
  const format = useConverterStore((s) => s.settings.format)
  const setTarget = useConverterStore((s) => s.setTarget)
  const busy = useConverterStore((s) => s.busy)
  const switchId = useId()
  const ico = format === "ico"

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center gap-2.5">
        <Switch
          id={switchId}
          checked={target.enabled && !ico}
          disabled={busy || ico}
          onCheckedChange={(enabled) => setTarget({ enabled })}
        />
        <label htmlFor={switchId} className="text-sm font-semibold">
          {t("converter.target.title")}
        </label>
      </div>
      {ico ? (
        <p className="text-xs text-muted-foreground">{t("converter.target.ico")}</p>
      ) : (
        target.enabled && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {TARGET_PRESETS.map((kb) => (
                <button
                  key={kb}
                  type="button"
                  disabled={busy}
                  onClick={() => setTarget({ kb })}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-medium tabular-nums transition-[background-color,scale] active:scale-95",
                    target.kb === kb ? "border-brand bg-brand/15" : "hover:bg-muted",
                  )}
                >
                  {kbLabel(kb)}
                </button>
              ))}
              <label className="flex items-center gap-2 text-sm">
                <Input
                  type="number"
                  min={10}
                  max={50000}
                  step={10}
                  inputMode="numeric"
                  value={target.kb}
                  disabled={busy}
                  aria-label={t("converter.target.custom")}
                  onChange={(e) => {
                    const v = Math.round(Number(e.target.value))
                    if (v > 0) setTarget({ kb: Math.min(50000, v) })
                  }}
                  className="h-8 w-24"
                />
                KB
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {LOSSY[format] ? t("converter.target.hint") : t("converter.target.hintLossless")}
            </p>
          </>
        )
      )}
    </div>
  )
}

const WM_COLORS = ["#ffffff", "#000000", "#f2c94c", "#e53935"]

/** Text or logo watermark: 3×3 placement grid or a diagonal tile, size and opacity. */
function WatermarkControls() {
  const { t } = useTranslation()
  const wm = useConverterStore((s) => s.settings.watermark)
  const setWatermark = useConverterStore((s) => s.setWatermark)
  const busy = useConverterStore((s) => s.busy)
  const switchId = useId()
  const textId = useId()
  const logoRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex items-center gap-2.5">
        <Switch id={switchId} checked={wm.enabled} disabled={busy} onCheckedChange={(enabled) => setWatermark({ enabled })} />
        <label htmlFor={switchId} className="text-sm font-semibold">
          {t("converter.watermark.title")}
        </label>
      </div>
      {wm.enabled && (
        <div className="grid gap-4 rounded-xl bg-muted/50 p-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <SegmentedControl
              label={t("converter.watermark.type")}
              value={wm.type}
              disabled={busy}
              onChange={(type) => setWatermark({ type })}
              options={[
                { value: "text", label: t("converter.watermark.text") },
                { value: "logo", label: t("converter.watermark.logo") },
              ]}
              className="max-w-xs"
            />
            {wm.type === "text" ? (
              <div className="space-y-2">
                <label htmlFor={textId} className="sr-only">
                  {t("converter.watermark.textLabel")}
                </label>
                <Input id={textId} value={wm.text} maxLength={60} disabled={busy} onChange={(e) => setWatermark({ text: e.target.value })} />
                <div className="flex items-center gap-2" role="radiogroup" aria-label={t("converter.watermark.color")}>
                  {WM_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={wm.color === c}
                      aria-label={c}
                      disabled={busy}
                      onClick={() => setWatermark({ color: c })}
                      style={{ background: c }}
                      className={cn(
                        "size-7 rounded-full border-2 shadow-sm transition-[scale] hover:scale-110 active:scale-90",
                        wm.color === c ? "border-brand ring-3 ring-brand/30" : "border-border",
                      )}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {wm.logo && <img src={wm.logo} alt="" className="size-12 rounded-lg border bg-white object-contain p-1" />}
                <Button variant="outline" size="sm" disabled={busy} onClick={() => logoRef.current?.click()}>
                  {wm.logo ? t("converter.watermark.changeLogo") : t("converter.watermark.uploadLogo")}
                </Button>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ""
                    if (f) setWatermark({ logo: await fileToDownscaledDataUrl(f, 512) })
                  }}
                />
              </div>
            )}
            <SliderField label={t("converter.watermark.size")} value={Math.round(wm.scale * 100)} min={5} max={80} unit="%" disabled={busy} onChange={(v) => setWatermark({ scale: v / 100 })} />
            <SliderField label={t("converter.watermark.opacity")} value={Math.round(wm.opacity * 100)} min={10} max={100} unit="%" disabled={busy} onChange={(v) => setWatermark({ opacity: v / 100 })} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("converter.watermark.position")}</p>
            <div role="radiogroup" aria-label={t("converter.watermark.position")} className="grid w-28 grid-cols-3 gap-1">
              {WATERMARK_POSITIONS.map((p) => (
                <PositionCell key={p} value={p} active={wm.position === p} disabled={busy} onClick={() => setWatermark({ position: p })} label={t(`converter.watermark.pos_${p}`)} />
              ))}
            </div>
            <button
              type="button"
              role="radio"
              aria-checked={wm.position === "tile"}
              disabled={busy}
              onClick={() => setWatermark({ position: "tile" })}
              className={cn(
                "w-28 rounded-lg border px-2 py-1 text-xs font-semibold transition-colors",
                wm.position === "tile" ? "border-brand bg-brand/15" : "hover:bg-muted",
              )}
            >
              {t("converter.watermark.tile")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function PositionCell({ value, active, disabled, onClick, label }: { value: WatermarkPosition; active: boolean; disabled: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
      data-pos={value}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid aspect-square place-items-center rounded-md border transition-[background-color,scale] active:scale-90",
        active ? "border-brand bg-brand/20" : "bg-card hover:bg-muted",
      )}
    >
      <span className={cn("size-2 rounded-full", active ? "bg-brand" : "bg-muted-foreground/40")} />
    </button>
  )
}

function SliderField({ label, value, min, max, unit, disabled, onChange }: { label: string; value: number; min: number; max: number; unit: string; disabled?: boolean; onChange: (v: number) => void }) {
  const id = useId()
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <p id={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
        <span className="text-xs font-semibold tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <Slider aria-labelledby={id} min={min} max={max} step={1} value={[value]} disabled={disabled} onValueChange={([v]) => onChange(v)} className="py-1.5" />
    </div>
  )
}

const RENAME_TOKENS = ["{name}", "{n}", "{date}", "{w}", "{h}"]

/** Pattern-based output names with a live preview of the first few files. */
function RenameControls() {
  const { t } = useTranslation()
  const rename = useConverterStore((s) => s.settings.rename)
  const setRename = useConverterStore((s) => s.setRename)
  const items = useConverterStore((s) => s.items)
  const format = useConverterStore((s) => s.settings.format)
  const switchId = useId()
  const patternId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const sample = (items.length ? items : [{ file: { name: "IMG_0001.HEIC" } }]).slice(0, 3)

  const insert = (token: string) => {
    const el = inputRef.current
    const at = el?.selectionStart ?? rename.pattern.length
    setRename({ pattern: rename.pattern.slice(0, at) + token + rename.pattern.slice(el?.selectionEnd ?? at) })
    requestAnimationFrame(() => el?.focus())
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center gap-2.5">
        <Switch id={switchId} checked={rename.enabled} onCheckedChange={(enabled) => setRename({ enabled })} />
        <label htmlFor={switchId} className="text-sm font-semibold">
          {t("converter.rename.title")}
        </label>
      </div>
      {rename.enabled && (
        <div className="space-y-2 rounded-xl bg-muted/50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={patternId} className="sr-only">
              {t("converter.rename.pattern")}
            </label>
            <Input ref={inputRef} id={patternId} value={rename.pattern} maxLength={80} spellCheck={false} onChange={(e) => setRename({ pattern: e.target.value })} className="h-8 max-w-xs font-mono text-sm" />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {t("converter.rename.start")}
              <Input type="number" min={0} value={rename.start} onChange={(e) => setRename({ start: Math.max(0, Math.round(Number(e.target.value) || 0)) })} className="h-8 w-16" />
            </label>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {RENAME_TOKENS.map((tok) => (
              <button key={tok} type="button" onClick={() => insert(tok)} className="rounded-md border bg-card px-2 py-0.5 font-mono text-xs transition-[background-color,scale] hover:bg-muted active:scale-95" title={t(`converter.rename.token_${tok.slice(1, -1)}`)}>
                {tok}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("converter.rename.preview")}:{" "}
            <span className="font-mono text-foreground">
              {sample
                .map((it, i) => renderName(rename, { originalName: it.file.name, extension: EXTENSION[format], index: i, total: Math.max(items.length, sample.length), width: 1080, height: 1080 }))
                .join(", ")}
              {items.length > 3 ? ", …" : ""}
            </span>
          </p>
        </div>
      )}
    </div>
  )
}

/** On-device AI background removal: model choice, download progress, credits. */
function RemoveBgControls() {
  const { t, i18n } = useTranslation()
  const bg = useConverterStore((s) => s.settings.removeBg)
  const format = useConverterStore((s) => s.settings.format)
  const setRemoveBg = useConverterStore((s) => s.setRemoveBg)
  const busy = useConverterStore((s) => s.busy)
  const ai = useAiStore()
  const switchId = useId()
  const lang = i18n.resolvedLanguage
  const spec = BG_MODELS[bg.model]

  // Tủm comments on the (one-time) model download.
  const prevPhase = useRef(ai.phase)
  useEffect(() => {
    const { say } = useCatStore.getState()
    if (ai.phase === "download" && prevPhase.current !== "download") say(t("converter.removeBg.catDownloading"))
    if (ai.phase === "ready" && (prevPhase.current === "download" || prevPhase.current === "init")) say(t("converter.removeBg.catReady"))
    prevPhase.current = ai.phase
  }, [ai.phase, t])

  const status = () => {
    if (ai.phase === "download")
      return t("converter.removeBg.downloading", { loaded: formatBytes(ai.loaded, lang), total: formatBytes(ai.total, lang) })
    if (ai.phase === "init") return t("converter.removeBg.init")
    if (ai.phase === "run") return t("converter.removeBg.running")
    if (ai.phase === "ready") return t("converter.removeBg.ready", { name: BG_MODELS[ai.model ?? bg.model].name })
    if (ai.phase === "error") return t("converter.removeBg.error")
    return null
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center gap-2.5">
        <Switch id={switchId} checked={bg.enabled} disabled={busy} onCheckedChange={(enabled) => setRemoveBg({ enabled })} />
        <label htmlFor={switchId} className="text-sm font-semibold">
          {t("converter.removeBg.title")}
        </label>
        <span className="rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-foreground uppercase dark:text-brand">AI</span>
      </div>
      {bg.enabled && (
        <div className="space-y-3 rounded-xl bg-muted/50 p-3">
          <SegmentedControl<BgModelId>
            label={t("converter.removeBg.model")}
            value={bg.model}
            disabled={busy}
            onChange={(model) => setRemoveBg({ model })}
            options={[
              { value: "quality", label: t("converter.removeBg.quality") },
              { value: "fast", label: t("converter.removeBg.fast") },
            ]}
            className="max-w-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t(`converter.removeBg.hint_${bg.model}`, { size: formatBytes(spec.bytes, lang) })}
          </p>
          {ai.phase === "download" && (
            <div className="h-1.5 max-w-sm overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round((ai.loaded / (ai.total || 1)) * 100)}>
              <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${(ai.loaded / (ai.total || 1)) * 100}%` }} />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {status() && (
              <span role="status" className={cn(ai.phase === "error" ? "text-destructive" : "text-muted-foreground")}>
                {status()}
              </span>
            )}
            {(ai.phase === "idle" || ai.phase === "error" || (ai.phase === "ready" && ai.model !== bg.model)) && (
              <Button variant="outline" size="xs" disabled={busy} onClick={() => void prepareModel(bg.model).catch(() => undefined)}>
                {t("converter.removeBg.prefetch")}
              </Button>
            )}
          </div>
          {ai.fellBack && <p className="text-xs text-amber-700 dark:text-amber-400">{t("converter.removeBg.fellBack")}</p>}
          {!HAS_ALPHA[format] && <p className="text-xs text-muted-foreground">{t("converter.removeBg.noAlpha")}</p>}
          <p className="text-[11px] text-muted-foreground">
            {t("converter.removeBg.privacy")}{" "}
            <a href={spec.licenseUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
              {spec.name} · {spec.license}
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
