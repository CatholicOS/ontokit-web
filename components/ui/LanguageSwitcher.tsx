"use client";

import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";

const LOCALES = ["en", "pt"] as const;
type Locale = (typeof LOCALES)[number];

const LOCALE_COOKIE = "NEXT_LOCALE";

export function LanguageSwitcher() {
  const t = useTranslations("language");
  const router = useRouter();
  const currentLocale = useLocale() as Locale;

  const handleChange = (locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  };

  return (
    <div className="flex items-center gap-1.5" title={t("label")}>
      <Globe className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
      <select
        value={currentLocale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        className="bg-transparent text-sm text-slate-600 dark:text-slate-400 cursor-pointer focus:outline-hidden"
        aria-label={t("label")}
      >
        {LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {t(locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
