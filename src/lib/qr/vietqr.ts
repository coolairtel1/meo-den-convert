/**
 * VietQR (NAPAS 247) bank-transfer payloads, following the EMVCo merchant-presented QR format.
 * Bank list snapshot: api.vietqr.io/v2/banks (bin, short name, full name).
 */
import banks from "./banks.json"

export interface Bank {
  bin: string
  short: string
  name: string
}

export const BANKS: Bank[] = banks

export const findBank = (bin: string) => BANKS.find((b) => b.bin === bin)

export interface VietQrFields {
  bin: string
  account: string
  /** Digits only, VND. */
  amount: string
  message: string
}

const NAPAS_GUID = "A000000727"
const SERVICE_TO_ACCOUNT = "QRIBFTTA"
export const MESSAGE_MAX = 50
export const ACCOUNT_MAX = 19

/** ID + 2-digit length + value. */
const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), as 4 uppercase hex digits. */
export function crc16(text: string): string {
  let crc = 0xffff
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
  }
  return crc.toString(16).toUpperCase().padStart(4, "0")
}

/** Banks reject diacritics and most symbols in the transfer note: "Trả tiền ăn" → "Tra tien an". */
export function sanitizeMessage(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9 .,\-_/]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MESSAGE_MAX)
}

export const cleanAccount = (s: string) => s.replace(/[\s-]/g, "")

/** "0150000" → "150000"; anything that isn't a positive integer → "". */
export const cleanAmount = (s: string) => s.replace(/\D/g, "").replace(/^0+/, "").slice(0, 13)

export function buildVietQr(f: VietQrFields): string {
  const account = cleanAccount(f.account)
  if (!/^\d{6}$/.test(f.bin) || !/^[0-9A-Za-z]{1,19}$/.test(account)) return ""
  const amount = cleanAmount(f.amount)
  const message = sanitizeMessage(f.message)

  const merchant = tlv("00", NAPAS_GUID) + tlv("01", tlv("00", f.bin) + tlv("01", account)) + tlv("02", SERVICE_TO_ACCOUNT)
  const body =
    tlv("00", "01") + // payload format
    tlv("01", amount ? "12" : "11") + // dynamic (fixed amount) vs static
    tlv("38", merchant) +
    tlv("53", "704") + // VND
    (amount ? tlv("54", amount) : "") +
    tlv("58", "VN") +
    (message ? tlv("62", tlv("08", message)) : "") +
    "6304"
  return body + crc16(body)
}
