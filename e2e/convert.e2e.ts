import { expect, test } from "@playwright/test"
import { unzipSync } from "fflate"
import { addFiles, downloadBytes } from "./helpers"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

test("converts PNG, JPG, TIFF and SVG to WebP, then zips them", async ({ page }) => {
  await addFiles(page, "sticker.png", "photo.jpg", "scan.tiff", "drawing.svg")
  await page.getByRole("radio", { name: "WebP" }).click()
  await page.getByRole("button", { name: "Chuyển đổi 4 ảnh" }).click()

  await expect(page.getByRole("button", { name: /^Tải về / })).toHaveCount(4, { timeout: 45_000 })
  await expect(page.getByText("4/4 ảnh xong")).toBeVisible()

  const [single] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Tải về sticker.webp" }).click(),
  ])
  expect(single.suggestedFilename()).toBe("sticker.webp")
  const webp = await downloadBytes(single)
  expect(webp.subarray(0, 4).toString("latin1")).toBe("RIFF")
  expect(webp.subarray(8, 12).toString("latin1")).toBe("WEBP")

  const [zipDl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Tải tất cả \(\.zip, 4 ảnh\)/ }).click(),
  ])
  const entries = unzipSync(new Uint8Array(await downloadBytes(zipDl)))
  expect(Object.keys(entries).sort()).toEqual(["drawing.webp", "photo.webp", "scan.webp", "sticker.webp"])
})

test("resizes to a max side and reports the new dimensions", async ({ page }) => {
  await addFiles(page, "photo.jpg")
  await page.getByRole("radio", { name: "PNG" }).click()
  await page.getByRole("radio", { name: "Cạnh dài tối đa" }).click()
  await page.getByLabel("Cạnh dài tối đa (px)").fill("200")
  await page.getByRole("button", { name: "Chuyển đổi 1 ảnh" }).click()
  await expect(page.getByText("200×150")).toBeVisible({ timeout: 30_000 })
})

test("flags files it cannot read without blocking the others", async ({ page }) => {
  await addFiles(page, "mystery.xyz", "sticker.png")
  await expect(page.getByText("Chưa hỗ trợ định dạng ?")).toBeVisible()
  await page.getByRole("button", { name: "Chuyển đổi 1 ảnh" }).click()
  await expect(page.getByRole("button", { name: /^Tải về / })).toHaveCount(1, { timeout: 30_000 })
})

test("builds a multi-size ICO", async ({ page }) => {
  await addFiles(page, "sticker.png")
  await page.getByRole("radio", { name: "ICO" }).click()
  await page.getByRole("button", { name: "Chuyển đổi 1 ảnh" }).click()
  const [dl] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Tải về sticker.ico" }).click({ timeout: 30_000 }),
  ])
  const ico = await downloadBytes(dl)
  expect(ico.readUInt16LE(2)).toBe(1) // icon
  expect(ico.readUInt16LE(4)).toBe(7) // 16…256 px (source is 400 px wide)
})
