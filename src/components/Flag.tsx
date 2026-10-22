import type { Locale } from "@/i18n/config";

/**
 * Bandeira do país de cada idioma (SVG simples: os emojis de bandeira não aparecem no Windows).
 * pt = Brasil, en = Estados Unidos, es = Espanha, fr = França, it = Itália, de = Alemanha, nl = Países Baixos, pl = Polônia, uk = Ucrânia, ru = Rússia, tr = Turquia,
 * ar = Emirados Árabes (o árabe é de vários países), hi = Índia, id = Indonésia, vi = Vietnã, th = Tailândia, ko = Coreia do Sul, ja = Japão, zh = China.
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
      {locale === "fr" && (
        <>
          <rect width="24" height="16" fill="#fff" />
          <rect width="8" height="16" fill="#0055a4" />
          <rect x="16" width="8" height="16" fill="#ef4135" />
        </>
      )}
      {locale === "it" && (
        <>
          <rect width="24" height="16" fill="#fff" />
          <rect width="8" height="16" fill="#009246" />
          <rect x="16" width="8" height="16" fill="#ce2b37" />
        </>
      )}
      {locale === "nl" && (
        <>
          <rect width="24" height="16" fill="#fff" />
          <rect width="24" height="5.33" fill="#ae1c28" />
          <rect y="10.67" width="24" height="5.33" fill="#21468b" />
        </>
      )}
      {locale === "pl" && (
        <>
          <rect width="24" height="16" fill="#fff" />
          <rect y="8" width="24" height="8" fill="#dc143c" />
        </>
      )}
      {locale === "uk" && (
        <>
          <rect width="24" height="8" fill="#0057b7" />
          <rect y="8" width="24" height="8" fill="#ffd700" />
        </>
      )}
      {locale === "tr" && (
        <>
          <rect width="24" height="16" fill="#e30a17" />
          <circle cx="9" cy="8" r="4" fill="#fff" />
          <circle cx="10.2" cy="8" r="3.2" fill="#e30a17" />
          <path d="m13.5 8 2.2-.7-1.4 1.9v-2.4l1.4 1.9Z" fill="#fff" />
        </>
      )}
      {locale === "ar" && (
        <>
          <rect width="24" height="5.33" fill="#00732f" />
          <rect y="5.33" width="24" height="5.34" fill="#fff" />
          <rect y="10.67" width="24" height="5.33" fill="#000" />
          <rect width="6.5" height="16" fill="#ff0000" />
        </>
      )}
      {locale === "hi" && (
        <>
          <rect width="24" height="5.33" fill="#ff9933" />
          <rect y="5.33" width="24" height="5.34" fill="#fff" />
          <rect y="10.67" width="24" height="5.33" fill="#138808" />
          <circle cx="12" cy="8" r="1.7" fill="none" stroke="#000080" strokeWidth=".5" />
        </>
      )}
      {locale === "id" && (
        <>
          <rect width="24" height="8" fill="#ce1126" />
          <rect y="8" width="24" height="8" fill="#fff" />
        </>
      )}
      {locale === "vi" && (
        <>
          <rect width="24" height="16" fill="#da251d" />
          <path d="m12 3.2 1.4 4.3h4.5l-3.6 2.7 1.4 4.3L12 11.8l-3.7 2.7 1.4-4.3-3.6-2.7h4.5Z" fill="#ffff00" />
        </>
      )}
      {locale === "th" && (
        <>
          <rect width="24" height="16" fill="#a51931" />
          <rect y="2.67" width="24" height="10.66" fill="#f4f5f8" />
          <rect y="5.33" width="24" height="5.34" fill="#2d2a4a" />
        </>
      )}
      {locale === "ko" && (
        <>
          <rect width="24" height="16" fill="#fff" />
          <path d="M8.2 8a3.8 3.8 0 0 1 7.6 0Z" fill="#cd2e3a" />
          <path d="M8.2 8a3.8 3.8 0 0 0 7.6 0Z" fill="#0047a0" />
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
