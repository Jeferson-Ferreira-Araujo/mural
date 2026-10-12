"use client";

import { useRef } from "react";
import { Field, inputClass } from "../ui";

/** DD/MM/AAAA digitado -> AAAA-MM-DD, ou null se a data não existe. */
export function toIso(text: string): string | null {
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Põe as barras sozinho enquanto a pessoa digita só os números. */
function maskDate(raw: string): string {
  const n = raw.replace(/\D/g, "").slice(0, 8);
  return n.length > 4 ? `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}` : n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
}

/** Menor de 13 anos (data AAAA-MM-DD): o Pinz não é para essa idade. */
export function isUnder13(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 13);
  return new Date(y, m - 1, d) > limit;
}

export const BIRTH_FORMAT_HINT = "Digite a data assim: dia/mês/ano, por exemplo 25/12/1990.";
export const BIRTH_ERROR = { too_young: "O Pinz é para maiores de 13 anos.", invalid_birth: "Confira a data de nascimento.", failed: "Não foi possível salvar agora. Tente de novo." } as const;

/** Data de nascimento: dá para digitar (as barras entram sozinhas) ou escolher no calendário. `value` fica em dd/mm/aaaa. */
export function BirthField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const picker = useRef<HTMLInputElement>(null);
  const today = useRef(new Date().toISOString().slice(0, 10));
  return (
    <div>
      <Field label="Data de nascimento">
        {(id) => (
          <div className="relative">
            <input id={id} inputMode="numeric" autoComplete="bday" placeholder="dd/mm/aaaa" maxLength={10} value={value} onChange={(e) => onChange(maskDate(e.target.value))} className={`${inputClass} pr-12`} />
            {/* calendário para quem prefere escolher */}
            <button type="button" aria-label="Escolher a data no calendário" onClick={() => picker.current?.showPicker?.()} className="absolute inset-y-0 right-1 grid w-11 cursor-pointer place-items-center text-[#6b5440] hover:text-[#2f2218]">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3.5" y="5" width="17" height="15" rx="2" />
                <path d="M3.5 10h17M8 3v4M16 3v4" />
              </svg>
            </button>
            <input
              ref={picker}
              type="date"
              tabIndex={-1}
              aria-hidden
              min="1900-01-01"
              max={today.current}
              onChange={(e) => {
                const [y, mo, d] = e.target.value.split("-");
                if (y) onChange(`${d}/${mo}/${y}`);
              }}
              className="pointer-events-none absolute right-0 bottom-0 size-px opacity-0"
            />
          </div>
        )}
      </Field>
      <p className="mt-1 text-xs text-[#6b5440]">Só você vê. Não aparece para ninguém.</p>
    </div>
  );
}
