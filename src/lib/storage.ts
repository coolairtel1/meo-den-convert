import { createJSONStorage } from "zustand/middleware"

/**
 * localStorage for zustand persist that never throws: private mode, blocked storage
 * or a full quota (e.g. big logos) just means the state isn't saved.
 */
export const safeStorage = createJSONStorage(() => ({
  getItem: (key) => {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value)
    } catch {
      // ignore
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore
    }
  },
}))
