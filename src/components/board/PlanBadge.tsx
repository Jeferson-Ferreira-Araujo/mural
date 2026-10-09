import { PLANS, type PlanId } from "@/lib/plans";

/** Selo do plano do mural: FREE discreto, PINZ+ dourado. */
export function PlanBadge({ plan, className = "" }: { plan: PlanId; className?: string }) {
  const full = plan === "full";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide whitespace-nowrap uppercase ${
        full
          ? "bg-gradient-to-r from-[#f2c230] to-[#e39a1c] text-[#3a2300] shadow-[0_0.15rem_0.5rem_rgba(150,90,0,.4)]"
          : "border border-[#c9b68f] bg-[#f3ead8] text-[#6b5440]"
      } ${className}`}
    >
      {full && <span aria-hidden>★</span>}
      {PLANS[plan].name}
    </span>
  );
}
