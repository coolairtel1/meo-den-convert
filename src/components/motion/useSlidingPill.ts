import { useLayoutEffect, useRef, type RefObject } from "react"
import { gsap, prefersReducedMotion } from "@/lib/motion/gsap"

/**
 * Slides `pillRef` under the child of `containerRef` marked `data-pill-key={activeKey}`.
 * Re-measures when `activeKey` or `remeasureKey` changes (e.g. labels change language) and on resize.
 * `axis: "both"` also tracks top/height, for pills moving around a grid.
 */
export function useSlidingPill(
  containerRef: RefObject<HTMLElement | null>,
  pillRef: RefObject<HTMLElement | null>,
  activeKey: string,
  remeasureKey?: unknown,
  axis: "x" | "both" = "x",
) {
  const first = useRef(true)

  useLayoutEffect(() => {
    const place = (animate: boolean) => {
      const el = containerRef.current?.querySelector<HTMLElement>(`[data-pill-key="${activeKey}"]`)
      if (!el || !pillRef.current) return
      gsap.to(pillRef.current, {
        x: el.offsetLeft,
        width: el.offsetWidth,
        ...(axis === "both" && { y: el.offsetTop, height: el.offsetHeight }),
        duration: animate && !prefersReducedMotion() ? 0.5 : 0,
        ease: "power3.out",
      })
    }
    place(!first.current)
    first.current = false
    const ro = new ResizeObserver(() => place(false))
    containerRef.current?.querySelectorAll("[data-pill-key]").forEach((el) => ro.observe(el))
    return () => ro.disconnect()
  }, [containerRef, pillRef, activeKey, remeasureKey, axis])
}
