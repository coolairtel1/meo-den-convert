import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import en from "./locales/en.json"
import vi from "./locales/vi.json"

export const LANGUAGES = ["vi", "en"] as const
export type Language = (typeof LANGUAGES)[number]

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { vi: { translation: vi }, en: { translation: en } },
    supportedLngs: LANGUAGES,
    nonExplicitSupportedLngs: true,
    fallbackLng: "vi",
    load: "languageOnly",
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "meoden.lang",
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
  })

const syncHtmlLang = (lng: string) => {
  document.documentElement.lang = lng
}
syncHtmlLang(i18n.resolvedLanguage ?? "vi")
i18n.on("languageChanged", syncHtmlLang)

export default i18n
