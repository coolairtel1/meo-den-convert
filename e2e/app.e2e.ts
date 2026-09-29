import { expect, test } from "@playwright/test"

test("loads in Vietnamese with the cat, and switches language", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle("Mèo Đen Convert")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chuyển đổi định dạng ảnh")
  await expect(page.getByRole("button", { name: /Tủm — mèo đen linh vật/ })).toBeVisible()

  await page.getByRole("button", { name: "Switch to English" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Convert image formats")
  await expect(page.locator("html")).toHaveAttribute("lang", "en")

  // Choice survives a reload.
  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Convert image formats")
})

test("cycles themes and remembers the choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" })
  await page.goto("/")
  const html = page.locator("html")
  const toggle = page.getByRole("button", { name: /Đổi giao diện/ })
  await expect(html).not.toHaveClass(/dark/)
  await toggle.click() // system → light
  await toggle.click() // light → dark
  await expect(html).toHaveClass(/dark/)
  await page.reload()
  await expect(html).toHaveClass(/dark/)
})

test("switches tabs via the nav and the URL hash", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("tab", { name: "Mã QR" }).click()
  await expect(page).toHaveURL(/#\/qr$/)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tạo & tuỳ biến mã QR")
  await page.goto("/#/convert")
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chuyển đổi định dạng ảnh")
})

test("Tủm introduces itself on the first visit and welcomes you back in a later session", async ({ context }) => {
  const first = await context.newPage()
  await first.goto("/")
  await expect(first.getByText("Xin chào! Tui là Tủm 🐾")).toBeAttached()
  await expect(first.getByText(/ảnh của bạn được xử lý ngay trên máy/)).toBeAttached({ timeout: 10_000 })

  // A new tab is a new session but shares localStorage: Tủm remembers you.
  const later = await context.newPage()
  await later.goto("/")
  await expect(later.getByText("I'm Tủm, welcome back")).toBeAttached()
})
