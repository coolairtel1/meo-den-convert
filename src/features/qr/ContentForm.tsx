import {
  CalendarDays,
  Contact,
  Landmark,
  Link2,
  Loader2,
  LocateFixed,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Type,
  Wifi,
  type LucideIcon,
} from "lucide-react"
import { useId, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { SegmentedControl } from "@/components/motion/SegmentedControl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { QR_KINDS, type QrFields, type QrKind, type WifiSecurity } from "@/lib/qr/content"
import { gsap, prefersReducedMotion } from "@/lib/motion/gsap"
import { cn } from "@/lib/utils"
import { BankForm } from "./BankForm"
import { useQrStore } from "./store"

const ICONS: Record<QrKind, LucideIcon> = {
  url: Link2,
  bank: Landmark,
  text: Type,
  wifi: Wifi,
  vcard: Contact,
  email: Mail,
  sms: MessageSquare,
  phone: Phone,
  geo: MapPin,
  event: CalendarDays,
}

type InputType = "text" | "url" | "email" | "tel" | "number" | "datetime-local"

interface FieldDef {
  key: string
  type?: InputType
  multiline?: boolean
  wide?: boolean
  placeholder?: string
  autoComplete?: string
}

// Plain text/area fields per kind; WiFi security and geo "locate me" get custom controls below.
const FORMS: Record<QrKind, FieldDef[]> = {
  url: [{ key: "url", type: "url", wide: true, placeholder: "https://meoden.app", autoComplete: "url" }],
  bank: [], // custom form: BankForm
  text: [{ key: "text", multiline: true, wide: true }],
  wifi: [{ key: "ssid" }, { key: "password" }],
  vcard: [
    { key: "firstName", autoComplete: "given-name" },
    { key: "lastName", autoComplete: "family-name" },
    { key: "org", autoComplete: "organization" },
    { key: "title", autoComplete: "organization-title" },
    { key: "phone", type: "tel", autoComplete: "tel" },
    { key: "email", type: "email", autoComplete: "email" },
    { key: "url", type: "url", wide: true, autoComplete: "url" },
    { key: "address", wide: true, autoComplete: "street-address" },
    { key: "note", multiline: true, wide: true },
  ],
  email: [
    { key: "to", type: "email", wide: true, autoComplete: "email" },
    { key: "subject", wide: true },
    { key: "body", multiline: true, wide: true },
  ],
  sms: [
    { key: "phone", type: "tel", wide: true, autoComplete: "tel" },
    { key: "message", multiline: true, wide: true },
  ],
  phone: [{ key: "phone", type: "tel", wide: true, autoComplete: "tel", placeholder: "+84 912 345 678" }],
  geo: [
    { key: "lat", type: "number", placeholder: "10.7769" },
    { key: "lng", type: "number", placeholder: "106.7009" },
    { key: "label", wide: true },
  ],
  event: [
    { key: "title", wide: true },
    { key: "location", wide: true },
    { key: "start", type: "datetime-local" },
    { key: "end", type: "datetime-local" },
    { key: "description", multiline: true, wide: true },
  ],
}

export function ContentForm() {
  const { t } = useTranslation()
  const kind = useQrStore((s) => s.kind)
  const setKind = useQrStore((s) => s.setKind)
  const fields = useQrStore((s) => s.fields)
  const setField = useQrStore((s) => s.setField)
  const formRef = useRef<HTMLDivElement>(null)
  const baseId = useId()

  const pickKind = (k: QrKind, el: HTMLElement) => {
    if (k === kind) return
    setKind(k)
    if (prefersReducedMotion()) return
    gsap.fromTo(el.querySelector("svg"), { rotation: -20, scale: 0.6 }, { rotation: 0, scale: 1, duration: 0.5, ease: "back.out(3)" })
    requestAnimationFrame(() => {
      const items = formRef.current?.querySelectorAll("[data-field]")
      // clearProps: a leftover transform makes each field its own stacking context, which would
      // paint later fields over dropdowns (e.g. the bank picker's list).
      if (items?.length)
        gsap.from(items, { y: 10, opacity: 0, duration: 0.3, stagger: 0.035, ease: "power2.out", clearProps: "transform,opacity" })
    })
  }

  const current = fields[kind] as Record<string, string | boolean>
  const update = (patch: Record<string, unknown>) => setField(kind, patch as Partial<QrFields[typeof kind]>)

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label={t("qr.sections.content")} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {QR_KINDS.map((k) => {
          const Icon = ICONS[k]
          const active = k === kind
          return (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={(e) => pickKind(k, e.currentTarget)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-[background-color,color,border-color,scale] active:scale-95",
                active
                  ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                  : "bg-card text-muted-foreground hover:border-ring/40 hover:text-foreground",
              )}
            >
              <Icon className="size-4.5" aria-hidden />
              {t(`qr.kinds.${k}`)}
            </button>
          )
        })}
      </div>

      <div ref={formRef} className="grid gap-3 sm:grid-cols-2">
        {FORMS[kind].map((f) => {
          const id = `${baseId}-${f.key}`
          const value = String(current[f.key] ?? "")
          const common = {
            id,
            value,
            placeholder: f.placeholder ?? t(`qr.fields.${kind}.${f.key}Placeholder`, { defaultValue: "" }),
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update({ [f.key]: e.target.value }),
          }
          return (
            <div key={f.key} data-field className={cn("space-y-1.5", f.wide && "sm:col-span-2")}>
              <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
                {t(`qr.fields.${kind}.${f.key}`)}
              </label>
              {f.multiline ? (
                <Textarea {...common} rows={kind === "text" ? 4 : 3} />
              ) : (
                <Input
                  {...common}
                  type={f.type ?? "text"}
                  autoComplete={f.autoComplete ?? "off"}
                  step={f.type === "number" ? "any" : undefined}
                  inputMode={f.type === "number" ? "decimal" : undefined}
                />
              )}
            </div>
          )
        })}

        {kind === "bank" && <BankForm fields={fields.bank} update={(p) => setField("bank", p)} />}
        {kind === "wifi" && <WifiExtras fields={fields.wifi} update={update} />}
        {kind === "geo" && <LocateButton update={update} />}
      </div>
    </div>
  )
}

