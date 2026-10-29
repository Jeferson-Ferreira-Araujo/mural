"use client";

import { useMemo } from "react";
import { inputClass } from "../ui";
import { useLit } from "@/i18n/literal";
import { useTag } from "@/i18n/useTag";
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

/** Data de nascimento em três listas na mesma linha (dia, mês, ano). `value` fica em d/m/aaaa (ou parcial, enquanto escolhe). */
export function BirthField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tx = useTranslations("components.account.BirthField");
  const tl = useLit();
  const tag = useTag();
  const [d = "", m = "", y = ""] = value.split("/");
  const set = (i: 0 | 1 | 2, v: string) => {
    const parts = [d, m, y];
    parts[i] = v;
    onChange(parts.every((p) => !p) ? "" : parts.join("/"));
  };
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(tag, { month: "long" }).format(new Date(2000, i, 1))), [tag]);
  const thisYear = new Date().getFullYear();
  const cls = `${inputClass} cursor-pointer !px-2.5`;
  return (
    <fieldset>
      <legend className="mb-1 block text-sm font-semibold">{tx("dataDeNascimento")}</legend>
      <div className="grid grid-cols-[0.8fr_1.5fr_1fr] gap-2">
        <select autoComplete="bday-day" aria-label={tl("Dia")} value={d} onChange={(e) => set(0, e.target.value)} className={cls}>
          <option value="">{tl("Dia")}</option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i} value={String(i + 1)}>{i + 1}</option>
          ))}
        </select>
        <select autoComplete="bday-month" aria-label={tl("Mês")} value={m} onChange={(e) => set(1, e.target.value)} className={cls}>
          <option value="">{tl("Mês")}</option>
          {months.map((n, i) => (
            <option key={i} value={String(i + 1)}>{n}</option>
          ))}
        </select>
        <select autoComplete="bday-year" aria-label={tl("Ano")} value={y} onChange={(e) => set(2, e.target.value)} className={cls}>
          <option value="">{tl("Ano")}</option>
          {Array.from({ length: thisYear - 1899 }, (_, i) => thisYear - i).map((n) => (
            <option key={n} value={String(n)}>{n}</option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
