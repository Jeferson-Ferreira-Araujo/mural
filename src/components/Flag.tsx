import type { Locale } from "@/i18n/config";

/**
 * Bandeira do país de cada idioma (SVG simples: os emojis de bandeira não aparecem no Windows).
 * pt = Brasil, en = Estados Unidos, es = Espanha, de = Alemanha, ja = Japão, zh = China, ru = Rússia.
 */
export function Flag({ locale, className = "h-4 w-6" }: { locale: Locale; className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={`shrink-0 rounded-[3px] shadow-[0_0_0_1px_rgba(0,0,0,.18)] ${className}`} aria-hidden>
      {locale === "pt" && (
        <>
          <rect width="24" height="16" fill="#009c3b" />
          <path d="M12 1.8 22 8 12 14.2 2 8Z" fill="#ffdf00" />
          <circle cx="12" cy="8" r="3.5" fill="#002776" />
          <path d="M8.7 7.4c2.2-.6 4.700-.3 6.800 1" stroke="#fff" strokeWidth=".7" fill="none" />
        </>
      )}
      {locale === "en" && (
        <>
          <rect width="24" height="16" fill="#fff" />
          {[0, 2, 4, 6, 8, 10, 12].map((i) => (
            <rect key={i} y={(i * 16) / 13} width="24" height={16 / 13} fill="#b22234" />
          ))}
          <rect width="10.2" height="8.6" fill="#3c3b6e" />
          {[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => <circle key={`${r}${c}`} cx={1.6 + c * 2.4} cy={1.6 + r * 2.7} r=".5" fill="#fff" />))}
        </>
      )}
      {locale === "de" && (
        <>
          <rect width="24" height="16" fill="#000" />
          <rect y="5.33" width="24" height="5.34" fill="#dd0000" />
          <rect y="10.67" width="24" height="5.33" fill="#ffce00" />
        </>
      )}
      {locale === "ja" && (
        <>
          <rect width="24" height="16" fill="#fff" />
          <circle cx="12" cy="8" r="4.8" fill="#bc002d" />
        </>
      )}
      {locale === "zh" && (
        <>
          <rect width="24" height="16" fill="#de2910" />
          <path d="M5 2.2 5.95 5.1 9 5.1 6.55 6.9 7.45 9.8 5 8 2.55 9.8 3.45 6.9 1 5.1 4.05 5.1Z" fill="#ffde00" />
          <circle cx="10.2" cy="2.6" r=".7" fill="#ffde00" />
          <circle cx="12" cy="4.6" r=".7" fill="#ffde00" />
          <circle cx="12" cy="7.2" r=".7" fill="#ffde00" />
          <circle cx="10.2" cy="9" r=".7" fill="#ffde00" />
        </>
      )}
      {locale === "ru" && (
        <>
          <rect width="24" height="16" fill="#fff" />
          <rect y="5.33" width="24" height="5.34" fill="#0039a6" />
          <rect y="10.67" width="24" height="5.33" fill="#d52b1e" />
        </>
      )}
      {locale === "es" && (
        <>
          <rect width="24" height="16" fill="#aa151b" />
          <rect y="4" width="24" height="8" fill="#f1bf00" />
        </>
      )}
    </svg>
  );
}
