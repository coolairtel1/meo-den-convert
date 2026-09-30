import { expect, test } from "@playwright/test"
import { addFiles, downloadBytes } from "./helpers"

// Uses the bundled "Fast" model (U²-Netp), so no network is needed.
test("removes the background on-device (fast model)", async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto("/")
  expect(await page.evaluate(() => self.crossOriginIsolated)).toBe(true)
  await addFiles(page, "subject.png") // red disc on a flat light-grey background
  await page.getByRole("radio", { name: "PNG" }).click()
  await page.getByRole("switch", { name: "Xoá nền bằng AI" }).click()
  await page.getByRole("radio", { name: "Nhanh" }).click()
  await page.getByRole("button", { name: "Chuyển đổi 1 ảnh" }).click()
  await expect(page.getByText(/U²-Netp đã sẵn sàng/)).toBeVisible({ timeout: 60_000 })

  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Tải về subject/ }).click()])
  const png = (await downloadBytes(dl)).toString("base64")
  const alpha = await page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const x = c.getContext("2d")!
    x.drawImage(bmp, 0, 0)
    const a = (px: number, py: number) => x.getImageData(px, py, 1, 1).data[3]
    return { size: [bmp.width, bmp.height], corners: [a(5, 5), a(394, 5), a(5, 294), a(394, 294)], centre: a(200, 150) }
  }, png)
  expect(alpha.size).toEqual([400, 300])
  expect(Math.max(...alpha.corners)).toBeLessThan(40)
  expect(alpha.centre).toBeGreaterThan(200)
})

test("fills the removed background when the format has no transparency", async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto("/")
  await addFiles(page, "subject.png")
  await page.getByRole("radio", { name: "JPG" }).click()
  await page.getByRole("switch", { name: "Xoá nền bằng AI" }).click()
  await page.getByRole("radio", { name: "Nhanh" }).click()
  await expect(page.getByText(/không có nền trong suốt/)).toBeVisible()
  await page.getByRole("button", { name: "#000000" }).click()
  await page.getByRole("button", { name: "Chuyển đổi 1 ảnh" }).click()
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /^Tải về subject/ }).click({ timeout: 60_000 }),
  ])
  const jpg = (await downloadBytes(dl)).toString("base64")
  const corner = await page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/jpeg;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const x = c.getContext("2d")!
    x.drawImage(bmp, 0, 0)
    return Array.from(x.getImageData(5, 5, 1, 1).data.slice(0, 3))
  }, jpg)
  // Light-grey background became the chosen black.
  expect(Math.max(...corner)).toBeLessThan(40)
})
