import { Check, ChevronsUpDown, ShieldAlert } from "lucide-react"
import { useId, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import {
  BANKS,
  cleanAccount,
  cleanAmount,
  findBank,
  MESSAGE_MAX,
  ACCOUNT_MAX,
  sanitizeMessage,
  type Bank,
  type VietQrFields,
} from "@/lib/qr/vietqr"
import { cn } from "@/lib/utils"

const QUICK_AMOUNTS = ["50000", "100000", "200000", "500000"]

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()

const formatVnd = (digits: string) => (digits ? Number(digits).toLocaleString("vi-VN") : "")

interface BankFormProps {
  fields: VietQrFields
  update: (patch: Partial<VietQrFields>) => void
}

export function BankForm({ fields, update }: BankFormProps) {
  const { t } = useTranslation()
  const accountId = useId()
  const amountId = useId()
  const messageId = useId()
  const bank = findBank(fields.bin)
  const account = cleanAccount(fields.account)
  const amount = cleanAmount(fields.amount)
  const sent = sanitizeMessage(fields.message)
  const ready = !!bank && /^[0-9A-Za-z]{1,19}$/.test(account)

  return (
    <>
      {/* Raised so the open bank list stays above the fields below it. */}
      <div data-field className="relative z-20 space-y-1.5 sm:col-span-2">
        <BankPicker value={fields.bin} onChange={(bin) => update({ bin })} />
      </div>

      <div data-field className="space-y-1.5 sm:col-span-2">
        <label htmlFor={accountId} className="text-xs font-medium text-muted-foreground">
          {t("qr.fields.bank.account")}
        </label>
        <Input
          id={accountId}
          value={fields.account}
          inputMode="numeric"
          autoComplete="off"
          maxLength={ACCOUNT_MAX + 6}
          placeholder="0123 456 789"
          onChange={(e) => update({ account: e.target.value })}
          className="font-mono tracking-wide"
        />
      </div>

      <div data-field className="space-y-1.5 sm:col-span-2">
        <label htmlFor={amountId} className="text-xs font-medium text-muted-foreground">
          {t("qr.fields.bank.amount")}
        </label>
        <div className="relative">
          <Input
            id={amountId}
            value={formatVnd(amount)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            onChange={(e) => update({ amount: cleanAmount(e.target.value) })}
            className="pr-8 font-mono tabular-nums"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">₫</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => update({ amount: a })}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums transition-[background-color,scale] active:scale-95",
                amount === a ? "border-brand bg-brand/15" : "hover:bg-muted",
              )}
            >
              {formatVnd(a)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("qr.fields.bank.amountHint")}</p>
      </div>

      <div data-field className="space-y-1.5 sm:col-span-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor={messageId} className="text-xs font-medium text-muted-foreground">
            {t("qr.fields.bank.message")}
          </label>
          <span className={cn("text-xs tabular-nums", sent.length >= MESSAGE_MAX ? "text-amber-600" : "text-muted-foreground")}>
            {sent.length}/{MESSAGE_MAX}
          </span>
        </div>
        <Input
          id={messageId}
          value={fields.message}
          autoComplete="off"
          maxLength={120}
          placeholder={t("qr.fields.bank.messagePlaceholder")}
          onChange={(e) => update({ message: e.target.value })}
        />
        {fields.message.trim() && sent !== fields.message.trim() && (
          <p className="text-xs text-muted-foreground">
            {t("qr.fields.bank.willSend")}: <span className="font-mono text-foreground">{sent || "—"}</span>
          </p>
        )}
      </div>

      {ready && (
        <div data-field className="space-y-2 rounded-xl border border-brand/40 bg-brand/8 p-3 sm:col-span-2">
          <p className="text-xs font-semibold text-muted-foreground">{t("qr.fields.bank.summary")}</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-muted-foreground">{t("qr.fields.bank.bank")}</dt>
            <dd className="font-semibold">{bank.short}</dd>
            <dt className="text-muted-foreground">{t("qr.fields.bank.account")}</dt>
            <dd className="font-mono font-semibold">{account}</dd>
            <dt className="text-muted-foreground">{t("qr.fields.bank.amountShort")}</dt>
            <dd className="font-semibold tabular-nums">{amount ? `${formatVnd(amount)} ₫` : t("qr.fields.bank.anyAmount")}</dd>
            {sent && (
              <>
                <dt className="text-muted-foreground">{t("qr.fields.bank.messageShort")}</dt>
                <dd className="font-mono break-all">{sent}</dd>
              </>
            )}
          </dl>
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <ShieldAlert className="mt-px size-3.5 shrink-0 text-brand" aria-hidden />
            {t("qr.fields.bank.warning")}
          </p>
        </div>
      )}
    </>
  )
}

/** Searchable bank combobox (matches short name, full name or BIN, ignoring diacritics). */
function BankPicker({ value, onChange }: { value: string; onChange: (bin: string) => void }) {
  const { t } = useTranslation()
  const id = useId()
  const listId = `${id}-list`
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const selected = findBank(value)

  const results = useMemo(() => {
    const q = fold(query.trim())
    if (!q) return BANKS
    return BANKS.filter((b) => fold(b.short).includes(q) || fold(b.name).includes(q) || b.bin.startsWith(q))
  }, [query])

  const choose = (b: Bank) => {
    onChange(b.bin)
    setQuery("")
    setOpen(false)
  }

  const move = (delta: number) => {
    const next = Math.max(0, Math.min(results.length - 1, active + delta))
    setActive(next)
    listRef.current?.children[next]?.scrollIntoView({ block: "nearest" })
  }

  return (
    <div className="relative space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {t("qr.fields.bank.bank")}
      </label>
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${id}-opt-${results[active].bin}` : undefined}
          autoComplete="off"
          value={open ? query : selected ? `${selected.short} — ${selected.name}` : ""}
          placeholder={t("qr.fields.bank.bankPlaceholder")}
          onFocus={() => {
            setOpen(true)
            setActive(0)
          }}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
            setOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault()
              if (!open) setOpen(true)
              else move(1)
            } else if (e.key === "ArrowUp") {
              e.preventDefault()
              move(-1)
            } else if (e.key === "Enter" && open && results[active]) {
              e.preventDefault()
              choose(results[active])
            } else if (e.key === "Escape") {
              setOpen(false)
            }
          }}
          className="truncate pr-8"
        />
        <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      </div>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={t("qr.fields.bank.bank")}
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {results.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{t("qr.fields.bank.noBank")}</li>}
          {results.map((b, i) => (
            <li
              key={b.bin}
              id={`${id}-opt-${b.bin}`}
              role="option"
              aria-selected={b.bin === value}
              // mousedown (not click) so the input's blur doesn't close the list first
              onMouseDown={(e) => {
                e.preventDefault()
                choose(b)
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                i === active && "bg-muted",
              )}
            >
              <Check className={cn("size-3.5 shrink-0 text-brand", b.bin !== value && "invisible")} aria-hidden />
              <span className="font-semibold">{b.short}</span>
              <span className="truncate text-xs text-muted-foreground">{b.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
