const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 60,
  size: Math.random() < 0.8 ? 2 : 3,
  delay: Math.random() * 4,
  duration: 2.5 + Math.random() * 3,
}))

/** Soft warm glow by day, twinkling stars by night. Purely decorative. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-brand/15 blur-3xl dark:bg-brand/8" />
      <div className="hidden dark:block">
        {STARS.map((s) => (
          <span
            key={s.id}
            className="star absolute rounded-full bg-foreground"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
