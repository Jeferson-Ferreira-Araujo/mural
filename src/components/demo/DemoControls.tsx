"use client";

import { BOARD_CAPACITY, PLANS, slotsFor, type PlanId } from "@/lib/plans";
import type { Tone } from "../viewProps";

export type DemoView = "visitor" | "owner";

type Props = {
  tone: Tone;
  plan: PlanId;
  onPlan: (p: PlanId) => void;
  count: number;
  onCount: (n: number) => void;
  view: DemoView;
  onView: (v: DemoView) => void;
  hasSealed: boolean;
  onOpenCapsules: () => void;
  onReset: () => void;
};

function Segmented<T extends string>({ label, value, options, onChange, dark }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; dark: boolean }) {
  return (
    <div>
      <p className={`mb-[0.4em] text-[0.8em] font-semibold ${dark ? "text-white/70" : "text-[#6b5440]"}`}>{label}</p>
      <div role="radiogroup" aria-label={label} className={`grid gap-[0.3em] rounded-[0.8em] border p-[0.25em] ${dark ? "border-white/15 bg-white/5" : "border-[#e1d3ba] bg-white/60"}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={value === o.id}
            onClick={() => onChange(o.id)}
            className={`cursor-pointer rounded-[0.6em] px-[0.5em] py-[0.55em] text-[0.88em] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#d98a2b] ${
              value === o.id ? "bg-[#1f232b] text-white" : dark ? "text-white/80 hover:bg-white/10" : "text-[#4a3826] hover:bg-[#efe4cf]"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Controles da página de demonstração: simulam planos e estados do mural (nada disso é salvo). */
export function DemoControls({ tone, plan, onPlan, count, onCount, view, onView, hasSealed, onOpenCapsules, onReset }: Props) {
  const dark = tone === "dark";
  const max = slotsFor(plan);
  const btn = `cursor-pointer rounded-[0.6em] border px-[0.8em] py-[0.5em] text-[0.85em] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#d98a2b] disabled:cursor-not-allowed disabled:opacity-40 ${dark ? "border-white/20 text-white hover:bg-white/10" : "border-[#d9c9ad] text-[#4a3826] hover:bg-[#efe4cf]"}`;

  return (
    <section aria-label="Controles da demonstração" className={`space-y-[1em] rounded-[1.1em] border p-[1.1em] ${dark ? "border-white/15 bg-[#1c1510]/70 text-[#f6efe2]" : "border-[#d9c9ad] bg-[#fbf6ea]/90 text-[#2f2218]"}`}>
      <div>
        <p className="text-[1em] font-bold">🧪 Demonstração</p>
        <p className={`mt-[0.2em] text-[0.8em] ${dark ? "text-white/65" : "text-[#6b5440]"}`}>Dados de exemplo: nada aqui é salvo nem enviado.</p>
      </div>

      <Segmented
        dark={dark}
        label="Plano do mural"
        value={plan}
        onChange={onPlan}
        options={[
          { id: "free", label: PLANS.free.name },
          { id: "full", label: PLANS.full.name },
        ]}
      />

      <div>
        <p className={`mb-[0.4em] text-[0.8em] font-semibold ${dark ? "text-white/70" : "text-[#6b5440]"}`}>
          Mensagens no mural: {count} de {max} <span className="font-normal">(limite do produto: {BOARD_CAPACITY})</span>
        </p>
        <div className="flex flex-wrap gap-[0.4em]">
          <button type="button" className={btn} onClick={() => onCount(count - 1)} disabled={count <= 0} aria-label="Uma mensagem a menos">
            −
          </button>
          <button type="button" className={btn} onClick={() => onCount(count + 1)} disabled={count >= max} aria-label="Uma mensagem a mais">
            +
          </button>
          <button type="button" className={btn} onClick={() => onCount(0)}>
            Vazio
          </button>
          <button type="button" className={btn} onClick={() => onCount(max - 1)}>
            Quase cheio
          </button>
          <button type="button" className={btn} onClick={() => onCount(max)}>
            Lotado
          </button>
        </div>
      </div>

      <Segmented
        dark={dark}
        label="Quem está olhando?"
        value={view}
        onChange={onView}
        options={[
          { id: "visitor", label: "Visitante" },
          { id: "owner", label: "Dono do mural" },
        ]}
      />

      <div className="flex flex-wrap gap-[0.4em]">
        {hasSealed && (
          <button type="button" className={btn} onClick={onOpenCapsules}>
            🔓 Simular abertura da cápsula
          </button>
        )}
        <button type="button" className={btn} onClick={onReset}>
          Reiniciar
        </button>
      </div>
    </section>
  );
}