function WifiExtras({ fields, update }: { fields: QrFields["wifi"]; update: (p: Record<string, unknown>) => void }) {
  const { t } = useTranslation()
  const hiddenId = useId()
  return (
    <>
      <div data-field className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">{t("qr.fields.wifi.security")}</p>
        <SegmentedControl<WifiSecurity>
          label={t("qr.fields.wifi.security")}
          value={fields.security}
          onChange={(security) => update({ security })}
          options={[
            { value: "WPA", label: "WPA/WPA2" },
            { value: "WEP", label: "WEP" },
            { value: "nopass", label: t("qr.fields.wifi.none") },
          ]}
        />
      </div>
      <div data-field className="flex items-center gap-3 self-end pb-1.5">
        <Switch id={hiddenId} checked={fields.hidden} onCheckedChange={(hidden) => update({ hidden })} />
        <label htmlFor={hiddenId} className="text-sm">
          {t("qr.fields.wifi.hidden")}
        </label>
      </div>
    </>
  )
}

function LocateButton({ update }: { update: (p: Record<string, unknown>) => void }) {
  const { t } = useTranslation()
  const [state, setState] = useState<"idle" | "busy" | "error">("idle")
  if (!("geolocation" in navigator)) return null
  return (
    <div data-field className="sm:col-span-2">
      <Button
        type="button"
        variant="outline"
        disabled={state === "busy"}
        onClick={() => {
          setState("busy")
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              update({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })
              setState("idle")
            },
            () => setState("error"),
            { enableHighAccuracy: true, timeout: 10_000 },
          )
        }}
      >
        {state === "busy" ? <Loader2 className="animate-spin" aria-hidden /> : <LocateFixed aria-hidden />}
        {t("qr.fields.geo.locate")}
      </Button>
      {state === "error" && <p className="mt-1.5 text-xs text-destructive">{t("qr.fields.geo.locateError")}</p>}
    </div>
  )
}
