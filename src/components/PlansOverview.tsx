import type { Account } from "@/lib/account";
import { BOARD_CAPACITY, CREDIT_PACKS, FULL_EXTRAS, NEW_MURAL_COST, PLANS } from "@/lib/plans";
import { formatInfo } from "@/lib/types";
import { PlanBadge } from "./board/PlanBadge";

const names = (formats: readonly (keyof typeof formatInfo)[]) => formats.map((f) => formatInfo[f].label).join(", ");

/**
 * Planos e créditos — apenas INFORMATIVO nesta etapa (sem pagamento, sem botões de compra).
 * Estrutura pronta para, depois, ligar a assinatura FULL e a compra de créditos.
 */
export function PlansOverview({ account }: { account: Account }) {
  const free = PLANS.free;
  const full = PLANS.full;
  const current = account.plan;

  return (
    <section aria-labelledby="plans-title" className="mt-8 border-t border-[#e1d3ba] pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="plans-title" className="font-title text-xl font-semibold">
          Planos e créditos
        </h2>
        <p className="text-sm text-[#6b5440]">
          Seu plano: <PlanBadge plan={current} className="ml-1 align-middle" /> · Créditos: <strong>{account.credits}</strong>
        </p>
      </div>
      <p className="mt-2 text-sm text-[#6b5440]">Quem visita o seu mural nunca paga: os limites abaixo valem só para você, dono do mural.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <article className={`rounded-2xl border p-4 ${current === "free" ? "border-[#b8873b] bg-white/70" : "border-[#e1d3ba] bg-white/50"}`}>
          <header className="flex items-center justify-between gap-2">
            <PlanBadge plan="free" />
            <span className="text-sm font-semibold">{free.price}</span>
          </header>
          <ul className="mt-3 space-y-1.5 text-sm text-[#4a3826]">
            <li>{free.murals} mural</li>
            <li>
              {free.slots} dos {BOARD_CAPACITY} espaços liberados
            </li>
            <li>{names(free.formats)}</li>
          </ul>
        </article>

        <article className={`rounded-2xl border p-4 ${current === "full" ? "border-[#b8873b] bg-white/70" : "border-[#e1d3ba] bg-white/50"}`}>
          <header className="flex items-center justify-between gap-2">
            <PlanBadge plan="full" />
            <span className="text-sm font-semibold">
              {full.price} <span className="font-normal text-[#8a7b69]">· em breve</span>
            </span>
          </header>
          <ul className="mt-3 space-y-1.5 text-sm text-[#4a3826]">
            <li>
              {full.slots} dos {BOARD_CAPACITY} espaços liberados
            </li>
            <li>{names(full.formats)}</li>
            {FULL_EXTRAS.slice(1).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="mt-4 rounded-2xl border border-[#e1d3ba] bg-white/50 p-4">
        <h3 className="text-sm font-bold">Créditos <span className="font-normal text-[#8a7b69]">· em breve</span></h3>
        <ul className="mt-2 flex flex-wrap gap-2">
          {CREDIT_PACKS.map((p) => (
            <li key={p.credits} className="rounded-full border border-[#d9c9ad] bg-[#f3ead8] px-3 py-1 text-sm">
              <strong>{p.credits}</strong> créditos · {p.price}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-[#6b5440]">Um novo mural custa {NEW_MURAL_COST} créditos.</p>
      </div>
    </section>
  );
}
