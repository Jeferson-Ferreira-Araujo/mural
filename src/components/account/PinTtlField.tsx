"use client";

import { Field, inputClass } from "../ui";

export type PinTtl = 7 | 15 | 30 | null;

/** Validade dos pins colocados por outras pessoas: passado o prazo, o pin sai do mural e fica guardado em Meus pins, para o dono colocar de volta. */
export function PinTtlField({ value, onChange }: { value: PinTtl; onChange: (v: PinTtl) => void }) {
  return (
    <Field label="Validade dos pins de outras pessoas" hint={<span className="text-xs text-[#8a7b69]">Depois do prazo o pin sai do mural, mas fica guardado em Meus pins.</span>}>
      {(id) => (
        <select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? null : (Number(e.target.value) as 7 | 15 | 30))} className={inputClass}>
          <option value="">Sem prazo</option>
          <option value="7">7 dias</option>
          <option value="15">15 dias</option>
          <option value="30">30 dias</option>
        </select>
      )}
    </Field>
  );
}
