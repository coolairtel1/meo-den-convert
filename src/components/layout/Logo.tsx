import { useRef } from "react"
import { gsap, useGSAP } from "@/lib/motion/gsap"

export function Logo() {
  const ref = useRef<HTMLDivElement>(null)

  const { contextSafe } = useGSAP({ scope: ref })
  const wiggle = contextSafe(() => {
    gsap.fromTo(".logo-ears", { rotation: 0 }, { rotation: 8, transformOrigin: "50% 100%", yoyo: true, repeat: 3, duration: 0.07 })
    gsap.fromTo(".logo-eyes", { scaleY: 1 }, { scaleY: 0.1, transformOrigin: "50% 50%", yoyo: true, repeat: 1, duration: 0.08 })
  })

  return (
    <div ref={ref} onPointerEnter={wiggle} className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" className="size-9 shrink-0" aria-hidden>
        <g className="logo-ears">
          <path
            d="M12 30 L9 6 L27 18 Z M52 30 L55 6 L37 18 Z"
            fill="var(--cat-fur)"
            stroke="var(--cat-fur)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path d="M14 24 L13 12 L22 19 Z M50 24 L51 12 L42 19 Z" fill="var(--cat-ear)" />
        </g>
        <ellipse cx="32" cy="36" rx="26" ry="23" fill="var(--cat-fur)" stroke="var(--cat-rim)" strokeWidth="1.5" />
        <g className="logo-eyes">
          <ellipse className="cat-eye-ball" cx="22" cy="34" rx="6" ry="6.5" fill="var(--cat-eye)" />
          <ellipse className="cat-eye-ball" cx="42" cy="34" rx="6" ry="6.5" fill="var(--cat-eye)" />
          <ellipse cx="22" cy="34" rx="1.8" ry="5" fill="var(--cat-pupil)" />
          <ellipse cx="42" cy="34" rx="1.8" ry="5" fill="var(--cat-pupil)" />
        </g>
        <path d="M29.5 43 L34.5 43 L32 46 Z" fill="var(--cat-nose)" />
      </svg>
      <span className="font-display text-lg leading-none font-bold tracking-tight sm:text-xl">
        Mèo Đen{" "}
        <span className="rounded-md bg-brand px-1.5 py-0.5 text-brand-foreground">Convert</span>
      </span>
    </div>
  )
}
