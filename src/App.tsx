import { lazy, Suspense, useEffect, useRef } from "react"
import { Backdrop } from "@/components/layout/Backdrop"
import { Footer } from "@/components/layout/Footer"
import { Header } from "@/components/layout/Header"
import { ConverterPage } from "@/features/converter/ConverterPage"
import { BlackCat } from "@/features/mascot/BlackCat"
import { MoodPlayground } from "@/features/mascot/MoodPlayground"
import { PwaToasts } from "@/features/pwa/PwaToasts"
import { useSharedFiles } from "@/features/converter/useSharedFiles"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/motion/gsap"
import { useNavStore } from "@/stores/nav"
import { applyThemeClass, useThemeStore } from "@/stores/theme"

// The QR tool (qr-code-styling + jsQR) loads only when its tab is opened.
const QrPage = lazy(() => import("@/features/qr/QrPage").then((m) => ({ default: m.QrPage })))

function PageFallback() {
  return <div className="grid min-h-64 place-items-center text-muted-foreground">…</div>
}

export default function App() {
  const tab = useNavStore((s) => s.tab)
  const resolved = useThemeStore((s) => s.resolved)
  const pageRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => applyThemeClass(resolved), [resolved])
  useSharedFiles()

  // Entrance: page card and cat rise in.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from(".enter", { y: 24, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.12 })
    },
    { scope: shellRef },
  )

  // Tab switch: content slides in.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.from(pageRef.current!.children, { y: 16, opacity: 0, duration: 0.45, ease: "power2.out", stagger: 0.06 })
    },
    { dependencies: [tab], scope: pageRef },
  )

  return (
    <div ref={shellRef} className="flex min-h-dvh flex-col">
      <Backdrop />
      <Header />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 lg:grid-cols-[1fr_300px] lg:items-start lg:py-12">
        {/* On small screens the cat perches on the card's top edge; on desktop it sits in a sticky side column. */}
        <aside className="enter relative z-10 order-first mr-3 -mb-[30px] w-32 justify-self-end sm:mr-6 sm:w-36 lg:sticky lg:top-28 lg:order-last lg:mr-0 lg:mb-0 lg:w-full lg:justify-self-auto">
          <BlackCat />
          {import.meta.env.DEV && (
            <div className="mt-4 hidden lg:block">
              <MoodPlayground />
            </div>
          )}
        </aside>
        <section className="enter rounded-3xl border bg-card/90 p-5 shadow-sm backdrop-blur sm:p-8">
          <div ref={pageRef} key={tab} className="space-y-6">
            <Suspense fallback={<PageFallback />}>{tab === "convert" ? <ConverterPage /> : <QrPage />}</Suspense>
          </div>
        </section>
      </main>
      <Footer />
      <PwaToasts />
    </div>
  )
}
