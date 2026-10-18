"use client";

import { useEffect, useRef, useState } from "react";
import { Field } from "../ui";

export type PinTtl = 7 | 15 | 30 | null;

const OPTIONS: { value: PinTtl; label: string }[] = [
  { value: null, label: "Sem prazo" },
  { value: 7, label: "7 dias" },
  { value: 15, label: "15 dias" },
  { value: 30, label: "30 dias" },
];

/**
 * Validade dos pins colocados por outras pessoas: passado o prazo, o pin sai do mural e fica guardado em Meus pins > Arquivados, para o dono colocar de volta.
 * As opções abrem no próprio campo (e não na lista do sistema, como o select nativo do celular).
 */
export function PinTtlField({ value, onChange }: { value: PinTtl; onChange: (v: PinTtl) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  // tocar fora ou apertar Esc fecha
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", away, true);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <Field label="Validade dos pins de outras pessoas" hint={<span className="text-xs text-[#8a7b69]">Depois do prazo o pin sai do mural, mas fica guardado em Meus pins.</span>}>
      {(id) => (
        <div ref={box} className="overflow-hidden rounded-xl border border-[#d9c9ad] bg-white">
          <button type="button" id={id} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-3 text-left text-base">
            <span>{current.label}</span>
            <svg viewBox="0 0 24 24" className={`size-5 shrink-0 text-[#8a7b69] transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {open && (
            <ul role="listbox" aria-labelledby={id} className="border-t border-[#ece1c9]">
              {OPTIONS.map((o) => {
                const on = o.value === value;
                return (
                  <li key={String(o.value)} role="option" aria-selected={on}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-3 text-left text-base transition hover:bg-[#fff6dd] ${on ? "bg-[#fff6dd] font-semibold" : ""}`}
                    >
                      {o.label}
                      {on && (
                        <svg viewBox="0 0 24 24" className="size-5 shrink-0 text-[#d9a21b]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </Field>
  );
}
