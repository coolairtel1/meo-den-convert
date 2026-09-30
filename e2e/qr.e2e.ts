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

test("makes a VietQR bank-transfer code identical to the official generator", async ({ page }) => {
  await page.getByRole("radio", { name: "Chuyển khoản" }).click()
  const bank = page.getByRole("combobox", { name: "Ngân hàng" })
  await bank.fill("vietcom")
  await page.getByRole("option", { name: /Vietcombank/ }).click()
  await expect(bank).toHaveValue(/^Vietcombank — /)
  await page.getByLabel("Số tài khoản").fill("1234 567 890")
  await page.getByLabel("Số tiền (tuỳ chọn)").fill("150000")
  await expect(page.getByLabel("Số tiền (tuỳ chọn)")).toHaveValue("150.000")
  await page.getByLabel("Nội dung chuyển khoản").fill("Trả tiền ăn trưa")
  await expect(page.getByText("Tra tien an trua").first()).toBeVisible()
  await expect(page.getByText("150.000 ₫")).toBeVisible()
  await expect(page.getByText("Quét thử OK — nội dung chuẩn")).toBeVisible()

  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Tải về" }).click()])
  const png = (await downloadBytes(dl)).toString("base64")
  await page.addScriptTag({ path: "node_modules/jsqr/dist/jsQR.js" })
  const decoded = await page.evaluate(async (b64) => {
    const bmp = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(bmp.width, bmp.height)
    const x = c.getContext("2d")!
    x.fillStyle = "#fff"
    x.fillRect(0, 0, bmp.width, bmp.height)
    x.drawImage(bmp, 0, 0)
    const d = x.getImageData(0, 0, bmp.width, bmp.height)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).jsQR(d.data, d.width, d.height)?.data
  }, png)
  // Decoded from img.vietqr.io for the same account/amount/note.
  expect(decoded).toBe(
    "00020101021238540010A00000072701240006970436011012345678900208QRIBFTTA530370454061500005802VN62200816Tra tien an trua630471F1",
  )
})
