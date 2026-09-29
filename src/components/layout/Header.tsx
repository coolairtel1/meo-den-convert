import { LangToggle } from "./LangToggle"
import { Logo } from "./Logo"
import { NavTabs } from "./NavTabs"
import { ThemeToggle } from "./ThemeToggle"

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3">
        <Logo />
        <div className="order-last flex w-full justify-center sm:order-none sm:w-auto">
          <NavTabs />
        </div>
        <div className="flex items-center gap-1">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
