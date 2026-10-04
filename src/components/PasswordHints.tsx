"use client";

import { checkPassword, passwordStrength } from "@/lib/password";

const LEVEL = [
  { label: "Muito fraca", color: "#c0392b" },
  { label: "Fraca", color: "#d98a2b" },
  { label: "Boa", color: "#7a9a2e" },
  { label: "Forte", color: "#2f8f4a" },
];

/** Dicas para uma senha segura, com medidor e checklist que se atualiza enquanto a pessoa digita. */
export function PasswordHints({ password, email, username }: { password: string; email: string; username: string }) {
  const checks = checkPassword(password, { email, username });
  const level = passwordStrength(checks);
  const lv = LEVEL[level];
  return (
    <div className="mt-2 space-y-2" aria-live="polite">
      {password && (
        <div className="flex items-center gap-2">
          <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-1.5 rounded-full bg-[#e1d3ba]" style={i <= level ? { background: lv.color } : undefined} />
            ))}
          </div>
          <span className="text-xs font-semibold" style={{ color: lv.color }}>
            {lv.label}
          </span>
        </div>
      )}
      <ul className="space-y-0.5 text-xs">
        {checks.map((c) => (
          <li key={c.id} className={c.ok ? "text-[#2f6b3a]" : c.required ? "text-[#6b5440]" : "text-[#8a7b69]"}>
            <span aria-hidden>{c.ok ? "✓" : "○"}</span> {c.label}
            {!c.required && !c.ok && <span className="sr-only"> (recomendado)</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
