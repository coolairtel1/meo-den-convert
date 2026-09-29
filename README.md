# Mèo Đen Convert 🐈‍⬛

Web app chạy 100% trên trình duyệt: đổi định dạng ảnh (kể cả HEIC từ iPhone) và tạo/tuỳ biến mã QR. Không backend, không đăng nhập, ảnh không rời khỏi máy. Cài được như app (PWA) và chạy offline.

## Chạy

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # xuất static vào dist/ (kèm service worker)
npm run preview    # xem bản build
npm test           # unit test (Vitest)
npm run test:e2e   # E2E (Playwright, chạy trên bản build) — lần đầu: npx playwright install chromium
```

## Tính năng

**Chuyển ảnh**
- Đọc: HEIC/HEIF, JPG, PNG, WebP, AVIF, GIF (khung đầu), BMP, TIFF (không nén/LZW/Deflate, nhiều trang), ICO, SVG
- Xuất: JPG, PNG, WebP, AVIF, GIF, BMP, TIFF, ICO (gộp 16–256 px)
- Chất lượng, màu nền cho vùng trong suốt, đổi kích thước (cạnh dài tối đa / %), tải từng file hoặc .zip
- Nhận diện định dạng bằng magic bytes; ảnh Display P3 (iPhone) được chuyển về sRGB
- Chạy trong Web Worker pool, codec WASM tải khi cần

**Mã QR**
- Link, văn bản, WiFi, danh thiếp, email, SMS, điện thoại, vị trí, sự kiện
- Kiểu chấm/góc, gradient, nền trong suốt, logo, 6 mẫu có sẵn + lưu mẫu riêng
- Tự quét thử (jsQR) sau mỗi thay đổi, cảnh báo tương phản
- Xuất PNG/JPG/WebP (512–2048 px) hoặc SVG, chép vào clipboard

**Mèo Đen** — linh vật SVG + GSAP: nhìn theo chuột, vờn len khi đang xử lý, nhảy khi xong, cụp tai khi lỗi, ngủ khi rảnh, giơ bảng khoe QR, có thoại song ngữ.

## Stack

Vite 8 + React 19 + TypeScript · Tailwind v4 + shadcn/ui · GSAP (Flip, MorphSVG, SplitText) · i18next (vi/en) · Zustand · Comlink · jSquash (mozjpeg, oxipng, webp, avif, resize) · libheif-js · utif2 · gifenc · qr-code-styling · jsQR · fflate · vite-plugin-pwa

## Cấu trúc

```
src/
  components/layout/   Header, NavTabs, ThemeToggle, LangToggle, Footer, Backdrop
  components/motion/   FlipText, SegmentedControl, useSlidingPill, useMagnetic
  features/converter/  Dropzone, SettingsPanel, FileList/FileCard, store
  features/qr/         ContentForm, StyleEditor, QrPreview, store
  features/mascot/     BlackCat (animation), CatSvg (artwork), catStore, lines, particles
  features/pwa/        PwaToasts (update/offline), InstallButton
  lib/codecs/          decoder/encoder registry + từng codec, resize, màu P3→sRGB
  lib/engine/          detect (magic bytes), pipeline, worker pool
  lib/qr/              payload builders, style mapping, render, scan check, contrast
  workers/             convert.worker.ts
  i18n/                vi.json, en.json
e2e/                   Playwright specs + fixtures tổng hợp
```

Thêm định dạng: viết `Decoder`/`Encoder` trong `src/lib/codecs/`, đăng ký ở `registry.ts` và khai báo trong `support.ts`.

Tính năng muốn mèo phản ứng chỉ cần gọi `useCatStore.getState().setMood(...)` / `.say(text)` / `.present(imageUrl)`.

Khi chạy `npm run dev`, `window.__meoden` trỏ tới các store để debug (không có trong bản build).
