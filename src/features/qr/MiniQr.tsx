import QRCodeStyling from "qr-code-styling"
import { useEffect, useRef } from "react"
import { toQrOptions, type QrStyle } from "@/lib/qr/style"
import { cn } from "@/lib/utils"

/** Tiny static QR used as a visual swatch for styles and presets. */
export function MiniQr({ style, className }: { style: QrStyle; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const key = JSON.stringify(style)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const qr = new QRCodeStyling({ ...toQrOptions({ ...style, logo: null, margin: 6 }, "MEO", 96), type: "svg" })
    el.replaceChildren()
    qr.append(el)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures style
  }, [key])

  return <div ref={ref} aria-hidden className={cn("[&_svg]:size-full", className)} />
}
