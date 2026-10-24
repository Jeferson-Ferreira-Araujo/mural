"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, LOCALE_NAMES, type Locale } from "@/i18n/config";
import { Flag } from "./Flag";

/** Seletor de idioma: o escolhido fica no cookie (vale em qualquer página e nas próximas visitas). Pequeno, em botões (sem a lista do sistema). */
export function LanguagePicker({ className = "", tone = "light", variant = "bar", align = "right" }: { className?: string; tone?: "light" | "dark"; /** "icon": só o globo, que abre a lista de idiomas */ variant?: "bar" | "icon"; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | TouchEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("touchstart", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const locale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("common");

  function pick(l: Locale) {
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh(); // a página se refaz já no idioma novo, sem perder a sessão
  }

  const base = tone === "dark" ? "border-white/25 bg-black/30 text-white" : "border-[#d9c9ad] bg-white/70 text-[#4a3826]";
  if (variant === "icon") {
    return (
      <div ref={box} className={className.includes("absolute") ? className : `relative inline-block ${className}`}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${t("language")}: ${LOCALE_NAMES[locale]}`}
          title={t("language")}
          className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-2.5 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-[#d98a2b] ${base}`}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9s1.2-6.4 3.7-9Z" />
          </svg>
          <Flag locale={locale} className="h-4 w-6" />
        </button>
        {open && (
          <ul role="listbox" aria-label={t("language")} className={`absolute top-full z-50 mt-1.5 max-h-[min(70dvh,26rem)] min-w-44 overflow-y-auto overflow-x-hidden rounded-xl border border-[#d9c9ad] bg-[#fbf6ea] py-1 text-sm text-[#2f2218] shadow-[0_0.6rem_1.6rem_rgba(0,0,0,.3)] ${align === "left" ? "left-0" : "right-0"}`}>
            {LOCALES.map((l) => (
              <li key={l} role="option" aria-selected={l === locale}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    pick(l);
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left transition hover:bg-[#efe4cf] ${l === locale ? "font-bold" : ""}`}
                >
                  <span className="flex items-center gap-2.5">
                    <Flag locale={l} className="h-4 w-6" />
                    {LOCALE_NAMES[l]}
                  </span>
                  {l === locale && <span aria-hidden>✓</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
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
          <span className="inline-flex items-center gap-1.5">
            <Flag locale={l} className="h-3 w-[18px]" />
            {l}
          </span>
        </button>
      ))}
    </div>
  );
}
