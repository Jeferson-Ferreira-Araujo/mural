"use client";

import { useState } from "react";
import { checkPassword, passwordStrength } from "@/lib/password";
import { useLit } from "@/i18n/literal";

const LEVEL = [
  { label: "Senha muito fraca", color: "#c0392b" },
  { label: "Senha fraca", color: "#d98a2b" },
  { label: "Senha boa", color: "#7a9a2e" },
  { label: "Senha forte", color: "#2f8f4a" },
];

/** Medidor em quatro barras, com o nível (escudo + texto) e um botão "Requisitos" que abre o checklist, que se atualiza enquanto a pessoa digita. */
export function PasswordHints({ password, email, username }: { password: string; email: string; username: string }) {
  const tl = useLit();
  const [open, setOpen] = useState(false);
  const checks = checkPassword(password, { email, username });
  const level = passwordStrength(checks, password);
  const lv = LEVEL[level];
  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      <div className="grid grid-cols-4 gap-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-1.5 rounded-full bg-[#e1d3ba]" style={password && i <= level ? { background: lv.color } : undefined} />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        {password ? (
          <span className="flex items-center gap-1.5 font-semibold" style={{ color: lv.color }}>
            <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.3 7.5 9.5 4.4-1.2 7.5-4.9 7.5-9.5V6L12 3Z" />
              {level >= 2 && <path d="m8.8 12 2.4 2.4 4-4.4" />}
            </svg>
            {tl(lv.label)}
          </span>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex cursor-pointer items-center gap-1 text-xs text-[#6b5440] hover:text-[#2a1c12] focus-visible:outline-2 focus-visible:outline-[#d98a2b]">
          {tl("Requisitos")}
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5M12 7.6v.1" />
          </svg>
        </button>
      </div>
      {open && (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
          {checks.map((c) => (
            <li key={c.id} className={c.ok ? "text-[#2f6b3a]" : c.required ? "text-[#6b5440]" : "text-[#8a7b69]"}>
              <span aria-hidden>{c.ok ? "✓" : "○"}</span> {tl(c.label)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
