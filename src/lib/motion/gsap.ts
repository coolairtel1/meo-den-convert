import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Flip } from "gsap/Flip"
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin"
import { SplitText } from "gsap/SplitText"

gsap.registerPlugin(useGSAP, Flip, MorphSVGPlugin, SplitText)

export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

export const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION).matches

export { gsap, useGSAP, Flip, MorphSVGPlugin, SplitText }
