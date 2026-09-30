import type { OutputFormat } from "@/lib/codecs/types"

/** Kept free of codec imports: the main thread uses it too. */
export interface TargetSizeOptions {
  enabled: boolean
  /** Budget in KB. 1 KB = 1000 bytes here, so the file fits whether a site means 1000 or 1024. */
  kb: number
}

/** ICO bundles several icon sizes, so a single size budget doesn't apply to it. */
export const targetApplies = (o: { format: OutputFormat; target: TargetSizeOptions }) =>
  o.target.enabled && o.target.kb > 0 && o.format !== "ico"
