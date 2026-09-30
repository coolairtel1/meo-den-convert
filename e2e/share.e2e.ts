import fs from "node:fs"
import { expect, test } from "@playwright/test"
import { addFiles, fixture } from "./helpers"

// Record what the app hands to the system share sheet (headless Chromium has no real one).
const stubShare = `
  window.__shared = [];
  navigator.canShare = () => true;
  navigator.share = async (data) => {
    const files = await Promise.all((data.files || []).map(async (f) => ({ name: f.name, type: f.type, size: f.size, head: Array.from(new Uint8Array(await f.slice(0, 4).arrayBuffer())) })));
    window.__shared.push({ title: data.title, files });
  };
`

test("shares converted images through the system share sheet", async ({ page }) => {
  await page.addInitScript(stubShare)
  await page.goto("/")
  await addFiles(page, "sticker.png", "photo.jpg")
  await page.getByRole("radio", { name: "WebP" }).click()
  await page.getByRole("button", { name: "Chuyển đổi 2 ảnh" }).click()
  await expect(page.getByRole("button", { name: /^Tải về / })).toHaveCount(2, { timeout: 30_000 })

  await page.getByRole("button", { name: "Chia sẻ sticker.webp" }).click()
  await page.getByRole("button", { name: "Chia sẻ tất cả" }).click()
  await expect(page.getByText("Gửi đi rồi nè!")).toBeAttached()

  const shared = await page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared)
  expect(shared).toEqual([
    { files: [{ name: "sticker.webp", type: "image/webp", size: expect.any(Number), head: [82, 73, 70, 70] }] },
    {
      files: [
        { name: "sticker.webp", type: "image/webp", size: expect.any(Number), head: [82, 73, 70, 70] },
        { name: "photo.webp", type: "image/webp", size: expect.any(Number), head: [82, 73, 70, 70] },
      ],
    },
  ])
})

test("shares a QR code image", async ({ page }) => {
  await page.addInitScript(stubShare)
  await page.goto("/#/qr")
  await page.getByRole("textbox", { name: "Đường link" }).fill("meoden.app")
  await expect(page.getByText("Quét thử OK — nội dung chuẩn")).toBeVisible()
  await page.getByRole("button", { name: "Chia sẻ", exact: true }).click()
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __shared: { files: { name: string }[] }[] }).__shared))
    .toEqual([{ files: [expect.objectContaining({ name: "meoden-qr-url.png", type: "image/png" })] }])
})

test("hides share buttons where the browser can't share files", async ({ page }) => {
  await page.addInitScript(`navigator.canShare = () => false`)
  await page.goto("/")
  await addFiles(page, "sticker.png")
  await page.getByRole("button", { name: "Chuyển đổi 1 ảnh" }).click()
  await expect(page.getByRole("button", { name: /^Tải về / })).toHaveCount(1, { timeout: 30_000 })
  await expect(page.getByRole("button", { name: /^Chia sẻ/ })).toHaveCount(0)
})

test("receives images from the Android share sheet (share target)", async ({ page }) => {
  await page.goto("/")
  // Share targets only work once the service worker controls the app (i.e. it's installed).
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (!navigator.serviceWorker.controller)
      await new Promise((r) => navigator.serviceWorker.addEventListener("controllerchange", r, { once: true }))
  })

  // Exactly what Android sends: a multipart POST to the manifest's share_target action.
  const png = fs.readFileSync(fixture("sticker.png")).toString("base64")
  const jpg = fs.readFileSync(fixture("photo.jpg")).toString("base64")
  const landed = await page.evaluate(
    async ([png, jpg]) => {
      const bytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
      const form = new FormData()
      form.append("images", new File([bytes(png)], "Ảnh chụp màn hình.png", { type: "image/png" }))
      form.append("images", new File([bytes(jpg)], "IMG_2024.jpg", { type: "image/jpeg" }))
      const res = await fetch("/share-target", { method: "POST", body: form })
      return res.url
    },
    [png, jpg],
  )
  // (Response.url drops the #fragment; a real navigation keeps it, and the app switches tab anyway.)
  expect(landed).toMatch(/\?shared=2$/)

  await page.goto("/#/qr")
  await page.goto(landed)
  await expect(page.getByText("Nhận 2 ảnh từ máy rồi nè!")).toBeAttached()
  await expect(page.locator("[data-item-id] p.truncate")).toHaveText(["Ảnh chụp màn hình.png", "IMG_2024.jpg"])
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Chuyển đổi định dạng ảnh")
  // The flag is removed so a reload doesn't re-import.
  await expect(page).not.toHaveURL(/shared=/)

  await page.getByRole("button", { name: "Chuyển đổi 2 ảnh" }).click()
  await expect(page.getByRole("button", { name: /^Tải về / })).toHaveCount(2, { timeout: 30_000 })
})
