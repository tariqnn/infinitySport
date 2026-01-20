"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { normalizeLanguage, tr, type Language, type TranslationKey } from "../../lib/translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (en: string, ar: string) => string;
  tr: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function readCookieLanguage(): Language | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("infinity-language="));
  if (!match) return null;
  const value = match.split("=").slice(1).join("=");
  const normalized = normalizeLanguage(value);
  return normalized;
}

function writeCookieLanguage(lang: Language) {
  // 1 year
  document.cookie = `infinity-language=${lang}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageProvider({
  children,
  initialLanguage = "en",
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguage] = useState<Language>(normalizeLanguage(initialLanguage));

  useEffect(() => {
    const saved = localStorage.getItem("infinity-language") as Language | null;
    if (saved === "en" || saved === "ar") {
      setLanguage(saved);
      return;
    }
    const cookieLang = readCookieLanguage();
    if (cookieLang) setLanguage(cookieLang);
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("infinity-language", lang);
    writeCookieLanguage(lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  };

  useEffect(() => {
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
    writeCookieLanguage(language);
  }, [language]);

  const t = (en: string, ar: string) => {
    return language === "ar" ? ar : en;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, tr: (key) => tr(language, key) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}











