"use client";

import { useRef } from "react";
import { inputClass } from "../ui";
import { useLit } from "@/i18n/literal";
import { useTranslations } from "next-intl";

/** DD/MM/AAAA digitado -> AAAA-MM-DD, ou null se a data não existe. */
export function toIso(text: string): string | null {
  const m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d ? `${m[3]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null;
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

/** Data de nascimento em três campos na mesma linha (dia, mês, ano); o foco avança sozinho. `value` fica em dd/mm/aaaa (ou parcial, enquanto digita). */
export function BirthField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tx = useTranslations("components.account.BirthField");
  const tl = useLit();
  const [d = "", m = "", y = ""] = value.split("/");
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const set = (i: 0 | 1 | 2, raw: string) => {
    const len = i === 2 ? 4 : 2;
    const v = raw.replace(/D/g, "").slice(0, len);
    const parts = [d, m, y];
    parts[i] = v;
    onChange(parts.every((p) => !p) ? "" : parts.join("/"));
    if (v.length === len && i < 2) refs[i + 1].current?.focus();
  };
  const back = (i: 1 | 2, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !e.currentTarget.value) refs[i - 1].current?.focus();
  };
  const cls = `${inputClass} text-center`;
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-semibold">{tx("dataDeNascimento")}</legend>
      <div className="grid grid-cols-[1fr_1fr_1.6fr] gap-2">
        <input ref={refs[0]} inputMode="numeric" autoComplete="bday-day" placeholder={tl("Dia")} aria-label={tl("Dia")} maxLength={2} value={d} onChange={(e) => set(0, e.target.value)} className={cls} />
        <input ref={refs[1]} inputMode="numeric" autoComplete="bday-month" placeholder={tl("Mês")} aria-label={tl("Mês")} maxLength={2} value={m} onChange={(e) => set(1, e.target.value)} onKeyDown={(e) => back(1, e)} className={cls} />
        <input ref={refs[2]} inputMode="numeric" autoComplete="bday-year" placeholder={tl("Ano")} aria-label={tl("Ano")} maxLength={4} value={y} onChange={(e) => set(2, e.target.value)} onKeyDown={(e) => back(2, e)} className={cls} />
      </div>
    </fieldset>
  );
}
