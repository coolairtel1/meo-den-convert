import { useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { useSlidingPill } from "./useSlidingPill"

interface Option<T extends string> {
  value: T
  label: ReactNode
}

interface SegmentedControlProps<T extends string> {
  value: T
  options: Option<T>[]
  onChange: (value: T) => void
  label: string
  disabled?: boolean
  className?: string
}

/** Radio group with a sliding highlight pill. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  disabled,
  className,
}: SegmentedControlProps<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  useSlidingPill(ref, pillRef, value)

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className={cn("relative flex rounded-xl bg-muted p-1", disabled && "opacity-60", className)}
    >
      <span ref={pillRef} aria-hidden className="absolute top-1 bottom-1 left-0 rounded-lg bg-card shadow-sm" />
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-pill-key={o.value}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-[color,scale] active:scale-95",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
