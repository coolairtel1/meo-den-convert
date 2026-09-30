import { expect, test, type Page } from "@playwright/test"
import { unzipSync } from "fflate"
import { addFiles, downloadBytes } from "./helpers"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

const convertAndGetSize = async (page: Page, count = 1) => {
  await page.getByRole("button", { name: `Chuyển đổi ${count} ảnh` }).click()
  await expect(page.getByRole("button", { name: /^Tải về / })).toHaveCount(count, { timeout: 30_000 })
}

test("crops to 1:1 in the editor", async ({ page }) => {
  await addFiles(page, "photo.jpg") // 800×600
  await page.getByRole("button", { name: "Sửa photo.jpg" }).click()
  const dialog = page.getByRole("dialog", { name: "Sửa ảnh" })
  await dialog.getByRole("radio", { name: "1:1" }).click()
  await expect(dialog.getByText("Kích thước sau khi cắt: 600 × 600 px")).toBeVisible()
  await dialog.getByRole("button", { name: "Lưu" }).click()
  await expect(page.getByLabel("Đã chỉnh sửa")).toBeVisible()
  await convertAndGetSize(page)
  await expect(page.getByText("600×600")).toBeVisible()
})

test("rotates 90° and swaps width/height", async ({ page }) => {
  await addFiles(page, "photo.jpg")
  await page.getByRole("button", { name: "Chuyển đổi 1 ảnh" }).click()
  await expect(page.getByText("800×600")).toBeVisible({ timeout: 30_000 })
  await page.getByRole("button", { name: "Sửa photo.jpg" }).click()
  await page.getByRole("button", { name: "Xoay phải 90°" }).click()
  await expect(page.getByText("Kích thước sau khi cắt: 600 × 800 px")).toBeVisible()
  await page.getByRole("button", { name: "Lưu" }).click()
  // Already-converted results refresh on save.
  await expect(page.getByText("600×800")).toBeVisible({ timeout: 30_000 })
})

test("stamps a text watermark in the chosen corner", async ({ page }) => {
  await addFiles(page, "portrait.png") // green→cream gradient, 300×500
  await page.getByRole("radio", { name: "PNG" }).click()
  await page.getByRole("switch", { name: "Watermark" }).click()
  await page.getByRole("textbox", { name: "Nội dung watermark" }).fill("MÈO ĐEN")
  await page.getByRole("radio", { name: "#e53935" }).click()
  await page.getByRole("radio", { name: "Dưới phải" }).click()
  await convertAndGetSize(page)
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Tải về portrait/ }).click()])
  const png = (await downloadBytes(dl)).toString("base64")
  // Count strongly red pixels in the bottom-right vs the top-left quarter.
  const [br, tl] = await page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const x = c.getContext("2d")!
    x.drawImage(bmp, 0, 0)
    const red = (sx: number, sy: number) => {
      const d = x.getImageData(sx, sy, bmp.width / 2, bmp.height / 2).data
      let n = 0
      // #e53935 at 70% over the light gradient lands around (237, 115, 109).
      for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i] - d[i + 1] > 70 && d[i] - d[i + 2] > 70) n++
      return n
    }
    return [red(bmp.width / 2, bmp.height / 2), red(0, 0)]
  }, png)
  expect(br).toBeGreaterThan(200)
  expect(tl).toBe(0)
})

test("renames outputs with a pattern, including in the zip", async ({ page }) => {
  await addFiles(page, "sticker.png", "photo.jpg", "portrait.png")
  await page.getByRole("radio", { name: "WebP" }).click()
  await page.getByRole("switch", { name: "Đổi tên hàng loạt" }).click()
  await page.getByRole("textbox", { name: "Mẫu tên file" }).fill("hoso_{n}")
  await convertAndGetSize(page, 3)
  await expect(page.locator("[data-item-id] p.truncate")).toHaveText(["hoso_1.webp", "hoso_2.webp", "hoso_3.webp"])
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Tải tất cả/ }).click()])
  expect(Object.keys(unzipSync(new Uint8Array(await downloadBytes(dl)))).sort()).toEqual(["hoso_1.webp", "hoso_2.webp", "hoso_3.webp"])
})
