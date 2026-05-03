import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import ptBR from "./locales/pt-BR.json";
import es from "./locales/es.json";
import tr from "./locales/tr.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en:     { translation: en },
      "pt-BR": { translation: ptBR },
      es:     { translation: es },
      tr:     { translation: tr },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "pt-BR", "es", "tr"],
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "medconsult_lang",
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
