import { ChevronDown } from "lucide-react"
import { useId, useRef, useState, type ReactNode } from "react"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap"
import { cn } from "@/lib/utils"

interface SectionProps {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

/** Collapsible settings group with an animated height. */
export function Section({ title, icon, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const bodyRef = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  const id = useId()

  useGSAP(
    () => {
      const el = bodyRef.current
      if (!el) return
      if (first.current || prefersReducedMotion()) {
        first.current = false
        gsap.set(el, { height: open ? "auto" : 0, opacity: open ? 1 : 0 })
        return
      }
      gsap.to(el, { height: open ? "auto" : 0, opacity: open ? 1 : 0, duration: 0.35, ease: "power2.inOut" })
    },
    { dependencies: [open] },
  )

  return (
    <section className="rounded-2xl border bg-background/60">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted/60"
      >
        {icon}
        <span className="flex-1">{title}</span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform duration-300", open && "rotate-180")} />
      </button>
      <div id={id} ref={bodyRef} className="overflow-hidden" inert={!open}>
        <div className="space-y-4 px-4 pt-1 pb-4">{children}</div>
      </div>
    </section>
  )
}
