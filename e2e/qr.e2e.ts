import { expect, test } from "@playwright/test"
import { downloadBytes } from "./helpers"

test.beforeEach(async ({ page }) => {
  await page.goto("/#/qr")
})

test("makes a Vietnamese text QR that passes the built-in scan check and downloads", async ({ page }) => {
  await page.getByRole("radio", { name: "Văn bản" }).click()
  await page.getByRole("textbox", { name: "Nội dung" }).fill("Chào bạn! Mèo Đen Convert 🐈‍⬛")
  await expect(page.getByText("Quét thử OK — nội dung chuẩn")).toBeVisible()

  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Tải về" }).click()])
  expect(dl.suggestedFilename()).toBe("meoden-qr-text.png")
  const png = await downloadBytes(dl)
  expect(png.subarray(1, 4).toString("latin1")).toBe("PNG")
  expect(png.readUInt32BE(16)).toBe(1024) // default export width
})

test("builds a WiFi code and exports SVG", async ({ page }) => {
  await page.getByRole("radio", { name: "WiFi" }).click()
  await page.getByLabel("Tên WiFi (SSID)").fill("Cà Phê Mèo")
  await page.getByLabel("Mật khẩu").fill("meo;meo")
  await expect(page.getByText("Quét thử OK — nội dung chuẩn")).toBeVisible()
  await page.getByRole("radio", { name: "SVG" }).click()
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Tải về" }).click()])
  expect((await downloadBytes(dl)).toString("utf8")).toContain("<svg")
})

test("blocks export when the content is too long for a QR code", async ({ page }) => {
  await page.getByRole("radio", { name: "Văn bản" }).click()
  await page.getByRole("textbox", { name: "Nội dung" }).fill("Mèo ".repeat(900))
  await expect(page.getByText("Nội dung quá dài cho một mã QR — rút gọn bớt nhé.")).toBeVisible()
  await expect(page.getByRole("button", { name: "Tải về" })).toBeDisabled()
})
