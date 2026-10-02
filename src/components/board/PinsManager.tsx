"use client";

import type { PlanId } from "@/lib/plans";
import { formatInfo, type Message } from "@/lib/types";
import { MessageView } from "../messages/MessageView";

/** Pin como o dono o vê: com conteúdo, estado de aprovação e se está em blur para os visitantes. */
export type OwnerPin = Message & { status: "pending" | "approved"; hiddenFromVisitors: boolean };

type Props = {
  pins: OwnerPin[];
  plan: PlanId;
  /** pin com uma ação em andamento */
  busyId?: string | null;
  onApprove: (id: string, hidden: boolean) => void;
  onReject: (id: string) => void;
  onSetHidden: (id: string, hidden: boolean) => void;
  tone?: "light" | "dark";
};

/**
 * Moderação do dono: aprova ou recusa os pins novos (nada aparece no mural antes disso) e, no FULL,
 * escolhe pin por pin o que fica visível e o que fica em blur para quem visita.
 */
export function PinsManager({ pins, plan, busyId = null, onApprove, onReject, onSetHidden, tone = "light" }: Props) {
  const dark = tone === "dark";
  const pending = pins.filter((p) => p.status === "pending");
  const approved = pins.filter((p) => p.status === "approved");
  const full = plan === "full";
  const btn = `cursor-pointer rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b] ${dark ? "border-white/20 text-white hover:bg-white/10" : "border-[#d9c9ad] text-[#4a3826] hover:bg-[#efe4cf]"}`;
  const primary = "cursor-pointer rounded-lg bg-[#1f232b] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#2f3540] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d98a2b]";
  const muted = dark ? "text-white/65" : "text-[#6b5440]";

  const Row = ({ p, children }: { p: OwnerPin; children: React.ReactNode }) => (
    <li className={`flex gap-3 rounded-xl border p-3 ${dark ? "border-white/15 bg-white/5" : "border-[#e1d3ba] bg-white/70"}`}>
      {/* o pin em miniatura (só para reconhecer; sem interação) */}
      <div className="w-[7.6rem] shrink-0 overflow-hidden pt-2 text-[7px]" aria-hidden>
        <div inert className="pointer-events-none origin-top-left" style={{ width: "14em" }}>
          <MessageView message={{ ...p, pending: false, ownerHidden: false }} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {formatInfo[p.type].label} <span className={`font-normal ${muted}`}>· espaço {(p.slot ?? 0) + 1}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">{children}</div>
      </div>
    </li>
  );

  if (pins.length === 0) return <p className={`text-sm ${muted}`}>Nenhum pin ainda. Quando alguém colar um, ele aparece aqui para você aprovar.</p>;

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <section aria-label="Pins aguardando aprovação">
          <h3 className="text-sm font-bold">
            Aguardando sua aprovação <span className="rounded-full bg-[#d98a2b] px-2 py-0.5 text-xs text-white">{pending.length}</span>
          </h3>
          <p className={`mt-1 text-xs ${muted}`}>Nada aparece no mural antes de você aprovar. Confira se não há informação sigilosa ou ofensiva.</p>
          <ul className="mt-3 space-y-2">
            {pending.map((p) => (
              <Row key={p.id} p={p}>
                <button type="button" className={primary} disabled={busyId === p.id} onClick={() => onApprove(p.id, false)}>
                  Aprovar
                </button>
                <button type="button" className={btn} disabled={busyId === p.id || !full} title={full ? "Aprova e deixa em blur para quem visita" : "Disponível no PINZ FULL"} onClick={() => onApprove(p.id, true)}>
                  {full ? "Aprovar em blur" : "🔒 Aprovar em blur (FULL)"}
                </button>
                <button type="button" className={btn} disabled={busyId === p.id} onClick={() => onReject(p.id)}>
                  Recusar
                </button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      {approved.length > 0 && (
        <section aria-label="Pins no mural">
          <h3 className="text-sm font-bold">No mural ({approved.length})</h3>
          <p className={`mt-1 text-xs ${muted}`}>{full ? "Escolha quais ficam visíveis e quais ficam em blur para quem visita. Os em blur continuam ocupando o espaço, e o conteúdo não é enviado." : "No PINZ FULL você escolhe quais pins ficam em blur para os visitantes."}</p>
          <ul className="mt-3 space-y-2">
            {approved.map((p) => (
              <Row key={p.id} p={p}>
                {full ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!p.hiddenFromVisitors}
                    disabled={busyId === p.id}
                    onClick={() => onSetHidden(p.id, !p.hiddenFromVisitors)}
                    className={btn}
                  >
                    {p.hiddenFromVisitors ? "🔒 Em blur — mostrar" : "👁 Visível — deixar em blur"}
                  </button>
                ) : (
                  <span className={`self-center text-xs ${muted}`}>👁 Visível para os visitantes</span>
                )}
                <button type="button" className={btn} disabled={busyId === p.id} onClick={() => onReject(p.id)}>
                  Remover
                </button>
              </Row>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
