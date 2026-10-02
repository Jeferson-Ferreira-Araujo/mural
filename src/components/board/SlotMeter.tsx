import { BOARD_CAPACITY, slotsFor, type PlanId } from "@/lib/plans";
import type { Tone } from "../viewProps";
import { PlanBadge } from "./PlanBadge";

/**
 * Contador de espaços do mural: "3 de 5 espaços" + 15 pontinhos
 * (preenchido = ocupado, vazado = livre, apagado = bloqueado no plano atual).
 */
export function SlotMeter({ plan, used, tone = "light", className = "", capacity = BOARD_CAPACITY }: { plan: PlanId; used: number; tone?: Tone; className?: string; capacity?: number }) {
  const available = slotsFor(plan, capacity);
  const dark = tone === "dark";
  const full = used >= available;
  const free = Math.max(available - used, 0);

  return (
    <div
      className={`rounded-[1em] border px-[1em] py-[0.8em] ${dark ? "border-white/15 bg-[#1c1510]/70 text-[#f6efe2] backdrop-blur" : "border-[#d9c9ad] bg-[#fbf6ea]/90 text-[#2f2218]"} ${className}`}
      role="group"
      aria-label={`Espaços do mural: ${used} de ${available} ocupados, de ${capacity} possíveis`}
    >
      <div className="flex items-center justify-between gap-[0.6em]">
        <p className="text-[0.95em] leading-tight">
          <strong className="text-[1.25em] font-bold">{used}</strong>
          <span className={dark ? "text-white/70" : "text-[#6b5440]"}> / {available} espaços</span>
        </p>
        <PlanBadge plan={plan} />
      </div>

      <div className="mt-[0.7em] flex flex-wrap items-center gap-[0.28em]" aria-hidden>
        {Array.from({ length: capacity }, (_, i) => {
          const state = i < used ? "used" : i < available ? "free" : "locked";
          return (
            <span
              key={i}
              className={`size-[0.8em] shrink-0 rounded-full ${
                state === "used"
                  ? plan === "full"
                    ? "bg-[#e39a1c]"
                    : "bg-[#d9a21b]"
                  : state === "free"
                    ? dark
                      ? "border-2 border-[#d9a21b]/80"
                      : "border-2 border-[#c9922a]"
                    : dark
                      ? "bg-white/20"
                      : "bg-[#d9c9ad]"
              }`}
            />
          );
        })}
      </div>

      <p className={`mt-[0.6em] text-[0.78em] leading-snug ${dark ? "text-white/65" : "text-[#6b5440]"}`}>
        {full ? "Mural lotado." : `${free} ${free === 1 ? "espaço livre" : "espaços livres"}.`}{" "}
        {plan === "free" ? `Este PINZ libera ${available} dos ${capacity} espaços.` : `Todos os ${capacity} espaços liberados.`}
      </p>
    </div>
  );
}
