import { expect, test, type Page } from "@playwright/test"
import { PDFDocument } from "pdf-lib"
import { addFiles, downloadBytes } from "./helpers"

const names = (page: Page) => page.locator("[data-item-id] p.truncate").allInnerTexts()

async function pageShapes(bytes: Buffer) {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((p) => {
    const { width, height } = p.getSize()
    return width > height ? "landscape" : "portrait"
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("combines images into a PDF in the order set by keyboard reordering", async ({ page }) => {
  await addFiles(page, "sticker.png", "photo.jpg", "portrait.png")
  await expect.poll(() => names(page)).toEqual(["sticker.png", "photo.jpg", "portrait.png"])

  // Move portrait.png to the top with the grip's arrow keys.
  const grip = page.getByRole("button", { name: /^Trang 3\/3/ })
  await grip.focus()
  await page.keyboard.press("ArrowUp")
  await page.keyboard.press("ArrowUp")
  await expect.poll(() => names(page)).toEqual(["portrait.png", "sticker.png", "photo.jpg"])

  await page.getByRole("button", { name: "Gộp thành PDF" }).click()
  await page.getByRole("radio", { name: "Vừa ảnh" }).click()
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Tạo PDF (3 trang)" }).click(),
  ])
  expect(dl.suggestedFilename()).toMatch(/^meoden-\d{12}\.pdf$/)
  const pdf = await downloadBytes(dl)
  expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-")
  expect(await pageShapes(pdf)).toEqual(["portrait", "landscape", "landscape"])
  await expect(page.getByText(/Đã tạo PDF 3 trang/)).toBeVisible()
})

test("reorders pages by dragging the grip", async ({ page }) => {
  await addFiles(page, "sticker.png", "photo.jpg", "portrait.png")
  await expect.poll(() => names(page)).toEqual(["sticker.png", "photo.jpg", "portrait.png"])

  const grip = page.getByRole("button", { name: /^Trang 3\/3/ })
  const first = page.locator("[data-item-id]").first()
  await page.locator("[data-item-id]").last().scrollIntoViewIfNeeded()
  const from = (await grip.boundingBox())!
  const to = (await first.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  // Several steps so Draggable sees a real drag.
  await page.mouse.move(from.x + from.width / 2, to.y + 4, { steps: 12 })
  await page.mouse.up()
  await expect.poll(() => names(page)).toEqual(["portrait.png", "sticker.png", "photo.jpg"])
})

test("A4 pages turn landscape automatically for landscape photos", async ({ page }) => {
  await addFiles(page, "portrait.png", "photo.jpg")
  await page.getByRole("button", { name: "Gộp thành PDF" }).click()
  await page.getByRole("radio", { name: "A4" }).click()
  await page.getByRole("radio", { name: "Tự động" }).click()
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Tạo PDF (2 trang)" }).click()])
  const doc = await PDFDocument.load(await downloadBytes(dl))
  const sizes = doc.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())])
  expect(sizes).toEqual([
    [595, 842],
    [842, 595],
  ])
})
