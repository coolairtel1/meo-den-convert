import { useRef } from "react"
import { flushSync } from "react-dom"
import { useTranslation } from "react-i18next"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap"
import { applyThemeClass, resolveTheme, useThemeStore, type ThemeMode } from "@/stores/theme"

const NEXT: Record<ThemeMode, ThemeMode> = { system: "light", light: "dark", dark: "system" }

const SUN_CORE = "M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10Z"
const MOON = "M20.5 13.2A8.5 8.5 0 1 1 10.8 3.5a6.6 6.6 0 0 0 9.7 9.7Z"

export function ThemeToggle() {
  const { t } = useTranslation()
  const mode = useThemeStore((s) => s.mode)
  const resolved = useThemeStore((s) => s.resolved)
  const setMode = useThemeStore((s) => s.setMode)
  const ref = useRef<HTMLButtonElement>(null)
  const first = useRef(true)

  // Sun ⇄ moon morph.
  useGSAP(
    () => {
      const dark = resolved === "dark"
      const d = first.current || prefersReducedMotion() ? 0 : 0.55
      first.current = false
      gsap.to(".tt-core", { morphSVG: dark ? MOON : SUN_CORE, duration: d, ease: "power3.inOut" })
      gsap.to(".tt-rays", {
        scale: dark ? 0 : 1,
        rotation: dark ? -90 : 0,
        opacity: dark ? 0 : 1,
        transformOrigin: "50% 50%",
        duration: d,
        ease: "power3.inOut",
      })
      gsap.to(".tt-svg", { rotation: dark ? -25 : 0, transformOrigin: "50% 50%", duration: d, ease: "back.out(2)" })
    },
    { scope: ref, dependencies: [resolved] },
  )

  const onClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const next = NEXT[mode]
    const apply = () => {
      flushSync(() => setMode(next))
      applyThemeClass(resolveTheme(next))
    }
    const changesLook = resolveTheme(next) !== resolved
    if (!document.startViewTransition || !changesLook || prefersReducedMotion()) {
      apply()
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const vt = document.startViewTransition(apply)
    vt.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(.65,0,.35,1)", pseudoElement: "::view-transition-new(root)" },
      )
    })
  }

  const label = t(`theme.${mode}`)
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      title={label}
      aria-label={t("theme.toggle", { mode: label })}
      className="relative grid size-9 place-items-center rounded-full text-foreground transition-[background-color,scale] hover:bg-muted active:scale-90"
    >
      <svg className="tt-svg size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path className="tt-core" d={SUN_CORE} />
        <g className="tt-rays" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 1.5v2M12 20.5v2M1.5 12h2M20.5 12h2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M4.6 19.4 6 18M18 6l1.4-1.4" />
        </g>
      </svg>
      {mode === "system" && (
        <span className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-brand text-[9px] font-bold text-brand-foreground">
          A
        </span>
      )}
    </button>
  )
}
