import { useLayoutEffect, useRef } from "react"
import { Flip, gsap, prefersReducedMotion } from "@/lib/motion/gsap"
import { FileCard } from "./FileCard"
import { useConverterStore, type ConvertItem } from "./store"

interface FileListProps {
  items: ConvertItem[]
  currentKey: string
  /** Output names after the rename pattern, by item id. */
  names: Map<string, string>
}

export function FileList({ items, currentKey, names }: FileListProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const seen = useRef(new Set<string>())
  const flipState = useRef<Flip.FlipState | null>(null)
  /** Card that was just dropped: its drag offset is cleared right before the Flip. */
  const dropped = useRef<HTMLElement | null>(null)
  const removeItem = useConverterStore((s) => s.removeItem)
  const moveItem = useConverterStore((s) => s.moveItem)
  const convertOne = useConverterStore((s) => s.convertOne)
  const ids = items.map((i) => i.id).join(",")

  // New cards rise in; cards glide into place after a removal or a reorder.
  useLayoutEffect(() => {
    const cards = gsap.utils.toArray<HTMLElement>("[data-item-id]", listRef.current)
    const reduce = prefersReducedMotion()
    if (dropped.current) {
      gsap.set(dropped.current, { y: 0 })
      dropped.current = null
    }
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

  const cards = () => gsap.utils.toArray<HTMLElement>("[data-item-id]", listRef.current)

  /** Reorders with a Flip so every card (including the moved one) glides to its new slot. */
  const reorder = (id: string, toIndex: number, el?: HTMLElement) => {
    flipState.current = Flip.getState(cards())
    if (el) dropped.current = el
    moveItem(id, toIndex)
    // Same position: nothing re-renders, so settle the dragged card here.
    if (items.findIndex((it) => it.id === id) === toIndex && el) {
      gsap.to(el, { y: 0, duration: 0.3, ease: "power2.out" })
      dropped.current = null
      flipState.current = null
    }
  }

  const onDrop = (id: string, el: HTMLElement) => {
    // New slot = number of other cards whose middle sits above the dropped card's middle.
    const r = el.getBoundingClientRect()
    const mid = r.top + r.height / 2
    const toIndex = cards().filter((c) => {
      if (c === el) return false
      const b = c.getBoundingClientRect()
      return b.top + b.height / 2 < mid
    }).length
    reorder(id, toIndex, el)
  }

  const onNudge = (id: string, delta: number) => {
    const from = items.findIndex((it) => it.id === id)
    reorder(id, from + delta)
  }

  const reorderable = items.length > 1

  return (
    <ul ref={listRef} className="space-y-2">
      {items.map((item, i) => (
        <FileCard
          key={item.id}
          item={item}
          index={i}
          total={items.length}
          currentKey={currentKey}
          outputName={names.get(item.id)}
          onRemove={onRemove}
          onRetry={convertOne}
          onDrop={reorderable ? onDrop : undefined}
          onNudge={reorderable ? onNudge : undefined}
        />
      ))}
    </ul>
  )
}
