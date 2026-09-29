import { useId, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ColorFieldProps {
  label: string
  value: string
  onChange: (hex: string) => void
  disabled?: boolean
  className?: string
}

const HEX = /^#[0-9a-f]{6}$/i

/** Native colour picker plus an editable hex field (committed once it's a valid #rrggbb). */
export function ColorField({ label, value, onChange, disabled, className }: ColorFieldProps) {
  const id = useId()
  const [draft, setDraft] = useState(value)
  // Follow outside changes (presets, the native picker) without an effect.
  const [synced, setSynced] = useState(value)
  if (value !== synced) {
    setSynced(value)
    setDraft(value)
  }

  return (
    <div className={cn("space-y-1.5", disabled && "opacity-50", className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span
          className="relative size-8 shrink-0 overflow-hidden rounded-full border-2 border-border shadow-sm transition-transform hover:scale-110 active:scale-95"
          style={{ background: value }}
        >
          <input
            type="color"
            aria-label={label}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
        <Input
          id={id}
          value={draft}
          disabled={disabled}
          spellCheck={false}
          maxLength={7}
          onChange={(e) => {
            const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`
            setDraft(v)
            if (HEX.test(v)) onChange(v.toLowerCase())
          }}
          onBlur={() => setDraft(value)}
          className="h-8 w-24 font-mono text-xs uppercase"
        />
      </div>
    </div>
  )
}
