import i18n from "@/i18n"
import { useCatStore } from "@/features/mascot/catStore"
import { shareFiles, type ShareOutcome } from "@/lib/share"

/** Opens the system share sheet and lets Tủm comment on how it went. */
export async function shareWithCat(files: File[], title?: string): Promise<ShareOutcome> {
  const outcome = await shareFiles(files, title)
  const { say } = useCatStore.getState()
  if (outcome === "shared") say(i18n.t("share.sent"))
  else if (outcome === "needs-gesture") say(i18n.t("share.tapAgain"))
  else if (outcome === "failed") say(i18n.t("share.failed"))
  return outcome
}
