"use client";

import { inputClass } from "../ui";

export type CapsuleValue = { enabled: boolean; at: string };

const MIN_AHEAD_MS = 10 * 60_000;

const pad = (n: number) => String(n).padStart(2, "0");
/** Valor de <input type="datetime-local"> (hora local). */
export function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A data escolhida precisa estar pelo menos 10 minutos no futuro. */
export function capsuleDateOk(v: CapsuleValue, now = Date.now()) {
  if (!v.enabled) return true;
  const t = new Date(v.at).getTime();
  return Number.isFinite(t) && t >= now + MIN_AHEAD_MS;
}

/**
 * Cápsula PINZ — recurso exclusivo PINZ+. Não é um formato: é uma opção aplicada a qualquer mensagem.
 * Só é renderizado quando o mural é PINZ+ (o visitante nunca vê isso em um mural FREE).
 */
export function CapsuleOption({ value, onChange }: { value: CapsuleValue; onChange: (v: CapsuleValue) => void }) {
  const min = toLocalInput(new Date(Date.now() + MIN_AHEAD_MS));
  const quick = (days: number) => toLocalInput(new Date(Date.now() + days * 86_400_000));
  const ok = capsuleDateOk(value);

  return (
    <fieldset className="rounded-2xl border border-[#e0b04a] bg-[#fff6dc] p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={value.enabled} onChange={(e) => onChange({ ...value, enabled: e.target.checked })} className="mt-1 size-5 shrink-0 cursor-pointer accent-[#b3201a]" />
        <span>
          <span className="block text-[15px] font-bold">🔒 Enviar como Cápsula PINZ</span>
          <span className="block text-sm text-[#6b5440]">A mensagem fica fechada e só abre na data que você escolher.</span>
        </span>
      </label>

      {value.enabled && (
        <div className="mt-3 space-y-2">
          <label htmlFor="capsule-at" className="block text-sm font-semibold">
            Abrir em
          </label>
          <input
            id="capsule-at"
            type="datetime-local"
            value={value.at}
            min={min}
            onChange={(e) => onChange({ ...value, at: e.target.value })}
            aria-invalid={!ok}
            className={inputClass}
          />
          <div className="flex flex-wrap gap-2">
            {([["Em 1 dia", 1], ["Em 1 semana", 7], ["Em 1 mês", 30]] as const).map(([label, d]) => (
              <button key={label} type="button" onClick={() => onChange({ ...value, at: quick(d) })} className="cursor-pointer rounded-lg border border-[#d9c9ad] bg-white/70 px-3 py-1 text-xs font-semibold hover:bg-white">
                {label}
              </button>
            ))}
          </div>
          {!ok && (
            <p role="alert" className="text-sm text-[#a23b2a]">
              Escolha uma data e hora no futuro (pelo menos 10 minutos).
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}
