import { useLayoutEffect, useRef } from "react"
import { Flip, gsap, prefersReducedMotion } from "@/lib/motion/gsap"
import { FileCard } from "./FileCard"
import { useConverterStore, type ConvertItem } from "./store"

interface FileListProps {
  items: ConvertItem[]
  currentKey: string
}

export function FileList({ items, currentKey }: FileListProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const seen = useRef(new Set<string>())
  const flipState = useRef<Flip.FlipState | null>(null)
  const removeItem = useConverterStore((s) => s.removeItem)
  const convertOne = useConverterStore((s) => s.convertOne)
  const ids = items.map((i) => i.id).join(",")

  // New cards rise in; remaining cards glide into place after a removal.
  useLayoutEffect(() => {
    const cards = gsap.utils.toArray<HTMLElement>("[data-item-id]", listRef.current)
    const reduce = prefersReducedMotion()
    if (flipState.current) {
      if (!reduce) Flip.from(flipState.current, { targets: cards, duration: 0.4, ease: "power2.inOut" })
      flipState.current = null
    }
    const fresh = cards.filter((el) => !seen.current.has(el.dataset.itemId!))
    if (fresh.length && !reduce) {
      gsap.from(fresh, { y: 18, opacity: 0, scale: 0.97, duration: 0.45, ease: "back.out(1.6)", stagger: 0.05 })
    }
    seen.current = new Set(ids.split(",").filter(Boolean))
  }, [ids])

  const onRemove = (id: string, el: HTMLElement) => {
    if (prefersReducedMotion()) return removeItem(id)
    gsap.to(el, {
      opacity: 0,
      x: -24,
      scale: 0.96,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        const rest = gsap.utils.toArray<HTMLElement>("[data-item-id]", listRef.current).filter((c) => c !== el)
        flipState.current = Flip.getState(rest)
        removeItem(id)
      },
    })
  }

  return (
    <ul ref={listRef} className="space-y-2">
      {items.map((item) => (
        <FileCard key={item.id} item={item} currentKey={currentKey} onRemove={onRemove} onRetry={convertOne} />
      ))}
    </ul>
  )
}
