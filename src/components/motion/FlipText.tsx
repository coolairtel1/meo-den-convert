import { useRef } from "react"
import { gsap, prefersReducedMotion, SplitText, useGSAP } from "@/lib/motion/gsap"
import { cn } from "@/lib/utils"

/** Text that flips in letter-by-letter (airport-board style) whenever it changes. */
export function FlipText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const mounted = useRef(false)

  useGSAP(
    () => {
      if (!mounted.current) {
        mounted.current = true
        return
      }
      const el = ref.current?.firstElementChild
      if (!el || prefersReducedMotion()) return
      const split = SplitText.create(el, { type: "chars" })
      gsap.from(split.chars, {
        rotationX: -90,
        yPercent: -40,
        opacity: 0,
        transformOrigin: "50% 50% -6px",
        duration: 0.45,
        ease: "back.out(2)",
        stagger: 0.022,
        onComplete: () => split.revert(),
      })
    },
    { scope: ref, dependencies: [text] },
  )

  // Keyed inner span: React swaps the node instead of patching text SplitText has rewritten.
  return (
    <span ref={ref} className={cn("inline-block [perspective:400px]", className)}>
      <span key={text} className="inline-block">
        {text}
      </span>
    </span>
  )
}
