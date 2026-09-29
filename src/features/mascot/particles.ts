import { gsap } from "@/lib/motion/gsap"

const PAW_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="12" cy="15.5" rx="5.5" ry="4.5"/><circle cx="5.5" cy="10" r="2.3"/><circle cx="9.5" cy="6" r="2.3"/><circle cx="14.5" cy="6" r="2.3"/><circle cx="18.5" cy="10" r="2.3"/></svg>'

export type Particle = "paw" | "heart" | "sparkle" | "star"

const GLYPH: Record<Exclude<Particle, "paw">, string> = { heart: "♥", sparkle: "✦", star: "★" }
const COLOR: Record<Particle, string> = {
  paw: "text-brand",
  heart: "text-[var(--cat-nose)]",
  sparkle: "text-brand",
  star: "text-brand",
}

interface BurstOptions {
  /** Radial burst (celebrations) instead of floating upward (pets). */
  radial?: boolean
}

/** Spawns short-lived decorative particles from the cat's head inside `container`. */
export function burst(container: HTMLElement, kinds: Particle[], count: number, { radial }: BurstOptions = {}) {
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length]
    const el = document.createElement("span")
    el.setAttribute("aria-hidden", "true")
    el.className = `pointer-events-none absolute left-1/2 top-[30%] block select-none text-lg leading-none ${COLOR[kind]}`
    if (kind === "paw") {
      el.innerHTML = PAW_SVG
      el.style.width = el.style.height = "18px"
    } else {
      el.textContent = GLYPH[kind]
    }
    container.appendChild(el)

    const angle = radial ? (i / count) * Math.PI * 2 + gsap.utils.random(-0.3, 0.3) : 0
    const dist = gsap.utils.random(70, 110)
    gsap.fromTo(
      el,
      { xPercent: -50, x: gsap.utils.random(-12, 12), y: 0, scale: 0.2, opacity: 1, rotation: gsap.utils.random(-40, 40) },
      {
        x: radial ? Math.cos(angle) * dist : `+=${gsap.utils.random(-70, 70)}`,
        y: radial ? Math.sin(angle) * dist * 0.8 - 20 : gsap.utils.random(-110, -60),
        scale: gsap.utils.random(0.9, 1.3),
        rotation: `+=${gsap.utils.random(-60, 60)}`,
        opacity: 0,
        duration: gsap.utils.random(0.9, 1.4),
        ease: "power2.out",
        onComplete: () => el.remove(),
      },
    )
  }
}
