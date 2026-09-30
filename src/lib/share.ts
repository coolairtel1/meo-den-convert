/** Web Share API (level 2: files) helpers. Mostly phones; some desktop browsers too. */

let supported: boolean | undefined

/** Whether this browser can hand files to the system share sheet. Checked once. */
export function canShareFiles(): boolean {
  if (supported === undefined) {
    try {
      supported =
        typeof navigator.share === "function" &&
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [new File([""], "x.png", { type: "image/png" })] })
    } catch {
      supported = false
    }
  }
  return supported
}

export type ShareOutcome = "shared" | "cancelled" | "needs-gesture" | "failed"

export async function shareFiles(files: File[], title?: string): Promise<ShareOutcome> {
  try {
    if (!navigator.canShare?.({ files })) return "failed"
    await navigator.share({ files, title })
    return "shared"
  } catch (e) {
    const name = (e as DOMException)?.name
    if (name === "AbortError") return "cancelled"
    // Safari only shares straight from a tap; slow work before share() can use the gesture up.
    if (name === "NotAllowedError") return "needs-gesture"
    return "failed"
  }
}

export const blobToFile = (blob: Blob, name: string) => new File([blob], name, { type: blob.type })
