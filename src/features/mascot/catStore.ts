import { create } from "zustand"

/**
 * Moods the black cat can show. Features only push moods here;
 * the <BlackCat /> component owns every animation detail.
 * `success`, `error` and `present` are transient: the cat returns to `idle` by itself.
 */
export type CatMood = "idle" | "dragover" | "working" | "success" | "error" | "sleep" | "present"

export const CAT_MOODS: CatMood[] = ["idle", "dragover", "working", "success", "error", "sleep", "present"]

export interface CatMessage {
  id: number
  text: string
}

interface CatState {
  mood: CatMood
  /** 0–1 progress of the current job; speeds up the "working" animation. */
  progress: number
  /** Latest speech-bubble line (a new id re-triggers the bubble even for the same text). */
  message: CatMessage | null
  /** Image the cat holds up on a sign in the `present` mood (e.g. a freshly made QR code). */
  presentImage: string | null
  /** Bumped on every present() so the show replays even while already presenting. */
  presentId: number
  setMood: (mood: CatMood) => void
  setProgress: (progress: number) => void
  say: (text: string) => void
  present: (image: string) => void
}

let nextMessageId = 1

export const useCatStore = create<CatState>((set) => ({
  mood: "idle",
  progress: 0,
  message: null,
  presentImage: null,
  presentId: 0,
  setMood: (mood) => set({ mood }),
  setProgress: (progress) => set({ progress }),
  say: (text) => set({ message: { id: nextMessageId++, text } }),
  present: (image) => set((s) => ({ presentImage: image, presentId: s.presentId + 1, mood: "present" })),
}))
