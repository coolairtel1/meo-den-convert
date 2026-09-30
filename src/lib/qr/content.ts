/** Payload builders for the QR content types. Each returns "" while required fields are missing. */

import { buildVietQr, type VietQrFields } from "./vietqr"

export type QrKind = "url" | "bank" | "text" | "wifi" | "vcard" | "email" | "sms" | "phone" | "geo" | "event"

export const QR_KINDS: QrKind[] = ["url", "bank", "text", "wifi", "vcard", "email", "sms", "phone", "geo", "event"]

export type WifiSecurity = "WPA" | "WEP" | "nopass"

export interface QrFields {
  url: { url: string }
  bank: VietQrFields
  text: { text: string }
  wifi: { ssid: string; password: string; security: WifiSecurity; hidden: boolean }
  vcard: {
    firstName: string
    lastName: string
    org: string
    title: string
    phone: string
    email: string
    url: string
    address: string
    note: string
  }
  email: { to: string; subject: string; body: string }
  sms: { phone: string; message: string }
  phone: { phone: string }
  geo: { lat: string; lng: string; label: string }
  event: { title: string; location: string; start: string; end: string; description: string }
}

export const EMPTY_FIELDS: QrFields = {
  url: { url: "" },
  bank: { bin: "", account: "", amount: "", message: "" },
  text: { text: "" },
  wifi: { ssid: "", password: "", security: "WPA", hidden: false },
  vcard: { firstName: "", lastName: "", org: "", title: "", phone: "", email: "", url: "", address: "", note: "" },
  email: { to: "", subject: "", body: "" },
  sms: { phone: "", message: "" },
  phone: { phone: "" },
  geo: { lat: "", lng: "", label: "" },
  event: { title: "", location: "", start: "", end: "", description: "" },
}

/** WIFI: fields escape \ ; , : " with a backslash. */
const escWifi = (s: string) => s.replace(/([\\;,:"])/g, "\\$1")

/** vCard / iCalendar text escaping. */
const escText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1")

const cleanPhone = (s: string) => s.replace(/[^\d+*#]/g, "")

/** "2026-09-29T10:30" (datetime-local) → "20260929T103000" (floating local time). */
export const toICalDate = (local: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local)
  return m ? `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}00` : ""
}

const lines = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join("\n")

export function buildPayload<K extends QrKind>(kind: K, fields: QrFields[K]): string {
  switch (kind) {
    case "url": {
      const url = (fields as QrFields["url"]).url.trim()
      if (!url) return ""
      return /^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`
    }
    case "bank":
      return buildVietQr(fields as QrFields["bank"])

    case "text":
      return (fields as QrFields["text"]).text

    case "wifi": {
      const f = fields as QrFields["wifi"]
      if (!f.ssid) return ""
      const pass = f.security === "nopass" ? "" : `P:${escWifi(f.password)};`
      return `WIFI:T:${f.security};S:${escWifi(f.ssid)};${pass}${f.hidden ? "H:true;" : ""};`
    }

    case "vcard": {
      const f = fields as QrFields["vcard"]
      const full = [f.firstName, f.lastName].map((s) => s.trim()).filter(Boolean).join(" ")
      if (!full && !f.org.trim()) return ""
      return lines(
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escText(f.lastName.trim())};${escText(f.firstName.trim())};;;`,
        `FN:${escText(full || f.org.trim())}`,
        f.org.trim() && `ORG:${escText(f.org.trim())}`,
        f.title.trim() && `TITLE:${escText(f.title.trim())}`,
        cleanPhone(f.phone) && `TEL;TYPE=CELL:${cleanPhone(f.phone)}`,
        f.email.trim() && `EMAIL:${f.email.trim()}`,
        f.url.trim() && `URL:${f.url.trim()}`,
        f.address.trim() && `ADR:;;${escText(f.address.trim())};;;;`,
        f.note.trim() && `NOTE:${escText(f.note.trim())}`,
        "END:VCARD",
      )
    }

    case "email": {
      const f = fields as QrFields["email"]
      const to = f.to.trim()
      if (!to) return ""
      const q = [f.subject && `subject=${encodeURIComponent(f.subject)}`, f.body && `body=${encodeURIComponent(f.body)}`]
        .filter(Boolean)
        .join("&")
      return `mailto:${to}${q ? `?${q}` : ""}`
    }

    case "sms": {
      const f = fields as QrFields["sms"]
      const phone = cleanPhone(f.phone)
      return phone ? `SMSTO:${phone}:${f.message}` : ""
    }

    case "phone": {
      const phone = cleanPhone((fields as QrFields["phone"]).phone)
      return phone ? `tel:${phone}` : ""
    }

    case "geo": {
      const f = fields as QrFields["geo"]
      const lat = Number(f.lat)
      const lng = Number(f.lng)
      if (f.lat.trim() === "" || f.lng.trim() === "" || !Number.isFinite(lat) || !Number.isFinite(lng)) return ""
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return ""
      const label = f.label.trim()
      return `geo:${lat},${lng}${label ? `?q=${lat},${lng}(${encodeURIComponent(label)})` : ""}`
    }

    case "event": {
      const f = fields as QrFields["event"]
      const start = toICalDate(f.start)
      if (!f.title.trim() || !start) return ""
      const end = toICalDate(f.end)
      return lines(
        "BEGIN:VEVENT",
        `SUMMARY:${escText(f.title.trim())}`,
        f.location.trim() && `LOCATION:${escText(f.location.trim())}`,
        `DTSTART:${start}`,
        end && `DTEND:${end}`,
        f.description.trim() && `DESCRIPTION:${escText(f.description.trim())}`,
        "END:VEVENT",
      )
    }
  }
  return ""
}
