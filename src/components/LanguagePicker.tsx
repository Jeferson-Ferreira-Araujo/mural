"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/i18n/config";

/** Seletor de idioma: o escolhido fica no cookie (vale em qualquer página e nas próximas visitas). Pequeno, em botões (sem a lista do sistema). */
export function LanguagePicker({ className = "", tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("common");

  function pick(l: Locale) {
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh(); // a página se refaz já no idioma novo, sem perder a sessão
  }

  const base = tone === "dark" ? "border-white/25 bg-black/30 text-white" : "border-[#d9c9ad] bg-white/70 text-[#4a3826]";
  return (
    <div role="group" aria-label={t("language")} className={`inline-flex items-center gap-1 rounded-xl border p-0.5 text-xs font-semibold ${base} ${className}`}>
      <svg viewBox="0 0 24 24" className="ml-1.5 size-4 shrink-0 opacity-70" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c2.5 2.6 3.7 5.600 3.700 9s-1.200 6.400-3.700 9c-2.500-2.600-3.700-5.600-3.700-9s1.200-6.400 3.700-9Z" />
      </svg>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => pick(l)}
          aria-pressed={l === locale}
          title={LOCALE_NAMES[l]}
          className={`cursor-pointer rounded-lg px-2 py-1 uppercase transition ${l === locale ? (tone === "dark" ? "bg-white/25" : "bg-[#1f232b] text-white") : "opacity-80 hover:opacity-100"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
