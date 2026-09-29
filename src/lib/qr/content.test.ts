import { describe, expect, it } from "vitest"
import { buildPayload, EMPTY_FIELDS, toICalDate } from "./content"

describe("buildPayload", () => {
  it("adds https:// to bare URLs but keeps explicit schemes", () => {
    expect(buildPayload("url", { url: "meoden.app/x" })).toBe("https://meoden.app/x")
    expect(buildPayload("url", { url: "http://a.b" })).toBe("http://a.b")
    expect(buildPayload("url", { url: "  " })).toBe("")
  })

  it("builds WiFi with escaping, hidden flag and open networks", () => {
    expect(buildPayload("wifi", { ssid: 'Cafe;Mèo', password: 'p:a"ss', security: "WPA", hidden: true })).toBe(
      'WIFI:T:WPA;S:Cafe\\;Mèo;P:p\\:a\\"ss;H:true;;',
    )
    expect(buildPayload("wifi", { ssid: "Free", password: "ignored", security: "nopass", hidden: false })).toBe(
      "WIFI:T:nopass;S:Free;;",
    )
    expect(buildPayload("wifi", { ssid: "a\\b", password: "c\\d", security: "WEP", hidden: false })).toBe(
      "WIFI:T:WEP;S:a\\\\b;P:c\\\\d;;",
    )
    expect(buildPayload("wifi", EMPTY_FIELDS.wifi)).toBe("")
  })

  it("builds a vCard with escaped fields and skips empty ones", () => {
    const v = buildPayload("vcard", {
      ...EMPTY_FIELDS.vcard,
      firstName: "Đen",
      lastName: "Mèo",
      org: "Mèo, Inc.",
      phone: "+84 912 345 678",
    })
    expect(v).toBe(
      ["BEGIN:VCARD", "VERSION:3.0", "N:Mèo;Đen;;;", "FN:Đen Mèo", "ORG:Mèo\\, Inc.", "TEL;TYPE=CELL:+84912345678", "END:VCARD"].join(
        "\n",
      ),
    )
    expect(buildPayload("vcard", EMPTY_FIELDS.vcard)).toBe("")
  })

  it("builds mailto with encoded params", () => {
    expect(buildPayload("email", { to: "a@b.c", subject: "Chào bạn", body: "" })).toBe(
      "mailto:a@b.c?subject=Ch%C3%A0o%20b%E1%BA%A1n",
    )
    expect(buildPayload("email", { to: "a@b.c", subject: "", body: "" })).toBe("mailto:a@b.c")
  })

  it("builds SMS and phone payloads with cleaned numbers", () => {
    expect(buildPayload("sms", { phone: "0912 345 678", message: "hi" })).toBe("SMSTO:0912345678:hi")
    expect(buildPayload("phone", { phone: "(028) 1234-5678" })).toBe("tel:02812345678")
    expect(buildPayload("phone", { phone: "abc" })).toBe("")
  })

  it("validates geo coordinates", () => {
    expect(buildPayload("geo", { lat: "10.7769", lng: "106.7009", label: "" })).toBe("geo:10.7769,106.7009")
    expect(buildPayload("geo", { lat: "10.7769", lng: "106.7009", label: "Chợ Bến Thành" })).toBe(
      "geo:10.7769,106.7009?q=10.7769,106.7009(Ch%E1%BB%A3%20B%E1%BA%BFn%20Th%C3%A0nh)",
    )
    expect(buildPayload("geo", { lat: "91", lng: "0", label: "" })).toBe("")
    expect(buildPayload("geo", { lat: "", lng: "1", label: "" })).toBe("")
  })

  it("builds a VEVENT", () => {
    expect(
      buildPayload("event", {
        title: "Họp; mèo",
        location: "",
        start: "2026-10-01T09:30",
        end: "2026-10-01T10:00",
        description: "",
      }),
    ).toBe(["BEGIN:VEVENT", "SUMMARY:Họp\\; mèo", "DTSTART:20261001T093000", "DTEND:20261001T100000", "END:VEVENT"].join("\n"))
    expect(buildPayload("event", { ...EMPTY_FIELDS.event, title: "x" })).toBe("")
  })
})

describe("toICalDate", () => {
  it("converts datetime-local values", () => {
    expect(toICalDate("2026-09-29T07:05")).toBe("20260929T070500")
    expect(toICalDate("")).toBe("")
  })
})
