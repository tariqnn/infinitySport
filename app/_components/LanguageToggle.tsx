"use client";
import { useLanguage } from "./LanguageProvider";
import { GlobeAltIcon } from "@heroicons/react/24/outline";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 rounded-full border border-brand-lightBlue/30 bg-brand-lightBlue/10 px-3 py-2">
      <GlobeAltIcon className="h-4 w-4 text-brand-blue-primary" />
      <button
        onClick={() => setLanguage("en")}
        className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
          language === "en"
            ? "rounded-full bg-[#003DA5] text-white"
            : "text-gray-600 hover:text-brand-blue-primary"
        }`}
      >
        EN
      </button>
      <span className="h-4 w-px bg-gray-300" />
      <button
        onClick={() => setLanguage("ar")}
        className={`px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${
          language === "ar"
            ? "rounded-full bg-[#003DA5] text-white"
            : "text-gray-600 hover:text-brand-blue-primary"
        }`}
      >
        AR
      </button>
    </div>
  );
}





