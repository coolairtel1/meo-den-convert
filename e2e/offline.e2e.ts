import { expect, test } from "@playwright/test"
import { addFiles } from "./helpers"

test("keeps working offline once the service worker has cached the app", async ({ page, context }) => {
  await page.goto("/")
  // Wait until the service worker controls the page (precache done).
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }))
  })

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chuyển đổi định dạng ảnh")
  await expect(page.getByText("Bạn đang offline — mọi tính năng vẫn chạy trên máy.")).toBeVisible()

  // Conversion needs the worker and the mozjpeg WASM — both must come from the cache.
  await addFiles(page, "sticker.png")
  await page.getByRole("radio", { name: "JPG" }).click()
  await page.getByRole("button", { name: "Chuyển đổi 1 ảnh" }).click()
  await expect(page.getByRole("button", { name: "Tải về sticker.jpg" })).toBeVisible({ timeout: 30_000 })

  // The lazy QR page chunk is precached too.
  await page.getByRole("tab", { name: "Mã QR" }).click()
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tạo & tuỳ biến mã QR")
})
