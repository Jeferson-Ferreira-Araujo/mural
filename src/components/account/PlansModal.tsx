"use client";

import { CREDIT_PACKS, NEW_MURAL_COST, PLANS, type PlanId } from "@/lib/plans";
import { PlanBadge } from "../board/PlanBadge";
import { Carousel } from "./Carousel";
import { Modal } from "./Modal";

const FEATURES: Record<PlanId, { text: string; on: boolean }[]> = {
  free: [
    { text: "1 mural", on: true },
    { text: "Até 15 pins no mural", on: true },
    { text: "Post-it, texto, lista e foto", on: true },
    { text: "Pins decorativos: 1 unidade de cada", on: true },
    { text: "Música, vídeo, voz e local", on: false },
    { text: "Cápsulas PINZ (abrem numa data)", on: false },
    { text: "Deixar pins específicos em blur", on: false },
    { text: "Mensagem personalizada do mural vazio", on: false },
    { text: "Trocar o fundo do mural", on: false },
  ],
  full: [
    { text: "1 mural", on: true },
    { text: "Até 28 pins no mural", on: true },
    { text: "Post-it, texto, lista e foto", on: true },
    { text: "Pins decorativos: quantas unidades quiser", on: true },
    { text: "Música, vídeo, voz e local", on: true },
    { text: "Cápsulas PINZ (abrem numa data)", on: true },
    { text: "Deixar pins específicos em blur", on: true },
    { text: "Mensagem personalizada do mural vazio", on: true },
    { text: "Trocar o fundo do mural", on: true },
  ],
};

function PlanCard({ id, current }: { id: PlanId; current: boolean }) {
  const p = PLANS[id];
  const full = id === "full";
  return (
    <article className={`rounded-2xl border-2 p-5 ${full ? "border-[#e0b04a] bg-[#fff8e4]" : "border-[#d9c9ad] bg-white/70"}`}>
      <header className="flex items-center justify-between gap-2">
        <PlanBadge plan={id} />
        {current && <span className="rounded-full bg-[#1f232b] px-2.5 py-1 text-[11px] font-bold text-white">Seu plano</span>}
      </header>
      <p className="font-title mt-3 text-3xl font-semibold">{p.price}</p>
      <p className="text-sm text-[#6b5440]">{full ? "Cobrança em breve" : "Para sempre"}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {FEATURES[id].map((f) => (
          <li key={f.text} className={`flex items-start gap-2 ${f.on ? "text-[#2f2218]" : "text-[#8a7b69]"}`}>
            <span aria-hidden className={`mt-0.5 font-bold ${f.on ? "text-[#2f6a3c]" : "text-[#b0a08a]"}`}>
              {f.on ? "✓" : "–"}
            </span>
            <span className={f.on ? "" : "line-through decoration-[#c9b68f]"}>{f.text}</span>
            {!f.on && <span className="sr-only"> (não incluso)</span>}
          </li>
        ))}
      </ul>
    </article>
  );
}

/** Planos em carrossel: o que cada um custa e inclui. Só informativo (a cobrança ainda não existe). */
export function PlansModal({ open, onClose, plan, credits }: { open: boolean; onClose: () => void; plan: PlanId; credits: number }) {
  return (
    <Modal open={open} onClose={onClose} title="Planos">
      <p className="mb-4 text-center text-sm text-[#6b5440]">Quem visita o seu mural nunca paga: os limites valem só para você, dono do mural.</p>
      <Carousel label="Planos">
        <PlanCard id="free" current={plan === "free"} />
        <PlanCard id="full" current={plan === "full"} />
      </Carousel>
      <div className="mt-5 rounded-2xl border border-[#e1d3ba] bg-white/50 p-4">
        <h3 className="text-sm font-bold">
          Créditos <span className="font-normal text-[#8a7b69]">· em breve (você tem {credits})</span>
        </h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {CREDIT_PACKS.map((c) => (
            <li key={c.credits} className="rounded-full border border-[#d9c9ad] bg-[#f3ead8] px-3 py-1 text-sm">
              <strong>{c.credits}</strong> créditos · {c.price}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-[#6b5440]">Um novo mural custa {NEW_MURAL_COST} créditos.</p>
      </div>
    </Modal>
  );
}
