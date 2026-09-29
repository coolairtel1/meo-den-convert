import { useEffect, useId, useRef } from "react"
import { useTranslation } from "react-i18next"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap"
import { cn } from "@/lib/utils"
import { CatSvg } from "./CatSvg"
import { useCatStore, type CatMood } from "./catStore"
import { burst, type Particle } from "./particles"
import { useCatLines, type LineKey } from "./useCatLines"

const SLEEP_AFTER_MS = 30_000
const EASTER_EGG_CLICKS = 5
const GREETED_KEY = "meoden.greeted"

// Pivot points in SVG user space (viewBox 0 0 220 220).
const TAIL_ORIGIN = "140 196"
const EAR_L_ORIGIN = "82 70"
const EAR_R_ORIGIN = "138 70"
const CENTER_ORIGIN = "110 140"
const BELL_ORIGIN = "110 132"
const PAW_L_ORIGIN = "94 204"

/** Working animation speeds up as the job progresses. */
const workSpeed = (progress: number) => 0.8 + progress * 1.4

interface BlackCatProps {
  className?: string
}

export function BlackCat({ className }: BlackCatProps) {
  const { t } = useTranslation()
  const pickLine = useCatLines()
  const mood = useCatStore((s) => s.mood)
  const progress = useCatStore((s) => s.progress)
  const message = useCatStore((s) => s.message)
  const presentImage = useCatStore((s) => s.presentImage)
  const presentId = useCatStore((s) => s.presentId)
  const setMood = useCatStore((s) => s.setMood)
  const say = useCatStore((s) => s.say)

  const wrapRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const moodRef = useRef<CatMood>(mood)
  const prevMoodRef = useRef<CatMood>(mood)
  const clicksRef = useRef<number[]>([])
  const ambientRef = useRef<{ breath?: gsap.core.Tween; tail?: gsap.core.Tween }>({})
  const moodTlRef = useRef<gsap.core.Timeline | null>(null)
  const loopsRef = useRef<gsap.core.Animation[]>([])
  const workLoopRef = useRef<gsap.core.Timeline | null>(null)
  const lastMoveRef = useRef(0)
  const hoverRef = useRef(false)

  const idPrefix = useId().replace(/[^a-zA-Z0-9]/g, "")

  const speak = (key: LineKey) => {
    const text = pickLine(key)
    if (text) say(text)
  }

  // Ambient life: breathing, tail sway, blinks, ear twitches, idle fidgets, eyes following the pointer.
  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const breath = gsap.to(".cat-body", {
          scaleY: 1.025,
          transformOrigin: "50% 100%",
          duration: 1.8,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        })
        const tail = gsap.fromTo(
          ".cat-tail",
          { rotation: -6, svgOrigin: TAIL_ORIGIN },
          { rotation: 8, svgOrigin: TAIL_ORIGIN, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 },
        )
        ambientRef.current = { breath, tail }

        const calls: gsap.core.Tween[] = []
        /** Re-schedules `fn` at a random interval for as long as this context lives. */
        const every = (min: number, max: number, fn: () => void, first = min) => {
          const tick = () => {
            fn()
            calls.push(gsap.delayedCall(gsap.utils.random(min, max), tick))
          }
          calls.push(gsap.delayedCall(first, tick))
        }

        every(2, 6, () => {
          if (moodRef.current === "sleep") return
          gsap
            .timeline()
            .to(".cat-eye", { scaleY: 0.1, transformOrigin: "50% 50%", duration: 0.07, ease: "power2.in" })
            .to(".cat-eye", { scaleY: 1, duration: 0.12, ease: "power2.out" })
        })

        every(5, 11, () => {
          if (moodRef.current !== "idle" || hoverRef.current) return
          const left = Math.random() < 0.5
          gsap.fromTo(
            left ? ".cat-ear-l" : ".cat-ear-r",
            { rotation: 0 },
            {
              rotation: left ? -10 : 10,
              svgOrigin: left ? EAR_L_ORIGIN : EAR_R_ORIGIN,
              duration: 0.08,
              yoyo: true,
              repeat: 3,
              ease: "power1.inOut",
            },
          )
        })

        // Idle fidgets: glance around, tilt the head, flick the tail.
        every(
          7,
          14,
          () => {
            if (moodRef.current !== "idle" || hoverRef.current) return
            const pick = gsap.utils.random(["look", "tilt", "flick"])
            if (pick === "look" && performance.now() - lastMoveRef.current > 3000) {
              gsap
                .timeline()
                .to(".cat-pupils", { x: -4.5, y: 0, duration: 0.35, ease: "power2.inOut" })
                .to(".cat-pupils", { x: 4.5, duration: 0.5, delay: 0.5, ease: "power2.inOut" })
                .to(".cat-pupils", { x: 0, duration: 0.35, delay: 0.5 })
            } else if (pick === "tilt") {
              gsap.to(".cat-head-pose", {
                rotation: gsap.utils.random([-10, 10]),
                transformOrigin: "50% 90%",
                duration: 0.45,
                ease: "back.out(2)",
                yoyo: true,
                repeat: 1,
                repeatDelay: 0.9,
              })
            } else {
              tail.timeScale(5)
              calls.push(gsap.delayedCall(0.5, () => tail.timeScale(1)))
            }
          },
          9,
        )

        const headX = gsap.quickTo(".cat-head", "x", { duration: 0.6, ease: "power3.out" })
        const headY = gsap.quickTo(".cat-head", "y", { duration: 0.6, ease: "power3.out" })
        const pupilX = gsap.quickTo(".cat-pupils", "x", { duration: 0.3, ease: "power3.out" })
        const pupilY = gsap.quickTo(".cat-pupils", "y", { duration: 0.3, ease: "power3.out" })

        const onMove = (e: PointerEvent) => {
          lastMoveRef.current = performance.now()
          const svg = svgRef.current
          // Asleep: eyes closed. Working: eyes on the yarn.
          if (!svg || moodRef.current === "sleep" || moodRef.current === "working") return
          const r = svg.getBoundingClientRect()
          // Head centre sits ~43% down the artwork.
          const dx = gsap.utils.clamp(-1, 1, (e.clientX - (r.left + r.width / 2)) / 320)
          const dy = gsap.utils.clamp(-1, 1, (e.clientY - (r.top + r.height * 0.43)) / 320)
          pupilX(dx * 4.5)
          pupilY(dy * 3.5)
          headX(dx * 4)
          headY(dy * 2.5)
        }
        window.addEventListener("pointermove", onMove)

        return () => {
          window.removeEventListener("pointermove", onMove)
          calls.forEach((c) => c.kill())
          ambientRef.current = {}
        }
      })
    },
    { scope: wrapRef },
  )

  const { contextSafe } = useGSAP({ scope: wrapRef })

  const fx = contextSafe((kinds: Particle[], count: number, radial = false) => {
    if (wrapRef.current && !prefersReducedMotion()) burst(wrapRef.current, kinds, count, { radial })
  })

  // Speech bubble: pops in for each new message, stays long enough to read.
  useGSAP(
    () => {
      const el = bubbleRef.current
      if (!message || !el) return
      const reduce = prefersReducedMotion()
      gsap.killTweensOf(el)
      gsap
        .timeline()
        .fromTo(
          el,
          { opacity: 0, scale: 0.5, y: 8 },
          { opacity: 1, scale: 1, y: 0, duration: reduce ? 0.01 : 0.35, ease: "back.out(2.5)" },
        )
        .to(el, { opacity: 0, y: reduce ? 0 : -6, duration: 0.3, delay: 1.6 + message.text.length * 0.045 })
    },
    { scope: wrapRef, dependencies: [message?.id] },
  )

  // Mood poses. Each mood resets to neutral first, then layers its own pose/loop on top.
  useGSAP(
    () => {
      const prev = prevMoodRef.current
      prevMoodRef.current = mood
      moodRef.current = mood
      const reduce = prefersReducedMotion()

      moodTlRef.current?.kill()
      loopsRef.current.forEach((a) => a.kill())
      loopsRef.current = []
      workLoopRef.current = null
      gsap.killTweensOf([".cat-head-pose", ".cat-zzz", ".cat-bell", ".cat-all", ".cat-paw-l", ".cat-yarn-spin", ".cat-sign"])

      const tl = gsap.timeline({ defaults: { duration: 0.35, ease: "power2.out" } })
      moodTlRef.current = tl
      // Waking up keeps the eyes shut through the yawn, so the reset must not reopen them.
      const waking = prev === "sleep" && mood === "idle"

      tl.to(".cat-all", { y: 0, rotation: 0, scaleX: 1, scaleY: 1, svgOrigin: CENTER_ORIGIN }, 0)
        .to(".cat-head-pose", { rotation: 0, y: 0, transformOrigin: "50% 90%" }, 0)
        .to(".cat-ear-l", { rotation: 0, scaleY: 1, svgOrigin: EAR_L_ORIGIN }, 0)
        .to(".cat-ear-r", { rotation: 0, scaleY: 1, svgOrigin: EAR_R_ORIGIN }, 0)
        .to(".cat-pupil", { scaleX: 1, scaleY: 1, transformOrigin: "50% 50%" }, 0)
        .to(".cat-mouth-open", { opacity: 0, scaleY: 0, transformOrigin: "50% 0%", duration: 0.2 }, 0)
        .to(".cat-blush", { opacity: 0 }, 0)
        .to(".cat-zzz", { opacity: 0, y: 0, duration: 0.2 }, 0)
        .to(".cat-paw-l", { x: 0, y: 0, rotation: 0, svgOrigin: PAW_L_ORIGIN }, 0)
        .to(".cat-yarn", { opacity: 0, scale: 0.6, transformOrigin: "50% 100%", duration: 0.25 }, 0)
        .to(".cat-yarn-spin", { x: 0, rotation: 0, transformOrigin: "50% 50%" }, 0)
        .to(".cat-sign", { opacity: 0, y: 30, rotation: 0, transformOrigin: "50% 100%", duration: 0.25 }, 0)
        .to([".cat-paw-l", ".cat-paw-r"], { opacity: 1, duration: 0.2 }, 0)
      if (!waking) tl.to(".cat-eye-open", { opacity: 1, duration: 0.2 }, 0).to(".cat-eye-closed", { opacity: 0, duration: 0.2 }, 0)
      if (prev === "working") tl.to(".cat-pupils", { x: 0, y: 0 }, 0)
      const { breath, tail } = ambientRef.current
      breath?.timeScale(mood === "sleep" ? 0.45 : 1)
      tail?.timeScale(mood === "sleep" ? 0.45 : mood === "working" ? 2.2 : 1)

      // Looping extras start once the pose settles, and only when motion is allowed.
      const loop = (fn: () => gsap.core.Animation[]) => {
        if (!reduce) tl.call(() => loopsRef.current.push(...fn()), [], 0.35)
      }

      switch (mood) {
        case "idle":
          if (waking) {
            // Wake up with a big yawn.
            tl.to(".cat-mouth-open", { opacity: 1, scaleY: 1, duration: 0.35 }, 0.1)
              .to(".cat-head-pose", { rotation: -6, y: -3, duration: 0.5, ease: "sine.inOut" }, 0.1)
              .to(".cat-ear-l", { rotation: -14 }, 0.1)
              .to(".cat-ear-r", { rotation: 14 }, 0.1)
              .to(".cat-mouth-open", { opacity: 0, scaleY: 0, duration: 0.25 }, 1)
              .to(".cat-head-pose", { rotation: 0, y: 0, duration: 0.4 }, 1)
              .to([".cat-ear-l", ".cat-ear-r"], { rotation: 0 }, 1)
              .to(".cat-eye-closed", { opacity: 0, duration: 0.15 }, 1.1)
              .to(".cat-eye-open", { opacity: 1, duration: 0.15 }, 1.1)
            speak("wake")
          }
          break

        case "dragover":
          tl.to(".cat-ear-l", { scaleY: 1.12, rotation: 6 }, 0)
            .to(".cat-ear-r", { scaleY: 1.12, rotation: -6 }, 0)
            .to(".cat-pupil", { scaleX: 2.6, scaleY: 1.05, ease: "back.out(3)" }, 0)
            .to(".cat-all", { y: -6, ease: "back.out(2)" }, 0)
          loop(() => [gsap.to(".cat-all", { y: -10, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: -1 })])
          speak("dragover")
          break

        case "working":
          tl.to(".cat-yarn", { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, 0)
            .to(".cat-head-pose", { rotation: -7, y: 3 }, 0)
            .to(".cat-pupils", { x: -3.5, y: 3.5 }, 0)
            .to(".cat-pupil", { scaleX: 1.6 }, 0)
          loop(() => {
            // Swat the yarn, watch it roll away, reel it back.
            const w = gsap
              .timeline({ repeat: -1, repeatDelay: 0.15 })
              .to(".cat-paw-l", { y: -16, x: -4, rotation: -25, svgOrigin: PAW_L_ORIGIN, duration: 0.2, ease: "power2.out" })
              .to(".cat-paw-l", { y: -3, x: -16, rotation: -10, duration: 0.12, ease: "power3.in" })
              .to(".cat-yarn-spin", { x: -12, rotation: -160, duration: 0.55, ease: "power2.out" }, "<0.08")
              .to(".cat-bell", { rotation: 14, svgOrigin: BELL_ORIGIN, duration: 0.12, yoyo: true, repeat: 1 }, "<")
              .to(".cat-paw-l", { y: 0, x: 0, rotation: 0, duration: 0.3, ease: "power2.inOut" }, "<0.1")
              .to(".cat-yarn-spin", { x: 0, rotation: 0, duration: 0.6, ease: "sine.inOut" }, ">-0.1")
            w.timeScale(workSpeed(useCatStore.getState().progress))
            workLoopRef.current = w
            return [w]
          })
          if (prev !== "working") speak("working")
          break

        case "success":
          tl.to(".cat-pupil", { scaleX: 2.2, ease: "back.out(3)" }, 0)
            .to(".cat-blush", { opacity: 0.85 }, 0)
            .to(".cat-mouth-open", { opacity: 1, scaleY: 0.8, duration: 0.15 }, 0.05)
            .to(".cat-all", { y: -34, scaleY: 1.06, duration: 0.3, ease: "power2.out" }, 0.05)
            .to(".cat-all", { y: 0, scaleY: 1, duration: 0.55, ease: "bounce.out" }, 0.35)
            .to(".cat-mouth-open", { opacity: 0, scaleY: 0, duration: 0.2 }, 0.6)
            .to(".cat-all", { scaleY: 0.93, scaleX: 1.05, duration: 0.1 }, 0.62)
            .to(".cat-all", { scaleY: 1, scaleX: 1, duration: 0.45, ease: "elastic.out(1, 0.4)" }, 0.72)
            .add(() => fx(["paw", "sparkle"], 10, true), 0.15)
            .to({}, { duration: 1.2 })
            .call(() => {
              if (useCatStore.getState().mood === "success") setMood("idle")
            })
          speak("success")
          break

        case "error":
          tl.to(".cat-ear-l", { rotation: -28 }, 0)
            .to(".cat-ear-r", { rotation: 28 }, 0)
            .to(".cat-pupil", { scaleX: 0.6, scaleY: 0.8 }, 0)
            .to(".cat-head-pose", { y: 4 }, 0)
            .to(".cat-head-pose", { keyframes: { rotation: [0, -9, 9, -7, 7, -3, 0] }, duration: 0.7, ease: "none" }, 0.15)
            .to({}, { duration: 1.4 })
            .call(() => {
              if (useCatStore.getState().mood === "error") setMood("idle")
            })
          speak("error")
          break

        case "present":
          // Hold the sign up high, wobble it proudly, then put it away.
          tl.to([".cat-paw-l", ".cat-paw-r"], { opacity: 0, duration: 0.15 }, 0)
            .fromTo(".cat-sign", { opacity: 0, y: 40 }, { opacity: 1, y: -6, duration: 0.5, ease: "back.out(2.2)" }, 0.05)
            .to(".cat-pupil", { scaleX: 2, ease: "back.out(3)" }, 0)
            .to(".cat-blush", { opacity: 0.7 }, 0.2)
            .to(".cat-head-pose", { rotation: 6, duration: 0.4, ease: "back.out(2)" }, 0.3)
            .to(".cat-sign", { keyframes: { rotation: [0, -4, 4, -3, 3, 0] }, duration: 1.2, ease: "sine.inOut" }, 0.55)
            .add(() => fx(["sparkle", "star"], 6, true), 0.4)
            .to({}, { duration: 1.4 })
            .call(() => {
              if (useCatStore.getState().mood === "present") setMood("idle")
            })
          speak("present")
          break

        case "sleep":
          tl.to(".cat-eye-open", { opacity: 0, duration: 0.3 }, 0)
            .to(".cat-eye-closed", { opacity: 1, duration: 0.3 }, 0.1)
            .to(".cat-head-pose", { rotation: 9, y: 7, duration: 1.2, ease: "sine.inOut" }, 0)
            .to(".cat-ear-l", { rotation: -10, duration: 1 }, 0)
            .to(".cat-ear-r", { rotation: 10, duration: 1 }, 0)
          loop(() =>
            gsap.utils.toArray<SVGTextElement>(".cat-zzz").map((z, i) =>
              gsap
                .timeline({ repeat: -1, delay: i * 0.7, repeatDelay: 0.4 })
                .fromTo(z, { opacity: 0, y: 6, x: 0 }, { opacity: 1, y: -3, x: 3, duration: 0.9, ease: "sine.out" })
                .to(z, { opacity: 0, y: -14, x: 7, duration: 1.1, ease: "sine.in" }),
            ),
          )
          if (reduce) tl.set(".cat-zzz", { opacity: 1 })
          break
      }

      if (reduce) tl.progress(1)
    },
    { scope: wrapRef, dependencies: [mood, presentId] },
  )

  // Swat faster as the job advances.
  useEffect(() => {
    workLoopRef.current?.timeScale(workSpeed(progress))
  }, [progress])

  // Say hello once per browser session.
  useEffect(() => {
    let greeted = false
    try {
      greeted = sessionStorage.getItem(GREETED_KEY) === "1"
    } catch {
      // storage unavailable: greet anyway
    }
    if (greeted) return
    // Flag only when the greeting actually fires, so StrictMode's double mount doesn't swallow it.
    const id = window.setTimeout(() => {
      speak("greet")
      try {
        sessionStorage.setItem(GREETED_KEY, "1")
      } catch {
        // ignore
      }
    }, 1200)
    return () => window.clearTimeout(id)
  }, [])

  // Doze off after a while without activity; any activity wakes the cat.
  useEffect(() => {
    let timer = 0
    const arm = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (useCatStore.getState().mood === "idle") setMood("sleep")
      }, SLEEP_AFTER_MS)
    }
    const onActivity = () => {
      if (useCatStore.getState().mood === "sleep") setMood("idle")
      arm()
    }
    const events = ["pointermove", "pointerdown", "keydown", "dragenter", "wheel"] as const
    events.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }))
    arm()
    return () => {
      window.clearTimeout(timer)
      events.forEach((ev) => window.removeEventListener(ev, onActivity))
    }
  }, [setMood])

  // Curious when hovered: ears perk up, pupils widen.
  const onHover = contextSafe((over: boolean) => {
    hoverRef.current = over
    if (moodRef.current !== "idle" || prefersReducedMotion()) return
    const ease = over ? "back.out(3)" : "power2.out"
    gsap.to(".cat-ear-l", { scaleY: over ? 1.08 : 1, rotation: over ? 4 : 0, svgOrigin: EAR_L_ORIGIN, duration: 0.3, ease })
    gsap.to(".cat-ear-r", { scaleY: over ? 1.08 : 1, rotation: over ? -4 : 0, svgOrigin: EAR_R_ORIGIN, duration: 0.3, ease })
    gsap.to(".cat-pupil", { scaleX: over ? 1.8 : 1, transformOrigin: "50% 50%", duration: 0.3, ease })
  })

  const pet = contextSafe(() => {
    if (moodRef.current === "sleep") setMood("idle")

    const now = performance.now()
    clicksRef.current = [...clicksRef.current.filter((ts) => now - ts < 2000), now]
    const reduce = prefersReducedMotion()

    if (clicksRef.current.length >= EASTER_EGG_CLICKS && !reduce) {
      clicksRef.current = []
      speak("easterEgg")
      gsap
        .timeline()
        .to(".cat-all", { y: -50, duration: 0.35, ease: "power2.out" })
        .to(".cat-all", { rotation: 360, svgOrigin: CENTER_ORIGIN, duration: 0.6, ease: "power2.inOut" }, 0.1)
        .to(".cat-all", { y: 0, duration: 0.5, ease: "bounce.out" }, 0.55)
        .set(".cat-all", { rotation: 0 })
      fx(["star", "sparkle", "paw", "heart"], 12, true)
      return
    }

    speak("pet")
    fx(["heart", "heart", "sparkle"], 3)
    if (reduce) return
    gsap
      .timeline()
      .to(".cat-all", { scaleY: 0.94, scaleX: 1.04, svgOrigin: "110 210", duration: 0.1 })
      .to(".cat-all", { scaleY: 1, scaleX: 1, duration: 0.6, ease: "elastic.out(1, 0.35)" })
    gsap.fromTo(".cat-blush", { opacity: 0 }, { opacity: 0.8, duration: 0.2, yoyo: true, repeat: 1, repeatDelay: 0.9 })
    gsap.fromTo(".cat-bell", { rotation: -25 }, { rotation: 0, svgOrigin: BELL_ORIGIN, duration: 1, ease: "elastic.out(1.2, 0.25)" })
  })

  return (
    <div ref={wrapRef} className={cn("relative select-none", className)}>
      {/* Bubble sits left of the cat on small screens (cat is perched at the right), right of it on desktop. */}
      <div
        ref={bubbleRef}
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute top-0 right-[62%] z-10 w-max max-w-[13rem] rounded-2xl rounded-br-sm border bg-card px-3 py-1.5 font-display text-sm leading-snug font-semibold text-balance text-card-foreground opacity-0 shadow-md lg:right-auto lg:left-[58%] lg:rounded-br-2xl lg:rounded-bl-sm"
      >
        {message?.text}
      </div>

      <CatSvg
        ref={svgRef}
        idPrefix={idPrefix}
        label={t("cat.label")}
        signImage={presentImage}
        onClick={pet}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            pet()
          }
        }}
        onPointerEnter={() => onHover(true)}
        onPointerLeave={() => onHover(false)}
      />
    </div>
  )
}
