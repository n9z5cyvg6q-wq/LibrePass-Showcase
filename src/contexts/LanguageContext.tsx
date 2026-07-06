import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type Locale, type TranslationKey, t as translate } from "@/i18n/translations";

interface LanguageContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("librepass-locale") as Locale | null;
    return saved && ["en", "fr", "de", "it"].includes(saved) ? saved : "en";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("librepass-locale", l);
  }, []);

  const t = useCallback((key: TranslationKey) => translate(key, locale), [locale]);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
